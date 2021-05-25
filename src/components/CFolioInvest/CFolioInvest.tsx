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

import WalletLogo from '../../assets/openwallet.png';
import {
  ASSETS_LOADED,
  CFOLIO_ITEM_BUY,
  SFT_STATE,
  STAKE_LP_AVAILABLE,
} from '../../stores/constants';
import {
  SFT,
  SFTCHILD,
  SFTStateresult,
  StoreClasses,
  TokenContractResult,
} from '../../stores/store';
import {
  IMAGE_SLIDER_INTERFACE,
  IMAGE_SLIDER_SLIDE,
  ImageSlider,
} from '../controls/image_slider';
import AssetInput from '../theme/assetInput';
import { CARDS, CFOLIO_ITEMS } from '../types/cards';

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
  tabOption: number;
  investAmount: number; // Available token in wallet
};

interface IMAGE extends IMAGE_SLIDER_SLIDE {
  sft: SFT;
  level: number;
  index: number;
}

// CFolio Investment

class CFolioInvest extends React.Component<PROPS, STATE> {
  receiverImages: IMAGE[] = [];
  cards?: CARDS;
  cfolioItems?: CFOLIO_ITEMS;
  sliderInterface?: IMAGE_SLIDER_INTERFACE;
  slideIndex = 0;
  initialCFolio = -1;
  investCurrency = 'WOWS/ETH LP';

  constructor(props: PROPS) {
    super(props);
    this.state = {
      cfiRender: [],
      currentImage: 0,
      tabOption: 0,
      investAmount: 0,
    };
    this.onSFTState = this.onSFTState.bind(this);
    this._updateImages = this._updateImages.bind(this);
    this.onLpAvailable = this.onLpAvailable.bind(this);

    const { location } = this.props;
    const query = new URLSearchParams(location.search);
    this.initialCFolio = parseInt(query.get('item') || '-1');
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
    this.setState({ tabOption: 0 });
  }

