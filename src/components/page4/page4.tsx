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
  SFTStateresult,
  StatusResult,
  StoreClasses,
} from '../../stores/store';
import { CARD_LEVEL } from '../types/cards';

type PAGE4_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type QueryType = 'wolves' | 'bois' | 'myPack';

type PAGE4_STATE = {
  cardId: string;
  contentLoaded: boolean;
  type: QueryType;
  isWalletConnected: boolean;
  txPending: boolean;
};

const INITIAL_PAGE4_STATE: PAGE4_STATE = {
  cardId: '',
  contentLoaded: false,
  type: 'wolves',
  isWalletConnected: false,
  txPending: false,
};

class Page4 extends Component<PAGE4_PROPS, PAGE4_STATE> {
  content: CARD_LEVEL | undefined = undefined;
  cardIndex = 0;
  tokenId: number | undefined = undefined;
  tokenLocked = false;
  levelName = '';
  nextUrl = '';
  prevUrl = '';
  scrollOnUpdate = true;

  constructor(props: PAGE4_PROPS) {
    super(props);
    this.state = INITIAL_PAGE4_STATE;
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onAssetsLoaded = this.onAssetsLoaded.bind(this);
    this.onSFTState = this.onSFTState.bind(this);
    this.onSFTTransaction = this.onSFTTransaction.bind(this);
  }

  componentDidMount(): void {
    this._checkContent();
    this.setState({ isWalletConnected: StoreClasses.store.isConnected() });
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.on(ASSETS_LOADED, this.onAssetsLoaded);
    StoreClasses.emitter.on(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.on(SFT_BUY, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_LOCK, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_UNLOCK, this.onSFTTransaction);
  }

  componentDidUpdate(): void {
    this._checkContent();
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
    }
  }

  onAssetsLoaded(type: string): void {
    this.setState({ contentLoaded: false });
  }

  onSFTState(status: SFTStateresult): void {
    this.setState({ cardId: '' });
  }

  onSFTTransaction(status: StatusResult): void {
    if (status.status === 'success' || status.status === 'error')
      this.setState({ txPending: false });
  }

  _checkContent(): void {
    const { location } = this.props;
    const { type } = this.state;
    let { cardId, contentLoaded } = this.state;

    let newType: QueryType = 'wolves';
    let newLevelId = 0;
    let newCardId = '';

    const cards = StoreClasses.store.getAssets().cards;
    const tokenIds = StoreClasses.store.getAssets().userSFT;
    const query = new URLSearchParams(location.search);

    // check if we have tokenId given
    const tokenId = parseInt(query.get('tokenId') || '-1');
    const oldTokenId = this.tokenId;
    this.tokenId = undefined;
    this.tokenLocked = false;
    const tokenIndex =
      tokenId >= 0 ? tokenIds.findIndex((e) => e.id === tokenId) : -1;
    if (tokenIndex >= 0) {
      // retrieve levelId and cardId from tokenId
      this.tokenLocked = tokenIds[tokenIndex].locked;
      newLevelId = cards.cards.findIndex(
        (level) => level.chainRef === tokenId >> 24
      );
      if (newLevelId >= 0) {
        newType = cards.cards[newLevelId].type === 'wolves' ? 'wolves' : 'bois';
        const newCardIndex = cards.cards[newLevelId].cards.findIndex(
          (card) => card.chainRef === ((tokenId >> 16) & 0xff)
        );
        if (newCardIndex >= 0) {
          newCardId = cards.cards[newLevelId].cards[newCardIndex].id;
          newLevelId = cards.cards[newLevelId].levelId;
          this.tokenId = tokenId;
          if (oldTokenId !== tokenId) cardId = '';
        }
      }
    }
    if (this.tokenId === undefined) {
      newType = query.get('type') === 'bois' ? 'bois' : 'wolves';
      newLevelId = parseInt(query.get('levelId') || '0');
      newCardId = query.get('cardId') || '';
    }

    if (newType !== type) {
      this.setState({ type: newType });
      contentLoaded = false;
    }

    if (cards.levelNames.length > 0) {
      if (!contentLoaded) {
        this.setState({ contentLoaded: true });
      }

      if (newLevelId !== this.content?.levelId || !contentLoaded) {
        let sectionIndex = cards.cards.findIndex(
          (level) => level.levelId === newLevelId && level.type === newType
        );
        if (sectionIndex < 0) sectionIndex = 0;
        this.content = cards.cards[sectionIndex];
        this.levelName = cards.levelNames[this.content.levelId];
        cardId = '';
      }

      this.cardIndex = this.content.cards.findIndex(
        (card) => card.id === newCardId
      );
      if (this.cardIndex < 0) {
        this.cardIndex = 0;
        newCardId = this.content.cards[0]?.id || '';
      }
      if (newCardId !== cardId) {
        this.prevUrl = '';
        this.nextUrl = '';
        if (this.tokenId !== undefined) {
          if (tokenIds.length > 1) {
            let nextTokenId =
              tokenIds.findIndex((e) => e.id === this.tokenId) + 1;
            let prevTokenId = nextTokenId - 2;
            if (nextTokenId >= tokenIds.length) nextTokenId = 0;
            if (prevTokenId < 0) prevTokenId = tokenIds.length - 1;
            this.prevUrl =
              '?type=myPack&tokenId=' +
              tokenIds[prevTokenId].id +
              '&scroll=false';
            this.nextUrl =
              '?type=myPack&tokenId=' +
              tokenIds[nextTokenId].id +
              '&scroll=false';
          }
        } else {
          const cardlength = this.content?.cards.length || 0;
          if (cardlength > 1) {
            let nextCardIndex = this.cardIndex + 1;

            if (nextCardIndex >= cardlength) nextCardIndex = 0;
            let prevCardIndex = this.cardIndex - 1;
            if (prevCardIndex < 0) prevCardIndex = cardlength - 1;

            this.prevUrl =
              '?type=' +
              newType +
              '&levelId=' +
              newLevelId +
              '&cardId=' +
              this.content?.cards[prevCardIndex].id +
              '&scroll=false';
            this.nextUrl =
              '?type=' +
              newType +
              '&levelId=' +
              newLevelId +
              '&cardId=' +
              this.content?.cards[nextCardIndex].id +
              '&scroll=false';
          }
        }
        this.setState({ cardId: newCardId });
      }
    }
    if (query.get('scroll') === 'false') this.scrollOnUpdate = false;
  }

