/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './CFolioInvest.css';

import { ethers } from 'ethers';
import React from 'react';
import { Modal } from 'react-bootstrap';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

//import CoverLogo from '../../assets/COVER_LOGO_SMALL.png';
import WalletLogo from '../../assets/openwallet_low.png';
import { ASSETS_STATE } from '../../stores/constants';
import {
  AssetStateresult,
  SFT,
  SFTCHILD,
  SFTS,
  StoreClasses,
} from '../../stores/store';
import {
  IMAGE_SLIDER_CFOLIO,
  IMAGE_SLIDER_INTERFACE,
  IMAGE_SLIDER_SLIDE,
  ImageSlider,
} from '../controls/image_slider';
import { CARDS, CFOLIO_ITEMS } from '../types/cards';
import Stable from './Stable/Stable';
import StakeLP from './StakeLP/StakeLP';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type CFI_RENDER = {
  cfolioItem?: SFTCHILD;
  index: number;
};

type STATE = {
  cfiRender: CFI_RENDER[];
  currentImage: number;
  modalOpen: boolean;
};

interface IMAGE extends IMAGE_SLIDER_SLIDE {
  sft: SFT;
}

// CFolio Investment

class CFolioInvest extends React.Component<PROPS, STATE> {
  receiverImages: IMAGE[] = [];
  cards?: CARDS;
  cfolioItems?: CFOLIO_ITEMS;
  sliderInterface?: IMAGE_SLIDER_INTERFACE;
  slideIndex = 0;
  displayType = '';
  toolTippLink = '';
  tokenPrice = 0;
  continueBuy: (() => void) | undefined;

  constructor(props: PROPS) {
    super(props);
    this.state = {
      cfiRender: [],
      currentImage: 0,
      modalOpen: false,
    };
    this._onAssetsState = this._onAssetsState.bind(this);
    this.sliderCB = this.sliderCB.bind(this);
  }

  setCurrentSlide(val: number) {
    const { history, location } = this.props;
    const query = new URLSearchParams(location.search);
    const baseTokenId = this.receiverImages[val].tokenId?.toHexString();
    if (baseTokenId) {
      query.set('baseTokenId', baseTokenId);
    } else {
      this.slideIndex = 0;
      query.delete('baseTokenId');
      this._updateCFolioItems();
    }
    history.replace('?' + query.toString());
  }

  setCurrentImage(val: number) {
    const { cfiRender } = this.state;
    const { history } = this.props;
    if (cfiRender[val].cfolioItem) {
      history.push(
        `?type=${this.displayType}&tokenId=${cfiRender[
          val
        ].cfolioItem?.tokenId.toHexString()}`
      );
    } else {
      history.push(`?type=${this.displayType}&item=${cfiRender[val].index}`);
    }
  }

  componentDidUpdate() {
    const { history, location } = this.props;
    const query = new URLSearchParams(location.search);
    const newDisplayType = query.get('type') || 'lpInvestment';

    if (newDisplayType !== this.displayType) {
      this.displayType = newDisplayType;
      this.slideIndex = 0;
      this.sliderInterface?.go(0);
      this.toolTippLink = '?type=' + this.displayType;
      this.setState({ currentImage: 0 });
      this._updateImages();
      this._updateRewards();
    }

    if (query.get('baseTokenId')) {
      const newBaseTokenId = ethers.BigNumber.from(query.get('baseTokenId'));
      const index = this.receiverImages.findIndex(
        (elem) => elem.tokenId && elem.tokenId.eq(newBaseTokenId)
      );
      if (index >= 0 && index !== this.slideIndex) {
        this.slideIndex = index;
        this.sliderInterface?.go(index);
        this._updateCFolioItems();
        return;
      }
    }

    let index: number | undefined;
    if (query.get('tokenId')) {
      const newTokenId = ethers.BigNumber.from(query.get('tokenId'));
      index = this.state.cfiRender.findIndex(
        (elem) => elem.cfolioItem && elem.cfolioItem.tokenId.eq(newTokenId)
      );
    } else if (query.get('item')) {
      const item = parseInt(query.get('item') || '-1');
      index = this.state.cfiRender.findIndex(
        (elem) => !elem.cfolioItem && elem.index === item
      );
    }

    if (index !== undefined) {
      if (index >= 0) {
        if (index !== this.state.currentImage) {
          this.setState({ currentImage: index });
        }
      } else if (this.receiverImages.length > 0) {
        query.delete('tokenId');
        query.delete('item');
        history.replace('?' + query.toString());
        this.setState({ currentImage: 0 });
        return;
      }
    }
  }

