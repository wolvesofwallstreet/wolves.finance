/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page4.css';

import { BigNumber, ethers } from 'ethers';
import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';
import {
  ASSETS_LOADED,
  CONNECTION_CHANGED,
  SFT_BUY,
  SFT_LOCK,
  SFT_STATE,
  SFT_UNLOCK,
} from '../../stores/constants';
import {
  ConnectResult,
  SFT,
  SFTStateresult,
  StatusResult,
  StoreClasses,
} from '../../stores/store';
import { CARDS } from '../types/cards';

type PAGE4_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type QueryType = 'wolves' | 'bois' | 'myPack';

type PAGE4_STATE = {
  type: QueryType;
  cards?: CARDS;
  tokenIds?: SFT[];
  isWalletConnected: boolean;
  txPending: boolean;
  currentIndex: number;
};

const INITIAL_PAGE4_STATE: PAGE4_STATE = {
  type: 'wolves',
  isWalletConnected: false,
  txPending: false,
  currentIndex: -1,
};

class Page4 extends Component<PAGE4_PROPS, PAGE4_STATE> {
  renderList: { id?: SFT; level: number; index: number }[] = [];
  scrollOnUpdate = true;
  needUpdate = true;

  constructor(props: PAGE4_PROPS) {
    super(props);
    this.state = {
      ...INITIAL_PAGE4_STATE,
      cards: StoreClasses.store.getAssets().cards,
      tokenIds: StoreClasses.store.getAssets().userSFT,
    };
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onAssetsLoaded = this.onAssetsLoaded.bind(this);
    this.onSFTState = this.onSFTState.bind(this);
    this.onSFTTransaction = this.onSFTTransaction.bind(this);
  }

