/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page3.css';

import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import Logo from '../../assets/logo.png';
import { ASSETS_LOADED } from '../../stores/constants';
import { StoreClasses } from '../../stores/store';
import { CARDS } from '../types/cards';
import { CardBox } from './cardbox';

type PAGE3_PROPS = {
  t: TFunction;
  location: unknown;
  display: 'shop' | 'auction' | 'my';
};

type QueryType = 'wolves' | 'bois' | 'myPack';

type PAGE3_STATE = {
  contentLoaded: boolean;
  type: QueryType;
  levelId: number;
};

const INITIAL_PAGE3_STATE: PAGE3_STATE = {
  contentLoaded: false,
  type: 'wolves',
  levelId: 1,
};

class Page3 extends Component<PAGE3_PROPS, PAGE3_STATE> {
  content: CARDS = { levelNames: [], cards: [] };
  levelDescription = '';
  tokenIds: number[] = [];
  isWalletConnected = true;
  constructor(props: PAGE3_PROPS) {
    super(props);
    this.state = INITIAL_PAGE3_STATE;
    this.onAssetsLoaded = this.onAssetsLoaded.bind(this);
  }

  componentDidMount(): void {
    this._checkContent();
    StoreClasses.emitter.on(ASSETS_LOADED, this.onAssetsLoaded);
  }

  componentDidUpdate(): void {
    if (this._checkContent()) window.scrollTo(0, 0);
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(ASSETS_LOADED, this.onAssetsLoaded);
  }

  onAssetsLoaded(type: string) {
    this.setState({ contentLoaded: false });
    this._checkContent();
  }

  _checkContent(): boolean {
    const { display, location } = this.props;
    const { type } = this.state;
    let { contentLoaded } = this.state;
    let { levelId } = this.state;

    const query = new URLSearchParams((location as Location).search);
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
        this.setState({ contentLoaded: true, levelId: 0 });
      }
      const newLevelId = parseInt(query.get('levelId') || '0') | 0;
      if (levelId !== newLevelId) {
        // retrieve level description
        if (display !== 'my') {
          const idx = this.content.cards.findIndex(
            (level) => level.levelId === newLevelId && level.type === newType
          );
          this.levelDescription = this.content.cards[idx].header.replace(
            '{Q}',
            this.content.cards[idx].quantity.toString()
          );
          this.tokenIds = this.content.cards[idx].cards.map(
            (card) =>
              (this.content.cards[idx].chainRef << 24) | (card.chainRef << 16)
          );
        } else {
          this.tokenIds = StoreClasses.store.getAssets().userSFT;
          this.levelDescription = 'Hi, this is the My Wolfpack site (TODO)';
        }
        this.setState({ levelId: newLevelId });
      }
    }

    return query.get('scroll') !== 'false';
  }

  render(): JSX.Element {
    const { display, t } = this.props;
    const { contentLoaded, levelId, type } = this.state;
    const levelPosition = levelId;
    const hasMoreLevels = levelPosition < this.content.levelNames.length - 1;
    const startPosition = 0;
    let tokenIdx = 0;

    return (
      <div className={'wolves-container bg-' + type}>
        {!this.isWalletConnected ? (
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
              {t('page3.newCrypto-' + type)}
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
                    return levelId === index ? (
                      <span
                        key={'sec_' + index}
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
                        this.tokenIds[tokenIdx] >> 16 <= tokenId
                      ) {
                        this.tokenIds[tokenIdx] >> 16 === tokenId &&
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
                                  ? this.tokenIds[tokenIdx]
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