  componentDidMount() {
    StoreClasses.emitter.on(ASSETS_STATE, this._onAssetsState);
    this._updateImages();
  }

  componentWillUnmount() {
    StoreClasses.emitter.off(ASSETS_STATE, this._onAssetsState);
  }

  _onAssetsState(result: AssetStateresult) {
    if (['loaded', 'cards', 'tokens'].includes(result.status)) {
      this._updateImages();
    } else if (result.status === 'cfolio_amount') {
      this.setState({ currentImage: this.state.currentImage });
    } else if (result.status === 'rewards') {
      this._updateRewards();
      this.setState({ currentImage: this.state.currentImage });
    }
  }

  _updateRewards() {
    const rewards = StoreClasses.store.getAssets().rewardInfo;
    const rewardMain = this.displayType === 'lpInvestment' ? 0 : 1;

    this.tokenPrice = rewards[rewardMain].slotInfo[0]
      ? rewards[rewardMain].slotInfo[0].priceToken
      : 0;
  }

  _updateImages() {
    const assets = StoreClasses.store.getAssets();
    const cards = assets.cards;
    const tokenIds = assets.userSFT;

    const newImages: IMAGE[] = [];
    const allowedLevel =
      this.displayType === 'lpInvestment' ? 0xff000000f0 : 0xff0000000f;

    tokenIds.forEach((sft, tokenIdIdx) => {
      if (
        sft.isStockCard &&
        sft.status === SFTS.UNLOCKED &&
        (allowedLevel & (1 << cards.cards[sft.levelId].chainRef)) !== 0
      ) {
        const url =
          cards.cards[sft.levelId].cards[sft.cardId].url
            .replace('{res}', '300')
            .replace('.mp4', '.mp4.jpg') || '';
        newImages.push({
          url,
          tokenId: sft.tokenId,
          cfolioItems: this._cfolioItemsForSlider(sft),
          sft,
        });
      } else if (sft.isWallet) {
        newImages.push({
          url: WalletLogo,
          cfolioItems: this._cfolioItemsForSlider(sft),
          sft,
        });
      }
    });

    this.receiverImages = newImages;
    this.cards = cards;
    this._updateCFolioItems();
  }

  _cfolioItemsForSlider(sft: SFT): IMAGE_SLIDER_CFOLIO[] {
    const cfolioItems = StoreClasses.store.getAssets().cfolioItems;
    const result: IMAGE_SLIDER_CFOLIO[] = [];
    sft.cfolioItems.forEach((cfi) => {
      result.push({
        name: cfolioItems[cfi.levelId].cards[cfi.cardId].name,
        tokenId: cfi.tokenId,
        disabled:
          (sft.isWallet && cfi.status > 0) ||
          cfolioItems[cfi.levelId].type !== this.displayType,
      });
    });
    return result;
  }

  _updateCFolioItems() {
    const cfolioItems = StoreClasses.store.getAssets().cfolioItems;
    const cfiRender: CFI_RENDER[] = [];

    if (cfolioItems.length > 0) {
      this.cfolioItems = cfolioItems.filter(
        (elem) => elem.type === this.displayType
      )[0];

      if (this.cfolioItems) {
        // Get all cFolioItems from selected card.
        if (
          this.slideIndex >= 0 &&
          this.slideIndex < this.receiverImages.length
        ) {
          const isWallet = this.receiverImages[this.slideIndex].sft.isWallet;
          this.receiverImages[this.slideIndex].sft.cfolioItems.forEach(
            (cfolioItem) => {
              if (
                cfolioItems[cfolioItem.levelId].type === this.displayType &&
                (!isWallet || cfolioItem.status === 0)
              )
                cfiRender.push({ cfolioItem, index: cfolioItem.cardId });
            }
          );
        }
        // Get all New cards
        cfiRender.push(
          ...this.cfolioItems.cards.map((_, index) => {
            return { index };
          })
        );
      }
    }
    this.setState({ cfiRender });
  }

  sliderInit(id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) {
    this.sliderInterface = iface;
  }

  sliderCB(_: string | undefined, index: number) {
    if (index !== this.slideIndex) {
      this.setCurrentSlide(index);
    }
  }