  _onBuy(): void {
    if (this.content) {
      const payload = {
        type:
          this.tokenId === undefined
            ? SFT_BUY
            : this.tokenLocked
            ? SFT_UNLOCK
            : SFT_LOCK,
        content: {},
      };
      payload.content = {
        amount: this.content.price,
        id:
          this.tokenId === undefined
            ? (this.content.chainRef << 8) |
              this.content.cards[this.cardIndex].chainRef
            : this.tokenId,
      };
      this.setState({ txPending: true });
      StoreClasses.dispatcher.dispatch(payload);
    }
  }

  render(): JSX.Element {
    const { history, t } = this.props;
    const { isWalletConnected, txPending, type } = this.state;
    const { contentLoaded } = this.state;
    const cardlength = this.content?.cards.length || 0;
    const currentCard =
      cardlength > 0 ? this.content?.cards[this.cardIndex] : undefined;

    const noQuantity =
      !currentCard ||
      !this.content ||
      (this.tokenId === undefined &&
        currentCard.minted >= this.content.quantity);

    const getButtonText = (s: string): string =>
      !isWalletConnected
        ? t('header.connectWallet').toString()
        : noQuantity
        ? t('page4.noQuantity').toString()
        : txPending
        ? t('page4.txPending')
        : this.tokenId === undefined
        ? t('page4.buy', { name: s }).toString()
        : this.tokenLocked
        ? t('page4.unlock', { name: s }).toString()
        : t('page4.lock', { name: s }).toString();

    return (
      <div id="top" className={'wolves-container bg-' + type}>
        <img src={Logo} alt="WOWS" width="50px" height="50px" />
        <h2 className="tk-vincente-lightbold no-margin">
          {t('page4.welcome-' + type)}
        </h2>
        <h3 className="tk-grotesk-lightbold no-margin">
          {t('page4.header-' + type)}
        </h3>
        {contentLoaded && (
          <div className="back-level-container">
            <span
              className="tk-vincente-lightbold font-24 content-margin c-pointer"
              onClick={() =>
                history.push(
                  this.tokenId
                    ? `my?type=myPack&levelId=${this.content?.levelId}`
                    : `/shop?type=${type}&levelId=${this.content?.levelId}`
                )
              }
            >
              &lt;{t('page.back')}
            </span>
            <span className="tk-vincente-lightbold font-24 content-margin">
              {this.levelName}
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
                  this.prevUrl ? 'c-pointer' : 'disabled-link'
                }`}
                onClick={() =>
                  this.prevUrl ? history.push(this.prevUrl) : undefined
                }
              >
                &lt;{t('page.previousCard')}
              </span>
            </>
          </span>
          <span
            className={`tk-vincente-lightbold font-24 single-line ${
              this.nextUrl ? 'c-pointer' : 'disabled-link'
            } `}
            onClick={() =>
              this.nextUrl ? history.replace(this.nextUrl) : undefined
            }
          >
            {contentLoaded && (
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
                  <h1 className="tk-vincente-lightbold single-line">
                    {currentCard.name}
                  </h1>
                  <h2 className="tk-vincente-lightbold font-24">
                    <span>{t('page.motto')}: </span>
                    {currentCard.motto}
                  </h2>
                  {this.tokenId !== undefined && (
                    <h2 className="tk-vincente-lightbold font-24">
                      <span>
                        {` ${t('page4.tokenId')}: 0x${this.tokenId
                          .toString(16)
                          .padStart(8, '0')}`}
                      </span>
                    </h2>
                  )}
                  <span className="font-16">{currentCard.description}</span>
                  <ul className="tk-vincente-lightbold font-24 rarity-box">
                    <li>
                      <h2>RARITY: 1/{this.content?.quantity}</h2>
                    </li>
                    <li>
                      <h2>PROFIT REWARD: {this.content?.profitReward}% </h2>
                    </li>
                    {/*<li>
                      <h2>RAIDING POTENTIAL: 50%</h2>
                    </li>
                    <li>
                      <h2>APY: 430%</h2>
                    </li>*/}
                    <li>
                      <h2>AUTO UPGRADES: {this.content?.autoUpgrade}</h2>
                    </li>
                    <li>
                      <h2>COST: {this.content?.price} WOWS</h2>
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
