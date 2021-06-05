/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page3.css';

import React, { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/wolves-token_99.png';
import {
  ASSETS_STATE,
  CONNECTION_CHANGED,
  SFT_REWARD,
} from '../../stores/constants';
import {
  AssetStateresult,
  BIGNUMBER_MAX,
  ConnectResult,
  Payload,
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
  contentChanged: boolean;
  type: QueryType;
  levelId: number;
  isWalletConnected: boolean;
};

const INITIAL_PAGE3_STATE: PAGE3_STATE = {
  contentLoaded: false,
  contentChanged: false,
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

  progessStart: Date = new Date();
  progressRefs: React.RefObject<HTMLSpanElement>[] = [];
  progressInterval?: number;

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
    this._updateRewards();
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
    window.clearInterval(this.progressInterval);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') {
      this.setState({ isWalletConnected: params.address !== '' });
    }
  }

  onAssetsState(status: AssetStateresult): void {
    if (!['error', 'cfolio_amount'].includes(status.status)) {
      this.setState({ contentChanged: true });
      if (status.status === 'tokens') {
        this.setState({ levelId: -1 });
        this._updateRewards();
      }
    }
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
    if (this.state.contentChanged) this.setState({ contentChanged: false });

    if (this.content.levelNames.length > 0) {
      if (!contentLoaded) {
        this.setState({ contentLoaded: true, levelId: -1 });
        return;
      }
      const newLevelId = parseInt(query.get('levelId') || '0') | 0;
      if (levelId !== newLevelId) {
        window.clearInterval(this.progressInterval);
        this.progressInterval = undefined;
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
                  tokenId: BIGNUMBER_MAX,
                  levelId: idx,
                  cardId,
                  isBaseCard: true,
                  isStockCard: true,
                  isWallet: false,
                  locked: false,
                  rewardRate: 0,
                  rewardShare: 0,
                  rewardEarned: 0,
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
          let hasCFolioItems = false;
          this.tokenIds.forEach((n) => {
            this.levelFilter |= 1 << this.content.cards[n.levelId].levelId;
            if (
              this.content.cards[n.levelId].levelId === newLevelId &&
              n.cfolioItems.length > 0
            )
              hasCFolioItems = true;
          });
          this.levelDescription =
            (this.levelFilter & (1 << newLevelId)) === 0
              ? ''
              : (this.levelDescription = this.content.cards[
                  newLevelId
                ].header.replace(
                  '{Q}',
                  this.content.cards[newLevelId].quantity.toString()
                ));
          if (this.walletTokenIds.length > 0) {
            this.levelFilter |= 1 << 4;
          }
          if (hasCFolioItems) {
            this.progessStart = new Date();
            this.progressInterval = window.setInterval(
              this._ticker.bind(this),
              1000
            );
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

  _ticker() {
    let perc = 100 - (new Date().getTime() - this.progessStart.getTime()) / 300;
    if (perc < 0) {
      this._updateRewards();
      this.progessStart = new Date();
      perc = 100;
    }
    this.progressRefs.forEach((ref) => {
      if (ref.current) ref.current.style.width = perc.toString() + '%';
    });
  }

  _updateRewards = async () => {
    StoreClasses.dispatcher.dispatch({
      type: SFT_REWARD,
      content: {},
    } as Payload);
  };

  render(): JSX.Element {
    const { display, t } = this.props;
    const { contentLoaded, isWalletConnected, levelId, type } = this.state;
    const levelPosition = levelId;
    const hasMoreLevels = this.nextLevel >= 0;

    const startPosition = 0;

    return (
      <>
        {/*type === 'myPack' && levelId !== 4 && isWalletConnected && (
          <span className="bg-orange">
            <span
              className="info-progress"
              onAnimationIteration={this._updateRewards.bind(this)}
            />
          </span>
        )*/}
        <div
          ref={this.mainRef}
          className={'wolves-container wolves-header bg-' + type}
        >
          {!isWalletConnected && display === 'my' ? (
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
                    this.content.levelNames.map(
                      (name: string, index: number) => {
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
                      }
                    )}
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
                <h4 className="tk-grotesk-lightbold">
                  {this.levelDescription}
                </h4>
              )}
              {contentLoaded && (
                <div id="page3-content-container">
                  {levelId !== 4 &&
                    this.tokenIds.map((id, index) => {
                      const level = this.content.cards[id.levelId];
                      return (
                        level.levelId === levelId &&
                        (display === 'my' || type === level.type) && (
                          <CardBox
                            sft={id}
                            earned={id.rewardEarned}
                            key={'card_' + index}
                            t={t}
                            progressRefs={this.progressRefs}
                          />
                        )
                      );
                    })}
                  {levelId === 4 &&
                    this.walletTokenIds.map((sftc, index) => (
                      <CardBox
                        cfolio={sftc}
                        earned={0}
                        key={'cfolio_' + index}
                        t={t}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  }
}
export default withTranslation()(Page3);
