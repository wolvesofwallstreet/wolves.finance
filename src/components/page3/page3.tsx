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

import Logo from '../../assets/logo.png';
import {
  ASSETS_LOADED,
  CONNECTION_CHANGED,
  SFT_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  SFTStateresult,
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
    myPackLevelDescriptions: [],
  };
  levelDescription = '';
  tokenIds: { id: number; locked: boolean }[] = [];
  levelFilter = 0;
  nextLevel = -1;
  prevLevel = -1;
  scrollOnUpdate = true;
  mainRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: PAGE3_PROPS) {
    super(props);
    this.state = INITIAL_PAGE3_STATE;
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onAssetsLoaded = this.onAssetsLoaded.bind(this);
    this.onSFTState = this.onSFTState.bind(this);
  }

  componentDidMount(): void {
    this._checkContent();
    this.setState({ isWalletConnected: StoreClasses.store.isConnected() });
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.on(ASSETS_LOADED, this.onAssetsLoaded);
    StoreClasses.emitter.on(SFT_STATE, this.onSFTState);
  }

  componentDidUpdate(): void {
    this._checkContent();
    if (this.scrollOnUpdate) {
      this.mainRef.current?.scrollIntoView();
      this.scrollOnUpdate = false;
    }
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(ASSETS_LOADED, this.onAssetsLoaded);
    StoreClasses.emitter.off(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') {
      this.setState({ isWalletConnected: params.address !== '' });
    }
  }

  onSFTState(status: SFTStateresult): void {
    this.setState({ contentLoaded: false });
  }

  onAssetsLoaded(type: string): void {
    this.setState({ contentLoaded: false });
    this._checkContent();
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
          this.levelDescription = this.content.cards[idx].header.replace(
            '{Q}',
            this.content.cards[idx].quantity.toString()
          );
          this.tokenIds = this.content.cards[idx].cards.map((card) => {
            return {
              id:
                (this.content.cards[idx].chainRef << 24) |
                (card.chainRef << 16),
              locked: false,
            };
          });
        } else {
          this.tokenIds = StoreClasses.store.getAssets().userSFT;

          // collect tokenId bitmask
          let tokenIdBits = 0;
          this.tokenIds.forEach((n) => (tokenIdBits |= 1 << (n.id >> 24)));
          this.content.cards.forEach((level) => {
            if (tokenIdBits & (1 << level.chainRef)) {
              this.levelFilter |= 1 << level.levelId;
            }
          });
          this.levelDescription =
            this.levelFilter === 0
              ? ''
              : this.content.myPackLevelDescriptions[newLevelId];
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
    const hasMoreLevels = (this.levelFilter & (1 << (levelId + 1))) !== 0;

    const startPosition = 0;
    let tokenIdx = 0;

    return (
      <div ref={this.mainRef} className={'wolves-container bg-' + type}>
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
            <h3 className="tk-grotesk-lightbold">
              {t('page3.newCrypto-' + type).replace(
                '{Q}',
                (levelId + 1).toString()
              )}
            </h3>
            <span className="line-container">
              <span id="left" className="dot" />
              <span className="line" />
              <span id="right" className="dot" />
            </span>
            <div id="page3-section-header">
              <span className="tk-vincente-lightbold font-24 single-line wolves-orange fixed-pos">
                &lt;
                {levelPosition <= startPosition ? (
                  <Link to="/">{t('page.home')}</Link>
                ) : (
                  <Link to={'?type=' + type + '&levelId=' + (levelId - 1)}>
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
              <span className="tk-vincente-lightbold font-24 single-line wolves-orange">
                {hasMoreLevels ? (
                  <Link to={'?type=' + type + '&levelId=' + (levelId + 1)}>
                    {t('page.nextLevel')}
                  </Link>
                ) : (
                  t('page.nextLevel')
                )}
                &gt;
              </span>
            </div>
            {contentLoaded && (
              <h3 className="tk-grotesk-lightbold">{this.levelDescription}</h3>
            )}
            {contentLoaded && (
              <div id="page3-content-container">
                {this.content.cards
                  .filter(
                    (level) =>
                      level.levelId === levelId &&
                      (display === 'my' || type === level.type)
                  )
                  .map((level) =>
                    level.cards.map((card, index) => {
                      const collection: JSX.Element[] = [];
                      const tokenId = (level.chainRef << 8) | card.chainRef;
                      while (
                        tokenIdx < this.tokenIds.length &&
                        this.tokenIds[tokenIdx].id >> 16 <= tokenId
                      ) {
                        this.tokenIds[tokenIdx].id >> 16 === tokenId &&
                          collection.push(
                            <CardBox
                              key={'card_' + tokenIdx}
                              type={level.type}
                              levelId={levelId}
                              content={card}
                              quantity={level.quantity}
                              price={level.price}
                              tokenId={
                                display === 'my'
                                  ? this.tokenIds[tokenIdx].id
                                  : undefined
                              }
                              t={t}
                            />
                          );
                        ++tokenIdx;
                      }
                      return collection;
                    })
                  )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}
export default withTranslation()(Page3);
