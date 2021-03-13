/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page4.css';

import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';
import { ASSETS_LOADED } from '../../stores/constants';
import { StoreClasses } from '../../stores/store';
import { CARD_LEVEL } from '../types/cards';

type PAGE4_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type PAGE4_STATE = {
  cardId: string;
  contentLoaded: boolean;
  type: 'wolves' | 'bois';
};

const INITIAL_PAGE4_STATE: PAGE4_STATE = {
  cardId: '',
  contentLoaded: false,
  type: 'wolves',
};

class Page4 extends Component<PAGE4_PROPS, PAGE4_STATE> {
  content: CARD_LEVEL | undefined = undefined;
  cardIndex = 0;
  levelName = '';

  constructor(props: PAGE4_PROPS) {
    super(props);
    this.state = INITIAL_PAGE4_STATE;
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
    this._checkContent();
  }

  _checkContent() {
    const { location } = this.props;
    const { type } = this.state;
    let { cardId, contentLoaded } = this.state;

    const query = new URLSearchParams(location.search);
    const newType = query.get('type') === 'bois' ? 'bois' : 'wolves';

    const cards = StoreClasses.store.getAssets().cards;

    if (newType !== type) {
      this.setState({ type: newType });
      contentLoaded = false;
    }

    if (cards.levelNames.length > 0) {
      if (!contentLoaded) {
        this.setState({ contentLoaded: true });
      }

      const levelId = parseInt(query.get('levelId') || '0');
      if (levelId !== this.content?.levelId) {
        let sectionIndex = cards.cards.findIndex(
          (level) => level.levelId === levelId && level.type === newType
        );
        if (sectionIndex < 0) sectionIndex = 0;
        this.content = cards.cards[sectionIndex];
        this.levelName = cards.levelNames[this.content.levelId];
        cardId = '';
      }

      let newCardId = query.get('cardId') || '';
      this.cardIndex = this.content.cards.findIndex(
        (card) => card.id === newCardId
      );
      if (this.cardIndex < 0) {
        this.cardIndex = 0;
        newCardId = this.content.cards[0]?.id || '';
      }
      if (newCardId !== cardId) {
        this.setState({ cardId: newCardId });
      }
    }
    return query.get('scroll') !== 'false';
  }

  render(): JSX.Element {
    const { history, t } = this.props;
    const { type } = this.state;
    const { contentLoaded } = this.state;

    const cardlength = this.content?.cards.length || 0;
    const nextCardIndex =
      this.cardIndex + 1 >= cardlength ? 0 : this.cardIndex + 1;
    const currentCard =
      cardlength > 0 ? this.content?.cards[this.cardIndex] : undefined;

    return (
      <div className={'wolves-container bg-' + type}>
        <img src={Logo} alt="WOWS" width="50px" height="50px" />
        <h2 className="tk-vincente-lightbold no-margin">
          {t('page4.welcome-' + type)}
        </h2>
        <h3 className="tk-grotesk-lightbold wolves-orange no-margin">
          {t('page4.header-' + type)}
        </h3>
        {contentLoaded && (
          <span className="tk-vincente-lightbold font-20">
            {this.levelName}
          </span>
        )}
        <span className="line-container">
          <span id="left" className="dot" />
          <span className="line" />
          <span id="right" className="dot" />
        </span>
        <div
          id="page4-section-header"
          className="tk-vincente-lightbold font-20 single-line wolves-orange"
        >
          <span>
            &lt;
            <span className="link" onClick={() => history.goBack()}>
              {t('page.back')}
            </span>
          </span>
          <span>
            {contentLoaded && (
              <>
                <span
                  className="link"
                  onClick={() =>
                    history.replace(
                      '?type=' +
                        type +
                        '&levelId=' +
                        this.content?.levelId +
                        '&cardId=' +
                        this.content?.cards[nextCardIndex].id +
                        '&scroll=false'
                    )
                  }
                >
                  {t('page.next')}
                </span>
                &gt;
              </>
            )}
          </span>
        </div>
        <div id="page4-content-container">
          <div id="page4-content-image">
            <div id="page4-content-image-inner">
              {currentCard &&
                (currentCard.type === 'movie' ? (
                  <video
                    disableRemotePlayback={true}
                    className="card-visual"
                    autoPlay={true}
                    loop={true}
                  >
                    <source
                      src={currentCard.url.replace('{res}', '500')}
                      type="video/mp4"
                    />
                  </video>
                ) : (
                  <img
                    className="card-visual"
                    src={currentCard.url.replace('{res}', '500')}
                    alt={currentCard.name}
                  />
                ))}
            </div>
          </div>
          <div id="page4-content-text">
            {currentCard && (
              <>
                <div>
                  <h1 className="tk-vincente-lightbold single-line">
                    {currentCard.name}
                  </h1>
                  <h2 className="tk-vincente-lightbold font-24">
                    <span className="wolves-orange">{t('page.motto')}: </span>
                    {currentCard.motto}
                  </h2>
                  <h3 className="tk-grotesk-lightbold">
                    {currentCard.description}
                  </h3>
                </div>
                <input
                  className="wolves-btn buy-btn"
                  type="button"
                  value={t('page4.buy', { name: currentCard.name }).toString()}
                  disabled={false}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default withTranslation()(Page4);