  componentDidMount(): void {
    this._updateContent();
    this.setState({ isWalletConnected: StoreClasses.store.isConnected() });
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.on(ASSETS_LOADED, this.onAssetsLoaded);
    StoreClasses.emitter.on(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.on(SFT_BUY, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_LOCK, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_UNLOCK, this.onSFTTransaction);
  }

  componentDidUpdate(): void {
    this._updateContent();
    if (this.scrollOnUpdate) {
      window.scrollTo(0, 0);
      this.scrollOnUpdate = false;
    }
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(SFT_UNLOCK, this.onSFTTransaction);
    StoreClasses.emitter.off(SFT_LOCK, this.onSFTTransaction);
    StoreClasses.emitter.off(SFT_BUY, this.onSFTTransaction);
    StoreClasses.emitter.off(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.off(ASSETS_LOADED, this.onAssetsLoaded);
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') {
      this.setState({ isWalletConnected: params.address !== '' });
      this.needUpdate = true;
    }
  }

  onAssetsLoaded(type: string): void {
    this.needUpdate = true;
    this.setState({ cards: StoreClasses.store.getAssets().cards });
  }

  onSFTState(status: SFTStateresult): void {
    this.needUpdate = true;
    this.setState({ tokenIds: StoreClasses.store.getAssets().userSFT });
  }

  onSFTTransaction(status: StatusResult): void {
    if (status.status === 'success' || status.status === 'error')
      this.setState({ txPending: false });
  }

  _updateContent() {
    const { type } = this.state;
    const { history, location } = this.props;
    const query = new URLSearchParams(location.search);

    let newType: QueryType = 'wolves';
    switch (query.get('type')) {
      case 'bois':
        newType = 'bois';
        break;
      case 'myPack':
        newType = 'myPack';
        break;
    }

    if (newType !== this.state.type) {
      this.needUpdate = true;
      this.setState({ type: newType });
      query.delete('type');
      query.append('type', newType);
      history.replace('?' + query.toString());
      return;
    }

    if (!this.state.cards) return;

    if (!this.needUpdate) {
      return this._getCurrentIndex();
    }

    let currentIndex = -1;
    this.renderList = [];

    this.needUpdate = false;

    if (type === 'myPack' && this.state.tokenIds) {
      // create a lookup for chain
      const lookup: { [chain: number]: { l: number; i: number } } = {};
      this.state.cards.cards.forEach((level, index1) => {
        if (type === 'myPack' || level.type === type) {
          level.cards.forEach(
            (card, index2) =>
              (lookup[(level.chainRef << 8) | card.chainRef] = {
                l: index1,
                i: index2,
              })
          );
        }
      });

      const curTokenId = query.get('tokenId')
        ? ethers.BigNumber.from(query.get('tokenId'))
        : undefined;

      // loop through tokenIds and create renderlist
      this.state.tokenIds.forEach((tokenId) => {
        if (tokenId.isStockCard) {
          const l = lookup[(tokenId.id.mask(128).toNumber() >> 16) & 0xffff];
          if (l !== undefined) {
            if (curTokenId && tokenId.id.eq(curTokenId))
              currentIndex = this.renderList.length;
            this.renderList.push({ id: tokenId, level: l.l, index: l.i });
          }
        }
      });
    } else if (type !== 'myPack') {
      const curCardId = query.get('cardId') || '';
      this.state.cards.cards.forEach((level, index1) => {
        if (level.type === type) {
          level.cards.forEach((card, index2) => {
            if (card.id === curCardId) currentIndex = this.renderList.length;
            this.renderList.push({ level: index1, index: index2 });
          });
        }
      });
    }
    if (currentIndex < 0 && this.renderList.length > 0) currentIndex = 0;
    if (this.state.currentIndex !== currentIndex)
      this.setState({ currentIndex });
  }

  _getCurrentIndex() {
    const { cards, type } = this.state;
    const { location } = this.props;
    const query = new URLSearchParams(location.search);

    if (cards && this.renderList.length > 0) {
      let currentIndex = -1;
      if (type === 'myPack' && query.get('tokenId')) {
        const curTokenId = ethers.BigNumber.from(query.get('tokenId'));
        currentIndex = this.renderList.findIndex((elem) =>
          elem.id?.id.eq(curTokenId)
        );
      } else if (type !== 'myPack' && query.get('cardId')) {
        const curCardId = query.get('cardId');
        currentIndex = this.renderList.findIndex(
          (elem) => cards.cards[elem.level].cards[elem.index].id === curCardId
        );
      }
      if (currentIndex < 0) currentIndex = 0;
      if (this.state.currentIndex !== currentIndex)
        this.setState({ currentIndex });
    }
  }

  _onBuy(): void {
    if (this.state.currentIndex >= 0 && this.state.cards) {
      const current = this.renderList[this.state.currentIndex];
      const payload = {
        type:
          current.id === undefined
            ? SFT_BUY
            : current.id.locked
            ? SFT_UNLOCK
            : SFT_LOCK,
        content: {},
      };
      const cardLevel = this.state.cards.cards[current.level];
      payload.content = {
        amount: cardLevel.price,
        id: BigNumber.from(
          current.id === undefined
            ? (cardLevel.chainRef << 8) |
                cardLevel.cards[current.index].chainRef
            : current.id
        ),
      };
      this.setState({ txPending: true });
      StoreClasses.dispatcher.dispatch(payload);
    }
  }

  render(): JSX.Element {
    const { history, t } = this.props;
    const { cards, currentIndex, isWalletConnected, txPending, type } =
      this.state;

    const currentRender =
      currentIndex >= 0 ? this.renderList[currentIndex] : undefined;
    const currentLevel =
      cards && currentRender ? cards.cards[currentRender.level] : undefined;
    const currentCard =
      currentLevel && currentRender
        ? currentLevel.cards[currentRender.index]
        : undefined;

    const noQuantity =
      !currentCard ||
      !currentRender ||
      !currentLevel ||
      (currentRender.id === undefined &&
        currentCard.minted >= currentLevel.quantity);

    const getButtonText = (s: string): string =>
      !isWalletConnected
        ? t('header.connectWallet').toString()
        : noQuantity
        ? t('page4.noQuantity').toString()
        : txPending
        ? t('page4.txPending')
        : currentRender?.id === undefined
        ? t('page4.buy', { name: s }).toString()
        : currentRender?.id.locked
        ? t('page4.unlock', { name: s }).toString()
        : t('page4.lock', { name: s }).toString();

    // Create Navigation Links
    let prevUrl: string | undefined, nextUrl: string | undefined;
    if (this.renderList && this.renderList.length > 1) {
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : this.renderList.length - 1;
      const nextIndex =
        currentIndex < this.renderList.length - 1 ? currentIndex + 1 : 0;
      if (type === 'myPack') {
        prevUrl = `?type=myPack&tokenId=${this.renderList[
          prevIndex
        ].id?.id.toHexString()}&scroll=false`;
        nextUrl = `?type=myPack&tokenId=${this.renderList[
          nextIndex
        ].id?.id.toHexString()}&scroll=false`;
      } else {
        prevUrl = `?type=${type}&cardId=${
          cards?.cards[this.renderList[prevIndex].level].cards[
            this.renderList[prevIndex].index
          ].id
        }&scroll=false`;
        nextUrl = `?type=${type}&cardId=${
          cards?.cards[this.renderList[nextIndex].level].cards[
            this.renderList[nextIndex].index
          ].id
        }&scroll=false`;
      }
    }

    const backUrl =
      type === 'myPack'
        ? `my?type=myPack&levelId=${currentLevel?.levelId}`
        : `/shop?type=${type}&levelId=${currentLevel?.levelId}`;

    return (
      <div
        id="top"
        className={
          'wolves-container bg-' + (currentLevel ? currentLevel.type : 'wolves')
        }
      >
        <img src={Logo} alt="WOWS" width="50px" height="50px" />
        <h2 className="tk-vincente-lightbold no-margin">
          {t('page4.welcome-' + type)}
        </h2>
        <h3 className="tk-grotesk-lightbold no-margin">
          {t('page4.header-' + type)}
        </h3>
        {currentIndex >= 0 && (
          <div className="back-level-container">
            <span
              className="tk-vincente-lightbold font-24 content-margin c-pointer"
              onClick={() => history.push(backUrl)}
            >
              &lt;{t('page.back')}
            </span>
            <span className="tk-vincente-lightbold font-24 content-margin">
              {currentLevel ? cards?.levelNames[currentLevel.levelId] : ''}
            </span>
          </div>
        )}
        <span className="line-container">
          <span id="left" className="dot" />
          <span className="line" />
          <span id="right" className="dot" />
        </span>
        <div
          id="page4-section-header"
          className="tk-vincente-lightbold font-20 single-line"
        >
          <span>
            <>
              <span
                className={`tk-vincente-lightbold font-24 single-line ${
                  prevUrl ? 'c-pointer' : 'disabled-link'
                }`}
                onClick={() => (prevUrl ? history.push(prevUrl) : undefined)}
              >
                &lt;{t('page.previousCard')}
              </span>
            </>
          </span>
          <span
            className={`tk-vincente-lightbold font-24 single-line ${
              nextUrl ? 'c-pointer' : 'disabled-link'
            } `}
            onClick={() => (nextUrl ? history.replace(nextUrl) : undefined)}
          >
            {currentCard && (
              <>
                <span>{t('page.nextCard')}</span>
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
                    src={currentCard.url.replace('{res}', '500')}
                    poster={currentCard.url.replace('{res}', '300') + '.jpg'}
                    playsInline
                  />
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
                  <h1 className="tk-vincente-lightbold h-1 single-line">
                    {currentCard.name}
                  </h1>
                  <h2 className="tk-vincente-lightbold font-24">
                    <span>{t('page.motto')}: </span>
                    {currentCard.motto}
                  </h2>
                  {currentRender?.id !== undefined && (
                    <h2 className="tk-vincente-lightbold font-24">
                      <span>
                        {` ${t('page4.tokenId')}: 0x${currentRender?.id.id
                          .mask(128)
                          .toHexString()
                          .replace('0x', '')
                          .toUpperCase()
                          .padStart(8, '0')}`}
                      </span>
                    </h2>
                  )}
                  <span className="font-16">{currentCard.description}</span>
                  <ul className="tk-vincente-lightbold font-24 rarity-box">
                    <li>
                      <h2>RARITY: 1/{currentLevel?.quantity}</h2>
                    </li>
                    <li>
                      <h2>PROFIT REWARD: {currentLevel?.profitReward}% </h2>
                    </li>
                    {/*<li>
                      <h2>RAIDING POTENTIAL: 50%</h2>
                    </li>
                    <li>
                      <h2>APY: 430%</h2>
                    </li>*/}
                    <li>
                      <h2>AUTO UPGRADES: {currentLevel?.autoUpgrade}</h2>
                    </li>
                    <li>
                      <h2>COST: {currentLevel?.price} WOWS</h2>
                    </li>
                  </ul>
                </div>
                <input
                  className="wolves-btn buy-btn"
                  type="button"
                  value={getButtonText(currentCard.name)}
                  disabled={!isWalletConnected || noQuantity || txPending}
                  onClick={() => this._onBuy()}
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
