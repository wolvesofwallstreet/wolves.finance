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
import { Modal } from 'react-bootstrap';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/wolves-token_99.png';
import {
  ASSETS_STATE,
  SFT_BUY,
  SFT_CLAIM,
  SFT_CLAIM_BOOSTER,
  SFT_LOCK,
  SFT_REWARD,
  SFT_UNLOCK,
  SFT_UPGRADE,
} from '../../stores/constants';
import {
  AssetStateresult,
  Payload,
  SFT,
  SFTCHILD,
  StatusResult,
  StoreClasses,
} from '../../stores/store';
import { remainingFromSecs } from '../../utils/utils';
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
  selectedCFolio: number;
  modalOpen: boolean;
  boosterExistingValue: number;
  boosterNewValue: number;
  boosterRelock: number;
};

const INITIAL_PAGE4_STATE: PAGE4_STATE = {
  type: 'wolves',
  isWalletConnected: false,
  txPending: false,
  currentIndex: -1,
  selectedCFolio: -1,
  modalOpen: false,
  boosterExistingValue: 1,
  boosterNewValue: 15552000,
  boosterRelock: 1,
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
    this.onAssetsState = this.onAssetsState.bind(this);
    this.onSFTTransaction = this.onSFTTransaction.bind(this);
  }

  componentDidMount(): void {
    this._updateContent();
    this.setState({ isWalletConnected: StoreClasses.store.isConnected() });
    StoreClasses.emitter.on(ASSETS_STATE, this.onAssetsState);
    StoreClasses.emitter.on(SFT_BUY, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_CLAIM, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_CLAIM_BOOSTER, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_LOCK, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_UNLOCK, this.onSFTTransaction);
    StoreClasses.emitter.on(SFT_UPGRADE, this.onSFTTransaction);
  }

  componentDidUpdate(): void {
    this._updateContent();
    if (this.scrollOnUpdate) {
      window.scrollTo(0, 0);
      this.scrollOnUpdate = false;
    }
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(SFT_UPGRADE, this.onSFTTransaction);
    StoreClasses.emitter.off(SFT_UNLOCK, this.onSFTTransaction);
    StoreClasses.emitter.off(SFT_LOCK, this.onSFTTransaction);
    StoreClasses.emitter.off(SFT_CLAIM_BOOSTER, this.onSFTTransaction);
    StoreClasses.emitter.off(SFT_CLAIM, this.onSFTTransaction);
    StoreClasses.emitter.off(SFT_BUY, this.onSFTTransaction);
    StoreClasses.emitter.off(ASSETS_STATE, this.onAssetsState);
  }

  onAssetsState(status: AssetStateresult): void {
    if (status.status === 'loaded' || status.status === 'cards') {
      this.needUpdate = true;
      this.setState({ cards: StoreClasses.store.getAssets().cards });
      this.setState({ cfolios: StoreClasses.store.getAssets().cfolioItems });
    } else if (status.status === 'tokens') {
      this.needUpdate = true;
      this.setState({
        tokenIds: StoreClasses.store.getAssets().userSFT,
        isWalletConnected: StoreClasses.store.getAssets().userSFT.length > 0,
        selectedCFolio: -1,
      });
    } else if (status.status === 'rewards') {
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
    let fixIndex = 0;
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
        tokenIds[0].cfolioItems.find((cfi) =>
          cfi.tokenId.mask(128).eq(curTokenId.mask(128))
        )
      ) {
        // loop through cfolio items and create renderlist
        tokenIds[0].cfolioItems.forEach((cfi) => {
          if (curTokenId && cfi.tokenId.mask(128).eq(curTokenId.mask(128)))
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
            if (curTokenId) {
              if (sft.tokenId.eq(curTokenId)) {
                currentIndex = this.renderList.length;
              } else if (sft.tokenId.mask(128).eq(curTokenId.mask(128))) {
                fixIndex = this.renderList.length;
              }
            }
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
    if (currentIndex < 0 && this.renderList.length > 0) {
      this._fixUrl(fixIndex);
      return;
    }
    if (this.state.currentIndex !== currentIndex) {
      this.setState({ currentIndex, selectedCFolio: -1 });
    }
    if (
      currentIndex >= 0 &&
      (this.renderList[currentIndex].sft?.cfolioItems.length ?? 0) > 0
    )
      this.onProgressIteration();
  }

  _getCurrentIndex() {
    const { cards, type } = this.state;
    const { location } = this.props;
    const query = new URLSearchParams(location.search);
    let fixIndex = 0;

    if (cards && this.renderList.length > 0) {
      let currentIndex = -1;
      if (type === 'myPack' && query.get('tokenId')) {
        const curTokenId = ethers.BigNumber.from(query.get('tokenId'));
        currentIndex = this.renderList.findIndex((elem) =>
          elem.tokenId?.mask(128).eq(curTokenId.mask(128))
        );
        if (
          currentIndex >= 0 &&
          this.renderList[currentIndex]?.tokenId &&
          !this.renderList[currentIndex]?.tokenId?.eq(curTokenId)
        ) {
          fixIndex = currentIndex;
          currentIndex = -1;
        }
      } else if (type !== 'myPack' && query.get('cardId')) {
        const curCardId = query.get('cardId');
        currentIndex = this.renderList.findIndex(
          (elem) => cards.cards[elem.level].cards[elem.index].id === curCardId
        );
      }
      if (currentIndex < 0 && this.renderList.length > 0) {
        this._fixUrl(fixIndex);
        return;
      }
      if (this.state.currentIndex !== currentIndex) {
        this.setState({ currentIndex, selectedCFolio: -1 });
        if (
          currentIndex >= 0 &&
          (this.renderList[currentIndex].sft?.cfolioItems.length ?? 0) > 0
        )
          this.onProgressIteration();
      }
    }
  }

  _fixUrl(index: number) {
    const { history, location } = this.props;
    const query = new URLSearchParams(location.search);
    if (index < this.renderList.length) {
      if (this.state.type === 'myPack') {
        query.delete('tokenId');
        const tokenId = this.renderList[index].tokenId;
        if (tokenId) {
          query.append('tokenId', tokenId.toHexString());
        }
        history.replace('?' + query.toString());
        if (index === this.state.currentIndex) this.onProgressIteration();
      }
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

  _onClaim(): void {
    const payload: Payload = {
      type: SFT_CLAIM,
      content: {
        id: this.renderList[this.state.currentIndex].sft?.tokenId,
        time: this.renderList[this.state.currentIndex].sft?.boosterRewards
          .secsLeft
          ? this.state.boosterExistingValue
          : this.state.boosterNewValue,
      },
    };
    this.setState({ txPending: true });
    StoreClasses.dispatcher.dispatch(payload);
  }

  _onClaimBooster(): void {
    const payload: Payload = {
      type: SFT_CLAIM_BOOSTER,
      content: {
        id: this.renderList[this.state.currentIndex].sft?.tokenId,
        time: this.state.boosterRelock,
      },
    };
    this.setState({ txPending: true });
    StoreClasses.dispatcher.dispatch(payload);
  }

  _onUpgrade(): void {
    const payload: Payload = {
      type: SFT_UPGRADE,
      content: {
        id: this.renderList[this.state.currentIndex].tokenId,
      },
    };
    this.setState({ txPending: true });
    StoreClasses.dispatcher.dispatch(payload);
  }

  onProgressIteration() {
    StoreClasses.dispatcher.dispatch({
      type: SFT_REWARD,
      content: {},
    } as Payload);
  }

  toggleImage(event: React.MouseEvent<HTMLImageElement>) {
    this.setState({
      selectedCFolio:
        this.state.selectedCFolio < 0
          ? parseInt(event.currentTarget.getAttribute('data-id') || '-1')
          : -1,
    });
  }

  render(): JSX.Element {
    const { history, t } = this.props;
    const {
      cards,
      cfolios,
      currentIndex,
      selectedCFolio,
      isWalletConnected,
      txPending,
      type,
      modalOpen,
      boosterExistingValue,
      boosterNewValue,
      boosterRelock,
    } = this.state;

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
      (type !== 'myPack' &&
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

    const assetIndex =
      currentLevel?.type === 'bois' || currentLevel?.type === 'stableInvestment'
        ? 4
        : 0;

    let price,
      quantity,
      autoUpgrade,
      profitReward,
      autoUpgradeText,
      apr,
      apy,
      investment,
      share;
    let locked = false;
    if (currentRender?.cfi && currentCard) {
      quantity = (currentCard as CFOLIO_ITEM).maxMintable;
      locked = currentRender.cfi.locked;
      investment =
        currentRender?.cfi.assets[assetIndex].toFixed(6) +
        ' ' +
        (currentLevel as CFOLIO_ITEMS).token;
    } else if (currentRender && currentLevel) {
      quantity = (currentLevel as CARD_LEVEL).quantity;
      autoUpgrade = (currentLevel as CARD_LEVEL).autoUpgrade;
      if (autoUpgrade === '') autoUpgrade = undefined;
      profitReward = currentRender?.sft
        ? currentRender.sft.rewardRate / 10000
        : (currentLevel as CARD_LEVEL).profitReward;
      if (!currentRender?.sft) price = (currentLevel as CARD_LEVEL).price;
      if (autoUpgrade && currentRender.sft) {
        if (profitReward === (currentLevel as CARD_LEVEL).profitReward) {
          autoUpgrade =
            60 * 86400 + currentRender.sft?.mintTimestamp - Date.now() / 1000;
          const upgradeReward = (currentLevel as CARD_LEVEL).upgradeReward;
          autoUpgradeText = txPending
            ? t('page4.txPending')
            : autoUpgrade <= 0
            ? `UPGRADE TO ${upgradeReward} PROWESS NOW`
            : `UPGRADE TO ${upgradeReward} PROWESS IN ` +
              remainingFromSecs(autoUpgrade);
        } else {
          autoUpgrade = undefined;
        }
      }
      locked = currentRender.sft?.locked ?? false;
      if (profitReward && currentLevel) {
        const rewardIndex = currentLevel.type === 'wolves' ? 0 : 1;
        const rewardInfo =
          StoreClasses.store.getAssets().rewardInfo[rewardIndex];
        if (rewardInfo.apr) {
          apr = (rewardInfo.apr * profitReward) / 100;
          apy = StoreClasses.store.aprToApy(apr);
          share = currentRender.sft?.rewardShare.toFixed(2);
        }
      }
    }

    const claimableAmount = currentRender?.sft
      ? currentRender?.sft.rewardEarned +
        currentRender?.sft.boosterRewards.pending
      : 0;
    const claimText =
      currentRender?.sft &&
      (currentRender.sft.cfolioItems.length > 0 || claimableAmount > 0)
        ? !isWalletConnected
          ? { l: t('header.connectWallet').toString(), d: true }
          : txPending && !modalOpen
          ? { l: t('page4.txPending'), d: true }
          : {
              l: t('page4.claim', {
                amount: claimableAmount.toFixed(6),
              }).toString(),
              d: locked || claimableAmount === 0,
            }
        : undefined;

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
        const sftChild =
          selectedCFolio >= 0 &&
          selectedCFolio < currentRender.sft.cfolioItems.length &&
          currentRender.sft.cfolioItems[selectedCFolio];
        return (
          <>
            {currentRender.sft.cfolioItems.map((sftc, index) => {
              const cfi = cfolios[sftc.levelId].cards[sftc.cardId];
              return (
                <img
                  key={'cfi' + index}
                  id="cfi-image"
                  data-id={index}
                  onClick={this.toggleImage.bind(this)}
                  className="selectable"
                  style={
                    selectedCFolio !== index
                      ? { right: '6px', top: 6 + index * topOffset + 'px' }
                      : {
                          right: '15%',
                          zIndex: 20,
                          top: '12px',
                          transition: 'all 0.5s',
                        }
                  }
                  height={selectedCFolio !== index ? '80px' : '70%'}
                  alt={cfi.name}
                  src={cfi.url.replace('{res}', '500')}
                />
              );
            })}
            <span
              id="page4-content-image-inner-info"
              className="tk-vincente-lightbold"
              style={{ visibility: selectedCFolio < 0 ? 'hidden' : 'visible' }}
            >
              {sftChild && (
                <>
                  <h3>
                    {cfolios[sftChild.levelId].cards[sftChild.cardId].name}
                  </h3>
                  <h3>
                    {t('page.tokenId')}:{' '}
                    {sftChild.tokenId.mask(128).toHexString()}
                  </h3>
                  <h3>
                    {t('page.investment')}:{' '}
                    {sftChild.assets[assetIndex].toFixed(6)}{' '}
                    {cfolios[sftChild.levelId].token}
                  </h3>
                </>
              )}
            </span>
          </>
        );
      }
    };

    const imgClass =
      selectedCFolio < 0 ? 'card-visual' : 'card-visual monochrome';

    const hideCB = () => {
      this.setState({ modalOpen: false });
    };

    const boosterState = (value: number, n: number): string => {
      return value === n ? 'active' : 'select';
    };

    const boosterFuncN = (n: number) => {
      return boosterNewValue === n
        ? undefined
        : () => this.setState({ boosterNewValue: n });
    };

    const boosterFuncR = (n: number) => {
      return boosterRelock === n
        ? undefined
        : () => this.setState({ boosterRelock: n });
    };

    const boosterFuncE = (n: number) => {
      return boosterExistingValue === n
        ? undefined
        : () => this.setState({ boosterExistingValue: n });
    };

    let boosterFarmButtonText, boosterButtonText, boosterPeriod;

    const boosterTotal = currentRender?.sft?.boosterRewards.total.toFixed(2);
    if (currentRender?.sft?.boosterRewards.secsLeft) {
      switch (currentRender.sft.boosterRewards.apr) {
        case 1.75:
        case 1.875:
          boosterPeriod = '6 months';
          break;
        case 1.3:
          boosterPeriod = '3 months';
          break;
        case 1.0:
          boosterPeriod = '1 month';
          break;
        default:
          boosterPeriod = 'Unknown';
      }
    } else {
      boosterPeriod = modalOpen && 'No period started';
    }

    if (modalOpen && currentRender?.sft) {
      if (currentRender.sft.rewardEarned) {
        let lockRewards;
        if (currentRender.sft.boosterRewards.secsLeft) {
          lockRewards = boosterExistingValue > 0;
        } else {
          lockRewards = boosterNewValue > 0;
        }
        boosterFarmButtonText = txPending
          ? { l: t('page4.txPending'), d: true }
          : {
              l: t(lockRewards ? 'page4.lockWows' : 'page4.claim', {
                amount: currentRender.sft.rewardEarned.toFixed(6),
              }),
              d: false,
            };
      }

      if (currentRender.sft.boosterRewards.pending) {
        let lockRewards;
        if (currentRender.sft.boosterRewards.secsLeft) {
          lockRewards = boosterRelock;
        } else {
          lockRewards = false;
        }
        boosterButtonText = txPending
          ? { l: t('page4.txPending'), d: true }
          : {
              l: t(lockRewards ? 'page4.relockWows' : 'page4.claim', {
                amount: currentRender.sft.boosterRewards.pending.toFixed(6),
              }),
              d: false,
            };
      }
    }

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
            <span
              className={`tk-vincente-lightbold font-24 single-line noselect ${
                prevUrl ? 'c-pointer' : 'disabled-link'
              }`}
              onClick={() => (prevUrl ? history.push(prevUrl) : undefined)}
            >
              &lt;{t('page.previousCard')}
            </span>
          </span>
          <span
            className={`tk-vincente-lightbold font-24 single-line noselect ${
              nextUrl ? 'c-pointer' : 'disabled-link'
            } `}
            onClick={() => (nextUrl ? history.replace(nextUrl) : undefined)}
          >
            {t('page.nextCard')}&gt;
          </span>
        </div>
        {!isWalletConnected && type === 'myPack' ? (
          <span className="font-32 tk-vincente-lightbold wallet-warning">
            Wallet is not connected.
            <br /> Please connect your wallet.
          </span>
        ) : (
          <div id="page4-content-container">
            <div id="page4-content-image">
              <div id="page4-content-image-inner" ref={this.imageContainerRef}>
                {currentCard &&
                  (currentCard.type === 'movie' ? (
                    <video
                      disableRemotePlayback={true}
                      className={imgClass}
                      autoPlay={true}
                      loop={true}
                      src={currentCard.url.replace('{res}', '500')}
                      poster={currentCard.url.replace('{res}', '300') + '.jpg'}
                      playsInline
                    />
                  ) : (
                    <img
                      className={imgClass}
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
                    <h1
                      className={
                        'tk-vincente-lightbold h-1 single-line' +
                        (currentRender?.tokenId !== undefined
                          ? ' wolves-text-shaddow'
                          : '')
                      }
                    >
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
                          {` ${t('page.tokenId')}: 0x${currentRender?.tokenId
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
                    {currentRender?.cfi && (
                      <p className="font-14">
                        {t(locked ? 'page4.lockedCfi' : 'page4.unlockedCfi')}
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
                      {boosterPeriod && (
                        <li>
                          <h3 className="no-margin">
                            <span
                              className="ulink c-pointer"
                              onClick={() => this.setState({ modalOpen: true })}
                            >
                              {t('page4.booster', {
                                period: boosterPeriod,
                                amount: boosterTotal,
                              })}
                            </span>
                          </h3>
                        </li>
                      )}
                      {apr && (
                        <li>
                          <h3 className="no-margin">
                            {t('page4.aprapy', { apr, apy })}
                          </h3>
                        </li>
                      )}
                      {share && (
                        <li>
                          <h3 className="no-margin">
                            {t('page4.share', { share })}
                          </h3>
                        </li>
                      )}
                      {autoUpgrade && (
                        <li>
                          {typeof autoUpgrade !== 'number' ? (
                            <h3 className="no-margin">
                              {t('page.autoUpgrade')}: {autoUpgrade}
                            </h3>
                          ) : (
                            <input
                              className="wolves-btn tk-grotesk-lightbold font-16 mt-1"
                              type="button"
                              value={autoUpgradeText}
                              disabled={autoUpgrade > 0 || txPending}
                              onClick={() => this._onUpgrade()}
                            />
                          )}
                        </li>
                      )}
                      {price && (
                        <li>
                          <h3 className="no-margin">
                            {t('page.price')}: {price} WOWS
                          </h3>
                        </li>
                      )}
                      {investment && (
                        <li>
                          <h3 className="no-margin">
                            {t('page.investment')}: {investment}
                          </h3>
                        </li>
                      )}
                    </ul>
                  </div>
                  <div>
                    {claimText && (
                      <span className="p_relative" style={{ display: 'block' }}>
                        <input
                          className="wolves-btn mt-1"
                          type="button"
                          value={claimText.l}
                          disabled={claimText.d}
                          onClick={() => this.setState({ modalOpen: true })}
                        />
                        {!txPending &&
                          isWalletConnected &&
                          currentRender?.sft &&
                          currentRender.sft.cfolioItems.length > 0 && (
                            <span
                              onAnimationIteration={this.onProgressIteration}
                              className="info-progress absolute"
                              style={{ marginLeft: '2px', marginRight: '2px' }}
                            />
                          )}
                      </span>
                    )}
                    <input
                      className="wolves-btn mt-1"
                      type="button"
                      value={getButtonText(currentCard.name)}
                      disabled={!isWalletConnected || noQuantity || txPending}
                      onClick={() => this._onBuy()}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {modalOpen && (
          <Modal
            show={true}
            backdrop="static"
            onHide={hideCB}
            animation={false}
          >
            <Modal.Header closeButton>
              <span className="tk-vincente-bold font-28 lh-1 mb-0">
                BOOST MY REWARDS
              </span>
            </Modal.Header>
            <Modal.Body>
              <span className="tk-grotesk-lightbold">
                <p>
                  Your can boost your rewards by locking them into the Booster.
                  While the rewards are locked, you can claim 10% per month
                  either directly into your wallet, or reinvest into the Booster
                  to earn more.
                </p>
                <p>
                  Once you have created a lock period, you cannot change it's
                  expire time. But you can always add rewards into it.
                </p>
                <hr />
                <span className="d-block w-100 text-center">
                  <b>Booster lock:</b> {boosterPeriod}
                  {currentRender?.sft?.boosterRewards.secsLeft && (
                    <>
                      <br />
                      <b>Terminate:</b>{' '}
                      {remainingFromSecs(
                        currentRender.sft.boosterRewards.secsLeft
                      )}
                      <br />
                      <b>Locked Amount:</b> {boosterTotal} WOWS
                      <br />
                      <b>APR:</b> {currentRender.sft.boosterRewards.apr * 100} %
                    </>
                  )}
                </span>
                {currentRender?.sft && currentRender.sft.rewardEarned > 0 && (
                  <>
                    <hr />
                    <span className="tk-vincente-bold font-22 d-block w-100 text-center">
                      FARM REWARDS
                    </span>
                    {currentRender.sft.boosterRewards.secsLeft ? (
                      <div className="lock-container">
                        <div
                          className={boosterState(boosterExistingValue, 1)}
                          onClick={boosterFuncE(1)}
                        >
                          Lock into Booster
                        </div>
                        <div
                          className={boosterState(boosterExistingValue, 0)}
                          onClick={boosterFuncE(0)}
                        >
                          Claim into wallet
                        </div>
                      </div>
                    ) : (
                      <div className="lock-container">
                        <div
                          className={boosterState(boosterNewValue, 2592000)}
                          onClick={boosterFuncN(2592000)}
                        >
                          1 month (100% APR)
                        </div>
                        <div
                          className={boosterState(boosterNewValue, 7776000)}
                          onClick={boosterFuncN(7776000)}
                        >
                          3 months (130% APR)
                        </div>
                        <div
                          className={boosterState(boosterNewValue, 15552000)}
                          onClick={boosterFuncN(15552000)}
                        >
                          6 months (175% APR)
                        </div>
                        <div
                          className={boosterState(boosterNewValue, 0)}
                          onClick={boosterFuncN(0)}
                        >
                          Claim into wallet
                        </div>
                      </div>
                    )}
                    <button
                      className={'wolves-btn mt-2 tk-aktiv-grotesk-condensed'}
                      onClick={() => this._onClaim()}
                      disabled={boosterFarmButtonText?.d}
                    >
                      {boosterFarmButtonText?.l}
                    </button>
                  </>
                )}
                {currentRender?.sft &&
                  currentRender.sft.boosterRewards.pending > 0 && (
                    <>
                      <hr />
                      <span className="tk-vincente-bold font-22 d-block w-100 text-center">
                        BOOSTER REWARDS
                      </span>
                      {currentRender.sft.boosterRewards.secsLeft && (
                        <div className="lock-container">
                          <div
                            className={boosterState(boosterRelock, 1)}
                            onClick={boosterFuncR(1)}
                          >
                            Relock into Booster
                          </div>
                          <div
                            className={boosterState(boosterRelock, 0)}
                            onClick={boosterFuncR(0)}
                          >
                            Claim into wallet
                          </div>
                        </div>
                      )}
                      <button
                        className={'wolves-btn mt-2 tk-aktiv-grotesk-condensed'}
                        onClick={() => this._onClaimBooster()}
                        disabled={boosterButtonText?.d}
                      >
                        {boosterButtonText?.l}
                      </button>
                    </>
                  )}
              </span>
            </Modal.Body>
          </Modal>
        )}
      </div>
    );
  }
}

export default withTranslation()(Page4);
