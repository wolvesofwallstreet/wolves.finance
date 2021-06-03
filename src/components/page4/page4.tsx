/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page4.css';

import { BigNumber, ethers } from 'ethers';
import React, { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';
import {
  ASSETS_STATE,
  CONNECTION_CHANGED,
  SFT_BUY,
  SFT_LOCK,
  SFT_UNLOCK,
} from '../../stores/constants';
import {
  AssetStateresult,
  ConnectResult,
  SFT,
  SFTCHILD,
  StatusResult,
  StoreClasses,
} from '../../stores/store';
import {
  CARD,
  CARD_LEVEL,
  CARDS,
  CFOLIO_ITEM,
  CFOLIO_ITEMS,
} from '../types/cards';

type PAGE4_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type QueryType = 'wolves' | 'bois' | 'myPack';

type PAGE4_STATE = {
  type: QueryType;
  cards?: CARDS;
  cfolios?: CFOLIO_ITEMS[];
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
  renderList: {
    sft?: SFT;
    cfi?: SFTCHILD;
    tokenId?: ethers.BigNumber;
    level: number;
    index: number;
  }[] = [];
  scrollOnUpdate = true;
  needUpdate = true;
  imageContainerRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: PAGE4_PROPS) {
    super(props);
    this.state = {
      ...INITIAL_PAGE4_STATE,
      cards: StoreClasses.store.getAssets().cards,
      cfolios: StoreClasses.store.getAssets().cfolioItems,
      tokenIds: StoreClasses.store.getAssets().userSFT,
    };
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onAssetsState = this.onAssetsState.bind(this);
    this.onSFTTransaction = this.onSFTTransaction.bind(this);
  }

  componentDidMount(): void {
    this._updateContent();
    this.setState({ isWalletConnected: StoreClasses.store.isConnected() });
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.on(ASSETS_STATE, this.onAssetsState);
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
    StoreClasses.emitter.off(ASSETS_STATE, this.onAssetsState);
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') {
      this.setState({ isWalletConnected: params.address !== '' });
      this.needUpdate = true;
    }
  }

  onAssetsState(status: AssetStateresult): void {
    this.needUpdate = true;
    if (status.status === 'loaded' || status.status === 'cards') {
      this.setState({ cards: StoreClasses.store.getAssets().cards });
      this.setState({ cfolios: StoreClasses.store.getAssets().cfolioItems });
    } else if (status.status === 'tokens') {
      this.setState({ tokenIds: StoreClasses.store.getAssets().userSFT });
    }
  }

  onSFTTransaction(status: StatusResult): void {
    if (status.status === 'success' || status.status === 'error')
      this.setState({ txPending: false });
  }

  _updateContent() {
    const { tokenIds, type } = this.state;
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

    if (type === 'myPack' && tokenIds) {
      const curTokenId = query.get('tokenId')
        ? ethers.BigNumber.from(query.get('tokenId'))
        : undefined;
      // Display Wallet's CFolioItems if tokenId is CFI
      if (
        curTokenId &&
        tokenIds.length &&
        tokenIds[0].cfolioItems.find((cfi) => cfi.tokenId.eq(curTokenId))
      ) {
        // loop through tokenIds and create renderlist
        tokenIds[0].cfolioItems.forEach((cfi) => {
          if (curTokenId && cfi.tokenId.eq(curTokenId))
            currentIndex = this.renderList.length;
          this.renderList.push({
            cfi,
            tokenId: cfi.tokenId,
            level: cfi.levelId,
            index: cfi.cardId,
          });
        });
      } else {
        // loop through tokenIds and create renderlist
        tokenIds.forEach((sft) => {
          if (sft.isStockCard) {
            if (curTokenId && sft.tokenId.eq(curTokenId))
              currentIndex = this.renderList.length;
            this.renderList.push({
              sft,
              tokenId: sft.tokenId,
              level: sft.levelId,
              index: sft.cardId,
            });
          }
        });
      }
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
          elem.tokenId?.eq(curTokenId)
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
          current.tokenId === undefined
            ? SFT_BUY
            : current.sft?.locked ?? current.cfi?.locked
            ? SFT_UNLOCK
            : SFT_LOCK,
        content: {},
      };
      const cardLevel = this.state.cards.cards[current.level];
      payload.content = {
        amount: cardLevel.price,
        id: BigNumber.from(
          current.tokenId === undefined
            ? (cardLevel.chainRef << 8) |
                cardLevel.cards[current.index].chainRef
            : current.tokenId
        ),
      };
      this.setState({ txPending: true });
      StoreClasses.dispatcher.dispatch(payload);
    }
  }

  render(): JSX.Element {
    const { history, t } = this.props;
    const { cards, cfolios, currentIndex, isWalletConnected, txPending, type } =
      this.state;

    const currentRender =
      currentIndex >= 0 ? this.renderList[currentIndex] : undefined;

    const currentLevel =
      cards && cfolios && currentRender
        ? currentRender.cfi
          ? cfolios[currentRender.level]
          : cards.cards[currentRender.level]
        : undefined;

    const currentCard =
      currentLevel && currentRender
        ? currentLevel.cards[currentRender.index]
        : undefined;

    const noQuantity =
      !currentCard ||
      !currentRender ||
      !currentLevel ||
      (type === 'myPack' &&
        (currentCard as CARD).minted >= (currentLevel as CARD_LEVEL).quantity);

    const levelId = currentRender?.cfi
      ? 4
      : (currentLevel as CARD_LEVEL)?.levelId ?? 0;

    const getButtonText = (s: string): string =>
      !isWalletConnected
        ? t('header.connectWallet').toString()
        : noQuantity
        ? t('page4.noQuantity').toString()
        : txPending
        ? t('page4.txPending')
        : currentRender?.tokenId === undefined
        ? t('page4.buy', { name: s }).toString()
        : currentRender?.sft?.locked ?? currentRender?.cfi?.locked
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
        ].tokenId?.toHexString()}&scroll=false`;
        nextUrl = `?type=myPack&tokenId=${this.renderList[
          nextIndex
        ].tokenId?.toHexString()}&scroll=false`;
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
        ? `my?type=myPack&levelId=${levelId}`
        : `/shop?type=${type}&levelId=${levelId}`;

    let price, quantity, autoUpgrade, profitReward, locked;
    if (currentRender?.cfi && currentCard) {
      quantity = (currentCard as CFOLIO_ITEM).maxMintable;
      locked = currentRender.cfi.locked;
    } else if (currentRender && currentLevel) {
      quantity = (currentLevel as CARD_LEVEL).quantity;
      autoUpgrade = (currentLevel as CARD_LEVEL).autoUpgrade;
      if (autoUpgrade === '') autoUpgrade = undefined;
      profitReward = currentRender?.sft
        ? currentRender.sft.rewardRate / 10000
        : (currentLevel as CARD_LEVEL).profitReward;
      if (!currentRender?.sft) price = (currentLevel as CARD_LEVEL).price;
      locked = currentRender.sft?.locked ?? false;
    }

    const renderCFolioItems = () => {
      if (
        currentRender?.sft &&
        currentRender.sft.cfolioItems.length > 0 &&
        this.imageContainerRef.current &&
        cfolios
      ) {
        const topOffset =
          currentRender.sft.cfolioItems.length > 1
            ? Math.min(
                (this.imageContainerRef.current.clientHeight - 82) /
                  (currentRender.sft.cfolioItems.length - 1),
                86
              )
            : 0;
        return (
          <div id="cfi-image">
            {currentRender.sft.cfolioItems.map((sftc, index) => {
              const cfi = cfolios[sftc.levelId].cards[sftc.cardId];
              return (
                <img
                  key={'cfi' + index}
                  id="cfi-image"
                  style={{ top: 6 + index * topOffset + 'px' }}
                  height="80px"
                  alt={cfi.name}
                  src={cfi.url.replace('{res}', '300')}
                />
              );
            })}
          </div>
        );
      }
    };

    return (
      <div
        id="top"
        className={
          'wolves-container wolves-header tk-grotesk-lightbold bg-' +
          (currentLevel ? currentLevel.type : 'wolves')
        }
      >
        <img src={Logo} alt="WOWS" width="50px" height="50px" />
        <h2 className="tk-vincente-lightbold no-margin">
          {t('page4.welcome-' + type)}
        </h2>
        <h4
          className="tk-grotesk-lightbold"
          dangerouslySetInnerHTML={{ __html: t('page4.header-' + type) }}
        />
        {currentIndex >= 0 && (
          <div className="back-level-container">
            <span
              className="tk-vincente-lightbold font-24 content-margin c-pointer"
              onClick={() => history.push(backUrl)}
            >
              &lt;{t('page.back')}
            </span>
            <span className="tk-vincente-lightbold font-24 content-margin">
              {currentLevel ? cards?.levelNames[levelId] : ''}
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
            <div id="page4-content-image-inner" ref={this.imageContainerRef}>
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
              {locked && <div className={'locked'} />}
              {renderCFolioItems()}
            </div>
          </div>
          <div id="page4-content-text" className="gro">
            {currentCard && (
              <>
                <div>
                  <h1 className="tk-vincente-lightbold h-1 single-line">
                    {currentCard.name}
                  </h1>
                  <h3 className="tk-vincente-lightbold">
                    <span>
                      {t('page.motto')}:{currentCard.motto}
                    </span>
                  </h3>
                  {currentRender?.tokenId !== undefined && (
                    <h3 className="tk-vincente-lightbold">
                      <span>
                        {` ${t('page4.tokenId')}: 0x${currentRender?.tokenId
                          .mask(128)
                          .toHexString()
                          .replace('0x', '')
                          .toUpperCase()
                          .padStart(8, '0')}`}
                      </span>
                    </h3>
                  )}
                  <p className="font-16">{currentCard.description}</p>
                  {currentRender?.sft && (
                    <p className="font-14">
                      {t(locked ? 'page4.lockedSft' : 'page4.unlockedSft')}
                    </p>
                  )}
                  <ul className="tk-vincente-lightbold font-24 rarity-box">
                    <li>
                      <h3 className="no-margin">RARITY: 1/{quantity}</h3>
                    </li>
                    {profitReward && (
                      <li>
                        <h3 className="no-margin">
                          {t('page.prowess')}: {profitReward}%{' '}
                        </h3>
                      </li>
                    )}
                    {autoUpgrade && (
                      <li>
                        <h3 className="no-margin">
                          {t('page.autoUpgrade')}: {autoUpgrade}
                        </h3>
                      </li>
                    )}
                    {price && (
                      <li>
                        <h3 className="no-margin">
                          {t('page.price')}: {price} WOWS
                        </h3>
                      </li>
                    )}
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
