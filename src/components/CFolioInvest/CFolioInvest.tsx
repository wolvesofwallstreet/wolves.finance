/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './CFolioInvest.css';

import React from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import WalletLogo from '../../assets/openwallet_low.png';
import { ASSETS_STATE } from '../../stores/constants';
import {
  AssetStateresult,
  SFT,
  SFTCHILD,
  StoreClasses,
} from '../../stores/store';
import {
  IMAGE_SLIDER_CFOLIO,
  IMAGE_SLIDER_INTERFACE,
  IMAGE_SLIDER_SLIDE,
  ImageSlider,
} from '../controls/image_slider';
import { CARDS, CFOLIO_ITEMS } from '../types/cards';
import StakeLP from './StakeLP/StakeLP';
import YearnQuad from './YearnQuad/YearnQuad';

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
  initialCFolio = -1;
  investCurrency = '';
  displayType = '';

  constructor(props: PROPS) {
    super(props);
    this.state = {
      cfiRender: [],
      currentImage: 0,
    };
    this._onAssetsState = this._onAssetsState.bind(this);
    this.sliderCB = this.sliderCB.bind(this);

    const { location } = this.props;
    const query = new URLSearchParams(location.search);
    this.initialCFolio = parseInt(query.get('item') || '-1');
    this.displayType = query.get('type') || 'lpInvestment';
    this.investCurrency =
      this.displayType === 'lpInvestment' ? 'WOWS/ETH LP' : 'DAI';
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
  }

  componentDidUpdate() {
    const { location } = this.props;
    const query = new URLSearchParams(location.search);
    const newDisplayType = query.get('type') || 'lpInvestment';
    if (newDisplayType !== this.displayType) {
      this.displayType = newDisplayType;
      this.investCurrency =
        this.displayType === 'lpInvestment' ? 'WOWS/ETH LP' : 'DAI';
      this.slideIndex = 0;
      this.sliderInterface?.go(0);
      this.setState({ currentImage: 0 });
      this._updateImages();
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
    }
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
        !sft.locked &&
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
          (sft.isWallet && cfi.locked) ||
          cfolioItems[cfi.levelId].type !== this.displayType,
      });
    });
    return result;
  }

  _updateCFolioItems() {
    const cfolioItems = StoreClasses.store.getAssets().cfolioItems;
    const cfiRender: CFI_RENDER[] = [];
    let existingCards = 0;

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
                (!isWallet || !cfolioItem.locked)
              )
                cfiRender.push({ cfolioItem, index: cfolioItem.cardId });
            }
          );
        }
        existingCards = cfiRender.length;
        // Get all New cards
        cfiRender.push(
          ...this.cfolioItems.cards.map((_, index) => {
            return { index };
          })
        );
      }

      if (this.initialCFolio >= 0 && this.receiverImages.length > 0) {
        this.setState({ currentImage: this.initialCFolio + existingCards });
        this.initialCFolio = -1;
      } else if (
        this.receiverImages.length &&
        this.state.currentImage >= cfiRender.length
      ) {
        this.setState({ currentImage: 0 });
      }
    }
    this.setState({ cfiRender });
  }

  sliderInit(id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) {
    this.sliderInterface = iface;
  }

  sliderCB(_: string | undefined, index: number) {
    if (index !== this.slideIndex) {
      this.slideIndex = index;
      this._updateCFolioItems();
    }
  }

  render(): JSX.Element {
    const { t } = this.props;
    const { cfiRender } = this.state;

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
      investCurrency: this.investCurrency,
      cfolioItem: renderCFolioItem || undefined,
      sft:
        this.slideIndex < this.receiverImages.length
          ? this.receiverImages[this.slideIndex].sft
          : undefined,
    };

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
                {'PICK YOUR HIGHEST LEVEL WORK TO STAKE '}
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
                to={'/cfolio-sfts?type=lpInvestment'}
                className={`link _btn _btn_effect tk-vincente-lightbold font-24 single-line c-pointer `}
              >
                BACK TO INVESTMENT SFTS
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
              <div className="left d-flex flex-column align-items-center justify-content-even mb-3">
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
                <h1 className={'tk-vincente'}>
                  {' '}
                  {cfolioItemCard ? cfolioItemCard.name : 'NFT'}{' '}
                  {renderCFolioItem ? ' - MY NFT' : ' - NEW NFT'}
                </h1>

                <div
                  className={'tk-grotesk-lightbold font-16 line-break-enable'}
                >
                  <h3 className="tk-vincente">
                    {renderCFolioItem ? (
                      <>
                        TOKEN ID:{' '}
                        {renderCFolioItem.tokenId.mask(128).toHexString()}
                        <br />
                        INVESTMENT: {renderCFolioItem.assets[0].toFixed(4)}
                        {' ' + this.investCurrency}
                      </>
                    ) : (
                      cfolioItemCard && (
                        <>
                          PRICE: {cfolioItemCard.price.toFixed(2)} WOWS
                          <br />
                          AVAILABLE:{' '}
                          {cfolioItemCard.maxMintable - cfolioItemCard.minted}/
                          {cfolioItemCard.maxMintable}
                        </>
                      )
                    )}
                  </h3>
                  <p>{cfolioItemCard && cfolioItemCard.description}</p>
                  <p>{this.cfolioItems?.description}</p>
                </div>

                <div
                  id="cfolioInvest-control"
                  className="bg-blue-transparent-light tk-grotesk-lightbold"
                >
                  {this.displayType === 'lpInvestment' ? (
                    <StakeLP {...controlAttr} />
                  ) : (
                    <YearnQuad {...controlAttr} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      </>
    );
  }
}

export default withTranslation()(CFolioInvest);
