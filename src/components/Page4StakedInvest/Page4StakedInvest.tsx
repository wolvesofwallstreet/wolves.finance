/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Page4StakedInvest.css';

import StackInput from 'components/theme/stackInput/StackInput';
import Tab from 'components/theme/TabsContainer/Tab';
import React from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import WalletLogo from '../../assets/openwallet.png';
import {
  ASSETS_LOADED,
  CFOLIO_ITEM_BUY,
  SFT_STATE,
} from '../../stores/constants';
import {
  SFT,
  SFTCHILD,
  SFTStateresult,
  StoreClasses,
} from '../../stores/store';
import {
  IMAGE_SLIDER_INTERFACE,
  IMAGE_SLIDER_SLIDE,
  ImageSlider,
} from '../controls/image_slider';
// import StackInput from '../theme/stackInput';
import TabsContainer from '../theme/TabsContainer';
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
  [key: string]: number | string | unknown;
};

interface IMAGE extends IMAGE_SLIDER_SLIDE {
  sft: SFT;
  level: number;
  index: number;
}

// Page 4 Stake Invest
class Page4StakedInvest extends React.Component<PROPS, STATE> {
  receiverImages: IMAGE[] = [];
  cards?: CARDS;
  cfolioItems?: CFOLIO_ITEMS;
  sliderInterface?: IMAGE_SLIDER_INTERFACE;
  slideIndex = 0;

  constructor(props: PROPS) {
    super(props);

    const { location } = this.props;
    const query = new URLSearchParams(location.search);
    const index = parseInt(query.get('item') || '0');

    this.state = {
      cfiRender: [],
      currentImage: index,
    };
    this.onSFTState = this.onSFTState.bind(this);
    this._updateImages = this._updateImages.bind(this);
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
  }

  componentDidMount() {
    StoreClasses.emitter.on(ASSETS_LOADED, this._updateImages);
    StoreClasses.emitter.on(SFT_STATE, this.onSFTState);
    this._updateImages();
  }

  componentWillUnmount() {
    StoreClasses.emitter.off(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.off(ASSETS_LOADED, this._updateImages);
  }

  onSFTState(result: SFTStateresult) {
    if (result.status === 'user') this._updateImages();
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

    this.receiverImages = newImages;
    this.setCurrentImage(this.state.currentImage);

    this.cards = cards;
    this._updateCFolioItems();
  }

  _updateCFolioItems() {
    const cfolioItems = StoreClasses.store.getAssets().cfolioItems;
    const cfiRender: CFI_RENDER[] = [];

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

  handleClick(tab: unknown) {
    this.setState({ activeTab: tab });
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
    const cfolioItemCard =
      this.cfolioItems &&
      renderItem &&
      this.cfolioItems.cards[renderItem.index];
    const scroll = cfiRender.length > 1;

    const cardHasTokenId =
      renderItem && renderItem.cfolioItem && renderItem.cfolioItem.id
        ? true
        : false;

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
              <div className={'p_relative page4sInvest-slider-1'}>
                <button
                  onClick={() => this.sliderInterface?.prev()}
                  className={'slide__arrow slide__arrow--left slide__arrows'}
                  style={{
                    ['--left' as string]: '-25px',
                  }}
                >
                  {'<'}
                </button>
                <div className="vw-90-36px py-3  border_thin_t border_thin_b p_relative center_triangle_up center_triangle_down">
                  <ImageSlider
                    sliderId="0"
                    initCallback={this.sliderInit.bind(this)}
                    onSlideChanged={(index) => (this.slideIndex = index)}
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
              id="page4sInvest-nav"
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
              >
                {t('page.nextCard')}&gt;
              </span>
            </div>

            {/* Content */}
            <div className={'page4sInvest-container center-container my-3'}>
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
                </h1>

                <div
                  className={'tk-grotesk-lightbold font-16 line-break-enable'}
                >
                  <p>
                    {renderItem &&
                      renderItem.cfolioItem &&
                      `TOKEN ID: ${renderItem.cfolioItem.id
                        .mask(128)
                        .toHexString()}`}
                  </p>
                  <p>{cfolioItemCard && cfolioItemCard.description}</p>
                  <p>{this.cfolioItems?.description}</p>
                </div>

                <div id="page4sInvest-control">
                  {cardHasTokenId && (
                    <TabsContainer>
                      <Tab iconClassName="" linkClassName="STAKE_MORE">
                        <StackInput />
                        <div className="d-flex justify-content-end mt-1 font-13">
                          BUY V.2 ETH/WOWS LP TOKENS HERE
                        </div>
                        <button
                          className={
                            'wolve_btn page4sInvest-text-input mt-3 m-0 page4sInvest-btn-stack font-10'
                          }
                          onClick={() => this.handleBuy()}
                        >
                          BUY STAKED ETH/WOWS NFT
                        </button>
                      </Tab>

                      <Tab iconClassName="" linkClassName="UNSTAKE">
                        <StackInput />
                        <div className="d-flex justify-content-end mt-1 font-13">
                          UNSTAKED V.2 ETH/WOWS LP TOKENS HERE
                        </div>

                        <button
                          className={
                            'wolve_btn page4sInvest-text-input mt-3 m-0 page4sInvest-btn-stack font-10'
                          }
                          onClick={() => this.handleBuy()}
                        >
                          UNSTAKED ETH/WOWS NFT
                        </button>
                      </Tab>
                    </TabsContainer>
                  )}

                  {!cardHasTokenId && (
                    <TabsContainer>
                      <Tab
                        iconClassName=""
                        linkClassName="BUY INVESTMENT NFT AND STAKE"
                      >
                        <StackInput />
                        <div className="d-flex justify-content-end mt-1 font-13">
                          BUY V.2 ETH/WOWS LP TOKENS HERE
                        </div>
                        <button
                          className={
                            'wolve_btn page4sInvest-text-input mt-3 m-0 page4sInvest-btn-stack font-10'
                          }
                          onClick={() => this.handleBuy()}
                        >
                          BUY STAKED ETH/WOWS NFT
                        </button>
                      </Tab>
                    </TabsContainer>
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

export default withTranslation()(Page4StakedInvest);
