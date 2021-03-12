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
  display: 'shop' | 'auction';
};

type QueryType = 'wolves' | 'bois' | 'yourPack';

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
    const { location } = this.props;
    const { type } = this.state;
    let { contentLoaded, levelId } = this.state;

    const query = new URLSearchParams((location as Location).search);
    const newType = query.get('type') as QueryType;
    let hasContent = this.content.length > 0;

    if (newType !== type) {
      hasContent = false;
      this.setState({ type: newType });
      contentLoaded = false;
    }

    if (!contentLoaded) {
      const { cards } = StoreClasses.store.getAssets();
      this.content = cards[newType];
      if (this.content.length > 0) {
        hasContent = true;
      }
    }
    if (hasContent) {
      if (!contentLoaded) {
        this.setState({ contentLoaded: true });
        levelId = 0;
      }
      const newLevelId = parseInt(query.get('levelId') || '0');
      if (levelId !== newLevelId) {
        // retrieve level description
        this.levelDescription = this.content.cards[
          this.content.cards.findIndex(
            (level) => level.levelId === newLevelId && level.type === newType
          )
        ].header;
        this.setState({ levelId: newLevelId });
      }
    }
    return query.get('scroll') !== 'false';
  }

  render(): JSX.Element {
    const { t } = this.props;
    const { contentLoaded, levelId, type } = this.state;
    const levelPosition = this._getLevelPosition(levelId);
    const hasMoreLevels = levelPosition < this.content.length - 1;
    const hasContent = this.content.length > 0;
    const startPosition = 0;
    return (
      <div className={'wolves-container bg-' + type}>
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
        <h3 className="tk-grotesk-lightbold">{t('page3.newCrypto-' + type)}</h3>
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
              this.content.levelNames.map((name, index: number) => {
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
            <Link
              to={'?type=' + type + '&levelId=' + (levelId + 1)}
              className={`${!hasMoreLevels ? 'disabled-link' : ''}`}
            >
              {t('page.nextLevel')}
            </Link>
            &gt;
          </span>
        </div>
        {contentLoaded && (
          <h3 className="tk-grotesk-lightbold">
            {hasContent && this.content[levelPosition].header}
          </h3>
        )}
        {contentLoaded && (
          <div id="page3-content-container">
            {hasContent &&
              this.content[levelPosition].cards.map(
                (card: CARD, index: number) => {
                  return (
                    <CardBox
                      key={'card_' + index}
                      type={type}
                      levelId={levelId}
                      content={card}
                      t={t}
                    />
                  );
                }
              )}
          </div>
        )}
      </div>
    );
  }
}

export default withTranslation()(Page3);