  beforeBuyCallback = (cb: () => void) => {
    const { cfiRender, currentImage, modalOpen } = this.state;
    if (
      !modalOpen &&
      cfiRender.length > 1 &&
      this.slideIndex === 0 &&
      currentImage < cfiRender.length
    ) {
      const currentRender = cfiRender[currentImage];
      if (!currentRender.cfolioItem) {
        this.continueBuy = cb;
        this.setState({ modalOpen: true });
        return false;
      } else {
        return true;
      }
    } else return true;
  };

  render(): JSX.Element {
    const { t } = this.props;
    const { cfiRender, modalOpen } = this.state;

    const handleImageChange = (change: number) => {
      if (cfiRender.length > 1) {
        if (this.state.currentImage + change < 0) {
          return this.setCurrentImage(cfiRender.length - 1);
        }

        if (this.state.currentImage + change >= cfiRender.length) {
          return this.setCurrentImage(0);
        }

        return this.setCurrentImage(this.state.currentImage + change);
      }
    };

    const renderItem =
      this.state.currentImage < cfiRender.length &&
      cfiRender[this.state.currentImage];
    const renderCFolioItem = renderItem && renderItem.cfolioItem;
    const cfolioItemCard =
      this.cfolioItems &&
      renderItem &&
      this.cfolioItems.cards[renderItem.index];
    const scroll = cfiRender.length > 1;

    const controlAttr = {
      nftPrice: cfolioItemCard ? cfolioItemCard.price : 0,
      nftType: cfolioItemCard ? cfolioItemCard.chainRef : 0,
      investCurrency: this.cfolioItems?.token ?? '',
      cfolioItem: renderCFolioItem || undefined,
      sft:
        this.slideIndex < this.receiverImages.length
          ? this.receiverImages[this.slideIndex].sft
          : undefined,
      beforeBuy: this.beforeBuyCallback,
    };

    const hideCB = () => {
      this.setState({ modalOpen: false });
    };

    const continueBuy = () => {
      this.setState({ modalOpen: false });
      if (this.continueBuy) this.continueBuy();
    };

    let investment = 0,
      investmentUSD = 0;
    if (renderCFolioItem) {
      investment = renderCFolioItem.assets[renderCFolioItem.assets.length - 1];
      investmentUSD = investment * this.tokenPrice;
    }

    return (
      <>
        <>
          <div
            className={
              'flex-column justify-content-center bg-flat2 text-white text-center '
            }
          >
            {/* Title & heading */}
            <div>
              <h2 className="mt-4 tk-vincente-lightbold font-28 single-line">
                {this.cfolioItems?.shortDescription}
              </h2>
              <h3 className="tk-grotesk-lightbold font-14">
                PICK YOUR HIGHEST LEVEL C-FOLIO TO INVEST WITH
              </h3>
            </div>

            {/* Card slider */}
            <div
              className={
                'd-flex justify-content-center bg-transparent-orange mb-3 '
              }
            >
              <div className="vw-90-safe py-3  border_thin_t border_thin_b p_relative center_triangle_up center_triangle_down min-height-190">
                <button
                  onClick={() => this.sliderInterface?.prev()}
                  className={'slide__arrow slide__arrow--left slide__arrows'}
                  style={{
                    ['--left' as string]: '-30px',
                  }}
                >
                  {'<'}
                </button>

                <ImageSlider
                  sliderId="0"
                  initCallback={this.sliderInit.bind(this)}
                  onSlideChanged={this.sliderCB}
                  slideWidth={150}
                  slides={this.receiverImages}
                  startSlideId={this.slideIndex}
                  toolTippLink={this.toolTippLink}
                />
                <button
                  onClick={() => this.sliderInterface?.next()}
                  className={'slide__arrow slide__arrow--right slide__arrows'}
                  style={{
                    ['--right' as string]: '-30px',
                  }}
                >
                  {'>'}
                </button>
              </div>
            </div>

            <div
              id="cfolioInvest-nav"
              className="tk-vincente-lightbold font-20 single-line"
            >
              <span
                className={`link _btn _btn_effect tk-vincente-lightbold font-24 single-line ${
                  scroll ? 'c-pointer' : 'disabled-link'
                }`}
                onClick={() => handleImageChange(-1)}
              >
                &lt;{t('page.previousCard')}
              </span>

              <Link
                to={`/cfolio-sfts?type=${this.displayType}`}
                className={`link _btn _btn_effect tk-vincente-lightbold font-24 single-line c-pointer `}
              >
                BACK TO I-NFTs
              </Link>

              <span
                className={`link _btn _btn_effect tk-vincente-lightbold font-24 single-line ${
                  scroll ? 'c-pointer' : 'disabled-link'
                } `}
                onClick={() => handleImageChange(1)}
              >
                {t('page.nextCard')}&gt;
              </span>
            </div>

            {/* Content */}
            <div
              className={
                'cfolioInvest-container wolves-header center-container my-3'
              }
            >
              <div className="left d-flex flex-column align-items-center justify-content-even">
                {cfolioItemCard && (
                  <img
                    className="card-visual"
                    src={cfolioItemCard.url.replace('{res}', '500')}
                    alt=""
                    style={{ width: '100%' }}
                  />
                )}
              </div>

              <div className={'right t-left'}>
                <div>
                  <h1
                    className={
                      'tk-vincente no-margin' +
                      (renderCFolioItem ? ' wolves-text-shaddow' : '')
                    }
                  >
                    {' '}
                    {cfolioItemCard ? cfolioItemCard.name : 'NFT'}{' '}
                    {renderCFolioItem ? ' - MY NFT' : ' - NEW NFT'}
                  </h1>
                  {cfolioItemCard && (
                    <h3 className="tk-vincente-lightbold">
                      <span>
                        {t('page.motto')}: {cfolioItemCard.motto}
                      </span>
                    </h3>
                  )}
                  <div
                    className={'tk-grotesk-lightbold font-16 line-break-enable'}
                  >
                    <h3 className="tk-vincente">
                      {renderCFolioItem ? (
                        <>
                          TOKEN ID:{' '}
                          {renderCFolioItem.tokenId.mask(128).toHexString()}
                        </>
                      ) : (
                        cfolioItemCard && (
                          <>
                            PRICE: {cfolioItemCard.price.toFixed(2)} WOWS
                            <br />
                            AVAILABLE:{' '}
                            {cfolioItemCard.maxMintable - cfolioItemCard.minted}
                            /{cfolioItemCard.maxMintable}
                          </>
                        )
                      )}
                    </h3>
                    <p>{cfolioItemCard && cfolioItemCard.description}</p>
                    <p>{this.cfolioItems?.description}</p>
                  </div>
                </div>
                <div
                  id="cfolioInvest-control"
                  className="bg-blue-transparent-light tk-grotesk-lightbold"
                >
                  {renderCFolioItem && (
                    <h3 className="tk-vincente">
                      MY INVESTMENT: {investment.toFixed(2)}
                      {' ' + controlAttr.investCurrency + ' '}(
                      {investmentUSD.toFixed(2)} USD)
                    </h3>
                  )}
                  {this.displayType === 'lpInvestment' ? (
                    <StakeLP {...controlAttr} />
                  ) : (
                    <Stable {...controlAttr} />
                  )}
                </div>
                {/*<div className="d-flex p_relative mt-1">
                  <img id="cover-image" src={CoverLogo} alt="COVER" />
                  <span id="cover-inner">
                    <a
                      className="tk-grotesk-lightbold"
                      target="_blank"
                      rel="noreferrer"
                      href="https://wolvesofwallstreet.finance"
                    >
                      <u>GET COVER INSURANCE FOR YOUR INVESTMENT</u>
                    </a>
                  </span>
                  </div>*/}
              </div>
            </div>
          </div>
          {modalOpen && (
            <Modal
              show={true}
              backdrop="static"
              onHide={hideCB}
              animation={false}
            >
              <Modal.Body>
                Your current target for the new I-NFT is "My Wallet". In order
                to receive WOWS rewards, the new I-NFT has to be in one of your
                CFolios.
                <br />
                If you want to buy the new I-NFT into one of your CFolios,
                CANCEL this message and select a CFolio on top of the page.
              </Modal.Body>
              <Modal.Footer>
                <button
                  className={
                    'wolves-btn white-border mt-2 w-25 tk-aktiv-grotesk-condensed'
                  }
                  onClick={continueBuy}
                >
                  CONTINUE
                </button>
                <button
                  className={
                    'wolves-btn white-border mt-2 w-25 tk-aktiv-grotesk-condensed'
                  }
                  onClick={hideCB}
                >
                  CANCEL
                </button>
              </Modal.Footer>
            </Modal>
          )}
        </>
      </>
    );
  }
}

export default withTranslation()(CFolioInvest);
