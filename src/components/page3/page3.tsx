/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page3.css';

import { ethers } from 'ethers';
import React, { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';
import { ASSETS_STATE, CONNECTION_CHANGED } from '../../stores/constants';
import {
  AssetStateresult,
  ConnectResult,
  SFT,
  SFTCHILD,
  StoreClasses,
} from '../../stores/store';
import { CARDS } from '../types/cards';
import { CardBox } from './cardbox';

type PAGE3_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
  display: 'shop' | 'auction' | 'my';
};

type QueryType = 'wolves' | 'bois' | 'myPack';

type PAGE3_STATE = {
  contentLoaded: boolean;
  type: QueryType;
  levelId: number;
  isWalletConnected: boolean;
};

const INITIAL_PAGE3_STATE: PAGE3_STATE = {
  contentLoaded: false,
  type: 'wolves',
  levelId: -1,
  isWalletConnected: false,
};

class Page3 extends Component<PAGE3_PROPS, PAGE3_STATE> {
  content: CARDS = {
    levelNames: [],
    cards: [],
  };
  levelDescription = '';
  tokenIds: SFT[] = [];
  walletTokenIds: SFTCHILD[] = [];
  levelFilter = 0;
  nextLevel = -1;
  prevLevel = -1;
  scrollOnUpdate = true;
  mainRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: PAGE3_PROPS) {
    super(props);
    this.state = INITIAL_PAGE3_STATE;
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onAssetsState = this.onAssetsState.bind(this);
  }

  componentDidMount(): void {
    this._checkContent();
    this.setState({ isWalletConnected: StoreClasses.store.isConnected() });
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.on(ASSETS_STATE, this.onAssetsState);
  }

  componentDidUpdate(): void {
    this._checkContent();
    if (this.scrollOnUpdate) {
      this.mainRef.current?.scrollIntoView();
      this.scrollOnUpdate = false;
    }
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(ASSETS_STATE, this.onAssetsState);
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') {
      this.setState({ isWalletConnected: params.address !== '' });
    }
  }

  onAssetsState(status: AssetStateresult): void {
    this.setState({ contentLoaded: false });
    if (status.status === 'loaded') this._checkContent();
  }

  _checkContent(): void {
    const { display, history, location } = this.props;
    const { type } = this.state;
    let { contentLoaded } = this.state;
    let { levelId } = this.state;

    const query = new URLSearchParams(location.search);
    const newType = query.get('type') as QueryType;

    if (newType !== type) {
      this.setState({ type: newType });
      levelId = -1;
      contentLoaded = false;
    }
    if (!contentLoaded) {
      this.content = StoreClasses.store.getAssets().cards;
    }
    if (this.content.levelNames.length > 0) {
      if (!contentLoaded) {
        this.setState({ contentLoaded: true, levelId: -1 });
        return;
      }
      const newLevelId = parseInt(query.get('levelId') || '0') | 0;
      if (levelId !== newLevelId) {
        // retrieve level description
        // reset level filter
        this.levelFilter = 0;
        if (display !== 'my') {
          this.content.cards.forEach((level) => {
            if (level.type === newType && level.cards.length > 0)
              this.levelFilter |= 1 << level.levelId;
          });
          const idx = this.content.cards.findIndex(
            (level) => level.levelId === newLevelId && level.type === newType
          );
          if (idx >= 0) {
            this.levelDescription = this.content.cards[idx].header.replace(
              '{Q}',
              this.content.cards[idx].quantity.toString()
            );
            this.tokenIds = this.content.cards[idx].cards.map(
              (card, cardId) => {
                return {
                  tokenId: ethers.BigNumber.from(
                    (this.content.cards[idx].chainRef << 24) |
                      (card.chainRef << 16)
                  ),
                  levelId: idx,
                  cardId,
                  isBaseCard: true,
                  isStockCard: true,
                  isWallet: false,
                  locked: false,
                  rewardRate: 0,
                  mintTimestamp: 0,
                  cfolioItems: [],
                };
              }
            );
          }
          this.walletTokenIds = [];
        } else {
          // get our base tokenIds
          this.tokenIds = StoreClasses.store
            .getAssets()
            .userSFT.filter((n) => n.isStockCard);
          // get cfolioItems from wallet
          this.walletTokenIds =
            StoreClasses.store.getAssets().userSFT.find((n) => n.isWallet)
              ?.cfolioItems ?? [];
          // collect tokenId bitmask
          this.tokenIds.forEach(
            (n) =>
              (this.levelFilter |= 1 << this.content.cards[n.levelId].levelId)
          );
          this.levelDescription =
            (this.levelFilter & (1 << newLevelId)) === 0
              ? ''
              : `RARITY: 1/${this.content.cards[newLevelId].quantity} - ${this.content.cards[newLevelId].profitReward}% PROFIT SHARE`;
          if (this.walletTokenIds.length > 0) {
            this.levelFilter |= 1 << 4;
          }
        }

        if (this.levelFilter && (this.levelFilter & (1 << newLevelId)) === 0) {
          let defaultLevelId = 3;
          if (this.levelFilter & 1) defaultLevelId = 0;
          else if (this.levelFilter & 2) defaultLevelId = 1;
          else if (this.levelFilter & 4) defaultLevelId = 2;
          query.set('levelId', defaultLevelId.toString());
          history.replace(location.pathname + '?' + query.toString());
        }
        this.prevLevel = -1;
        this.nextLevel = -1;
        // check for next level
        const levelLength = this.content.levelNames.length;
        for (
          let i = newLevelId + 1;
          this.nextLevel < 0 && i < levelLength;
          ++i
        ) {
          if (this.levelFilter & (1 << i)) this.nextLevel = i;
        }

        // check for next level
        for (let i = newLevelId - 1; this.prevLevel < 0 && i >= 0; --i) {
          if (this.levelFilter & (1 << i)) this.prevLevel = i;
        }
        this.setState({ levelId: newLevelId });
      }
    }
    if (query.get('scroll') === 'false') this.scrollOnUpdate = false;
  }

  render(): JSX.Element {
    const { display, t } = this.props;
    const { contentLoaded, levelId, type } = this.state;
    const levelPosition = levelId;
    const hasMoreLevels = this.nextLevel >= 0;

    const startPosition = 0;

    return (
      <div
        ref={this.mainRef}
        className={'wolves-container wolves-header bg-' + type}
      >
        {!this.state.isWalletConnected && display === 'my' ? (
          <span className="font-32 tk-vincente-lightbold wallet-warning">
            Wallet is not connected.
            <br /> Please connect your wallet.
          </span>
        ) : (
          <>
            <img
              src={Logo}
              alt="WOWS"
              width="50px"
              height="50px"
              className={`${type === 'bois' ? 'rotate' : ''}`}
            />
            <h2 className="tk-vincente-lightbold no-margin">
              {t('page3.welcome-' + type)}
            </h2>
            <h4 className="tk-grotesk-lightbold">
              {t('page3.newCrypto-' + type).replace(
                '{Q}',
                (levelId + 1).toString()
              )}
            </h4>
            <span className="line-container">
              <span id="left" className="dot" />
              <span className="line" />
              <span id="right" className="dot" />
            </span>
            <div id="page3-section-header">
              <span className="tk-vincente-lightbold font-24 single-line wolves-color-orange fixed-pos">
                &lt;
                {levelPosition <= startPosition ? (
                  <Link to="/">{t('page.home')}</Link>
                ) : (
                  <Link to={'?type=' + type + '&levelId=' + this.prevLevel}>
                    {t('page.previous')}
                  </Link>
                )}
              </span>
              <span className="page3-section-container tk-vincente-lightbold">
                {contentLoaded &&
                  this.content.levelNames.map((name: string, index: number) => {
                    if ((1 << index) & this.levelFilter) {
                      return levelId === index ? (
                        <span
                          key={`sec_` + index}
                          className="page3-section page3-section-selected"
                        >
                          {name}
                          <div id="triangle-down" />
                        </span>
                      ) : (
                        <Link
                          key={'sec_' + index}
                          className="page3-section"
                          to={'?type=' + type + '&levelId=' + index}
                        >
                          {name}
                        </Link>
                      );
                    } else return null;
                  })}
              </span>
              <span className="tk-vincente-lightbold font-24 single-line wolves-color-orange">
                {hasMoreLevels ? (
                  <Link to={'?type=' + type + '&levelId=' + this.nextLevel}>
                    {t('page.nextLevel')}
                  </Link>
                ) : (
                  t('page.nextLevel')
                )}
                &gt;
              </span>
            </div>
            {contentLoaded && (
              <h4 className="tk-grotesk-lightbold">{this.levelDescription}</h4>
            )}
            {contentLoaded && (
              <div id="page3-content-container">
                {this.tokenIds.map((id) => {
                  const level = this.content.cards[id.levelId];
                  return (
                    level.levelId === levelId &&
                    (display === 'my' || type === level.type) && (
                      <CardBox
                        key={'card_' + id.tokenId.mask(32).toString()}
                        type={level.type}
                        levelId={levelId}
                        content={level.cards[id.cardId]}
                        quantity={level.quantity}
                        price={level.price}
                        tokenId={display === 'my' ? id.tokenId : undefined}
                        t={t}
                      />
                    )
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}
export default withTranslation()(Page3);
