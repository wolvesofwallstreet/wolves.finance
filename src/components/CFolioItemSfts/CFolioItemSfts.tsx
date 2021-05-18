/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './CFolioItemSfts.css';

import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import { ASSETS_LOADED, SFT_STATE } from '../../stores/constants';
import { SFTStateresult, StoreClasses } from '../../stores/store';
import { INITIAL_CFOLIO_ITEMS } from '../types/cards';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type STATE = {
  currentType: string;
};

const INITIAL_STATE: STATE = {
  currentType: '',
};

class CFolioItemSfts extends Component<PROPS, STATE> {
  target = '';
  constructor(props: PROPS) {
    super(props);
    this.state = INITIAL_STATE;

    this.onAssetsLoaded = this.onAssetsLoaded.bind(this);
    this.onSftState = this.onSftState.bind(this);
  }

  componentDidMount() {
    StoreClasses.emitter.on(ASSETS_LOADED, this.onAssetsLoaded);
    StoreClasses.emitter.on(SFT_STATE, this.onSftState);
    this._updateContent();
  }

  componentDidUpdate() {
    this._updateContent();
  }

  componentWillUnmount() {
    StoreClasses.emitter.off(SFT_STATE, this.onSftState);
    StoreClasses.emitter.off(ASSETS_LOADED, this.onAssetsLoaded);
  }

  onSftState(status: SFTStateresult) {
    if (status.status === 'caps') this.onAssetsLoaded();
  }

  onAssetsLoaded() {
    this.setState({ currentType: this.state.currentType });
  }

  _updateContent() {
    const { location } = this.props;
    const query = new URLSearchParams(location.search);

    const filter = query.get('type') || '';
    if (filter !== this.state.currentType) {
      this.target = '';
      switch (filter) {
        case 'lpInvestment':
          this.target = 'staked-invest';
          break;
        case 'yearnInvestment':
          this.target = 'yearn-invest';
          break;
      }
      this.setState({ currentType: filter });
    }
  }

  render(): JSX.Element {
    const { t } = this.props;
    const storeItems = StoreClasses.store
      .getAssets()
      .cfolioItems.filter((elem) => elem.type === this.state.currentType);
    const items = storeItems.length > 0 ? storeItems[0] : INITIAL_CFOLIO_ITEMS;
    const cardRender =
      items.cards.length &&
      items.cards.map((card, index) => {
        return (
          <div className="cfisft-card" key={this.state.currentType + index}>
            <Link to={`${this.target}?item=${index}`}>
              <img
                className="card-media"
                src={card.url.replace('{res}', '500')}
                alt={card.name}
              />
            </Link>
            <span className="tk-vincente-lightbold font-32 m-0 mt-2 line-h">
              {card.name}
            </span>
            <hr className="wolves" />
            {
              <span className="tk-grotesk-lightbold font-14 ellipsis">
                {t('page.available')}: {card.maxMintable - card.minted}/
                {card.maxMintable}
              </span>
            }
            <span className="tk-grotesk-lightbold font-14 m-0 line-h ellipsis">
              {t('page.price')}: {card.price.toFixed(2)} WOWS
            </span>
          </div>
        );
      });

    return (
      <>
        <div id="top" className={'wolves-container bg-wolves'}>
          {/* Hero heading */}
          <div className="mb-3">
            <h2 className="tk-vincente-lightbold m-0">{items.title}</h2>
            <h3 className="tk-grotesk-lightbold m-0">
              {items.shortDescription}
            </h3>
          </div>

          {/* Line */}
          <span className="line-container cfisft-line-w-80">
            <span id="left" className="dot" />
            <span className="line" />
            <span id="right" className="dot" />
          </span>

          {/* Section title */}
          <span className="tk-vincente-lightbold">
            <span className="font-24">
              CORE LP NFT
              <div id="triangle-down" />
            </span>
          </span>

          {/* Cards listing */}
          <div className="cfisft-card-container mt-1">{cardRender}</div>
        </div>
      </>
    );
  }
}

export default withTranslation()(CFolioItemSfts);