  componentDidMount() {
    StoreClasses.emitter.on(ASSETS_LOADED, this._updateImages);
    StoreClasses.emitter.on(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.on(STAKE_LP_AVAILABLE, this.onLpAvailable);
    this._updateImages();
  }

  componentWillUnmount() {
    StoreClasses.emitter.off(STAKE_LP_AVAILABLE, this.onLpAvailable);
    StoreClasses.emitter.off(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.off(ASSETS_LOADED, this._updateImages);
  }

  onSFTState(result: SFTStateresult) {
    if (result.status === 'user') this._updateImages();
  }

  onLpAvailable(params: TokenContractResult): void {
    const investAmount =
      params.error === undefined && params.tokenAmount !== undefined
        ? params.tokenAmount
        : 0;
    if (investAmount !== this.state.investAmount)
      this.setState({ investAmount });
  }

  _updateImages() {
    const assets = StoreClasses.store.getAssets();
    const cards = assets.cards;
    const tokenIds = assets.userSFT;

    const newImages: IMAGE[] = [];
    tokenIds.forEach((sft, tokenIdIdx) => {
      if (sft.isStockCard && !sft.locked && sft.id.toNumber() >> 24 >= 4) {
        const tokenId = sft.id.toNumber();
        const level = cards.cards.findIndex(
          (l) => l.chainRef === tokenId >> 24
        );
        const index = cards.cards[level].cards.findIndex(
          (card) => card.chainRef === ((tokenId >> 16) & 0xff)
        );
        const url =
          cards.cards[level].cards[index].url
            .replace('{res}', '300')
            .replace('.mp4', '.mp4.jpg') || '';
        newImages.push({
          url,
          cfolioItems: sft.cfolioItems,
          sft,
          level,
          index,
        });
      } else if (sft.isWallet) {
        newImages.push({
          url: WalletLogo,
          cfolioItems: sft.cfolioItems,
          sft,
          level: -1,
          index: -1,
        });
      }
    });

    if (newImages.length === 0 && this.state.investAmount > 0) {
      this.setState({ investAmount: 0 });
    } else if (this.receiverImages.length === 0 && newImages.length > 0) {
      StoreClasses.dispatcher.dispatch({
        type: STAKE_LP_AVAILABLE,
        content: {},
      });
    }

    this.receiverImages = newImages;

    this.cards = cards;
    this._updateCFolioItems();
  }

  _updateCFolioItems() {
    const cfolioItems = StoreClasses.store.getAssets().cfolioItems;
    const cfiRender: CFI_RENDER[] = [];
    let existingCards = 0;

    if (cfolioItems.length > 0) {
      this.cfolioItems = cfolioItems.filter(
        (elem) => elem.type === 'lpInvestment'
      )[0];

      if (this.cfolioItems) {
        // Get all cFolioItems from selected card.
        if (
          this.slideIndex >= 0 &&
          this.slideIndex < this.receiverImages.length
        ) {
          this.receiverImages[this.slideIndex].sft.cfolioItems.forEach(
            (cfolioItem) => {
              const index = this.cfolioItems?.cards.findIndex(
                (card) => card.chainRef === cfolioItem.type
              );
              if (index !== undefined && index >= 0)
                cfiRender.push({ cfolioItem, index });
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
      }
    }
    this.setState({ cfiRender });
    if (this.state.tabOption !== 0) this.setState({ tabOption: 0 });
  }

  handleBuy(): void {
    const payload = {
      type: CFOLIO_ITEM_BUY,
      content: {
        wowsAmount: 0.5,
        investAmount: [0],
        sftTokenId: this.receiverImages[this.slideIndex].sft.id,
        cfolioType: 0,
      },
    };
    StoreClasses.dispatcher.dispatch(payload);
  }

  sliderInit(id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) {
    this.sliderInterface = iface;
  }

  render(): JSX.Element {
    const { t } = this.props;
    const { cfiRender, investAmount, tabOption } = this.state;

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

    const renderSpan = (id: number, caption: string) => {
      return id === tabOption ? (
        <div>
          <span className="border_thin_b">{caption}</span>
        </div>
      ) : (
        <div>
          <span
            className="c-pointer"
            onClick={() => this.setState({ tabOption: id })}
          >
            {caption}
          </span>
        </div>
      );
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

    const spanText = renderCFolioItem
      ? 'STAKE MORE'
      : this.slideIndex === 0
      ? 'ADD "STAKE INVESTMENT NFT" INTO MY WALLET'
      : 'ADD "STAKE INVESTMENT NFT" INTO MY CFOLIO';

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
                {'WOLF TRADE FLOOR - CHOOSE YOUR C-FOLIO TO STAKE WITH'}
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
              <div className={'p_relative cfolioInvest-slider-1'}>
                <button
                  onClick={() => this.sliderInterface?.prev()}
                  className={'slide__arrow slide__arrow--left slide__arrows'}
                  style={{
                    ['--left' as string]: '-25px',
                  }}
                >
                  {'<'}
                </button>
                <div className="vw-90-36px py-3  border_thin_t border_thin_b p_relative center_triangle_up center_triangle_down min-height-190">
                  <ImageSlider
                    sliderId="0"
                    initCallback={this.sliderInit.bind(this)}
                    onSlideChanged={(index) => {
                      if (index !== this.slideIndex) {
                        this.slideIndex = index;
                        this._updateCFolioItems();
                      }
                    }}
                    slideWidth={150}
                    slides={this.receiverImages}
                  />
                </div>
                <button
                  onClick={() => this.sliderInterface?.next()}
                  className={'slide__arrow slide__arrow--right slide__arrows'}
                  style={{
                    ['--right' as string]: '10px',
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
            <div className={'cfolioInvest-container center-container my-3'}>
              <div className="left d-flex flex-column align-items-center justify-content-even mb-3">
                {cfolioItemCard && (
                  <img
                    src={cfolioItemCard.url.replace('{res}', '500')}
                    alt=""
                    style={{ width: '100%' }}
                  />
                )}
              </div>

              <div className={'right t-left'}>
                <h1 className={'tk-vincente h-1'}>
                  {' '}
                  {cfolioItemCard
                    ? cfolioItemCard.name
                    : 'WOLVES WOWS/ETH NFT'}{' '}
                  {renderCFolioItem ? ' - MY NFT' : ' - NEW NFT'}
                </h1>

                <div
                  className={'tk-grotesk-lightbold font-16 line-break-enable'}
                >
                  <p className="font-18">
                    {renderCFolioItem ? (
                      <>
                        TOKEN ID: {renderCFolioItem.id.mask(128).toHexString()}
                        <br />
                        STAKED: {renderCFolioItem.assets[0].toFixed(4)}
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
                  </p>
                  <p>{cfolioItemCard && cfolioItemCard.description}</p>
                  <p>{this.cfolioItems?.description}</p>
                </div>

                <div
                  id="cfolioInvest-control"
                  className="bg-blue-transparent-light"
                >
                  <div
                    id="cfolioInvest-control-nav"
                    className="tk-vincente-lightbold font-22"
                  >
                    {renderSpan(0, spanText)}
                    {renderCFolioItem && renderSpan(1, 'UNSTAKE')}
                  </div>
                  <span className="mt-1 font-13">
                    AVAILABLE IN{tabOption === 0 ? ' MY WALLET: ' : ' MY NFT: '}
                    {tabOption === 0
                      ? investAmount.toFixed(4)
                      : renderCFolioItem &&
                        renderCFolioItem.assets[0].toFixed(4)}{' '}
                    {this.investCurrency}
                  </span>

                  <AssetInput
                    buttonLabel={'BUY STAKED ETH/WOWS NFT'}
                    description={'BUY V.2 ETH/WOWS LP TOKENS HERE'}
                    onSubmitHanlde={() => this.handleBuy()}
                    investCurrency={this.investCurrency}
                  />
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
