/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Page4StakedInvest.css';

import { ethers } from 'ethers';
import React from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import WalletLogo from '../../assets/openwallet.png';
import {
  ASSETS_LOADED,
  CFOLIO_ITEM_BUY,
  SFT_STATE,
} from '../../stores/constants';
import {
  BIGNUMBER_MAX,
  SFTStateresult,
  StoreClasses,
} from '../../stores/store';
import {
  IMAGE_SLIDER_INTERFACE,
  IMAGE_SLIDER_SLIDE,
  ImageSlider,
} from '../controls/image_slider';
import { CARDS, CFOLIO_ITEMS } from '../types/cards';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type STATE = {
  cfolioItems?: CFOLIO_ITEMS;
  currentImage: number;
};

type IMAGE = { tokenId: number; level: number; index: number };

// Page 4 Stake Invest

class Page4StakedInvest extends React.Component<PROPS, STATE> {
  receiverImages: IMAGE[] = [];
  cards?: CARDS;
  sliderInterface?: IMAGE_SLIDER_INTERFACE;
  slideIndex = 0;

  constructor(props: PROPS) {
    super(props);

    const { location } = this.props;
    const query = new URLSearchParams(location.search);
    const index = parseInt(query.get('item') || '0');

    this.state = {
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
    tokenIds.forEach((elem) => {
      if (elem.isStockCard && !elem.locked && elem.id.toNumber() >> 24 >= 4) {
        const tokenId = elem.id.toNumber();
        const newLevel = cards.cards.findIndex(
          (level) => level.chainRef === tokenId >> 24
        );
        const newIndex = cards.cards[newLevel].cards.findIndex(
          (card) => card.chainRef === ((tokenId >> 16) & 0xff)
        );
        newImages.push({ tokenId: tokenId, level: newLevel, index: newIndex });
      } else if (elem.isWallet) {
        newImages.push({ tokenId: -1, level: -1, index: -1 });
      }
    });

    if (newImages.toString() !== this.receiverImages.toString()) {
      this.receiverImages = newImages;
      this.setCurrentImage(this.state.currentImage);
    }
    this.cards = cards;
    if (assets.cfolioItems.length > 0) {
      const cfolioItems = assets.cfolioItems.filter(
        (elem) => elem.type === 'lpInvestment'
      )[0];
      if (
        !this.state.cfolioItems ||
        this.state.cfolioItems.cards.length !== cfolioItems.cards.length
      )
        this.setState({ cfolioItems });
    }
  }

  handleBuy(): void {
    const payload = {
      type: CFOLIO_ITEM_BUY,
      content: {
        wowsAmount: 0.5,
        investAmount: [0.1],
        sftTokenId:
          this.receiverImages[this.slideIndex].tokenId >= 0
            ? ethers.BigNumber.from(
                this.receiverImages[this.slideIndex].tokenId.toString()
              )
            : BIGNUMBER_MAX,
        cfolioType: 0,
      },
    };
    StoreClasses.dispatcher.dispatch(payload);
  }

  sliderInit(id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) {
    this.sliderInterface = iface;
  }

  render(): JSX.Element {
    const handleImageChange = (change: number) => {
      if (this.state.cfolioItems) {
        if (this.state.currentImage + change < 0) {
          return this.setCurrentImage(this.state.cfolioItems.cards.length - 1);
        }

        if (
          this.state.currentImage + change >=
          this.state.cfolioItems.cards.length
        ) {
          return this.setCurrentImage(0);
        }

        return this.setCurrentImage(this.state.currentImage + change);
      }
    };

    const cfolioItem = this.state.cfolioItems
      ? this.state.cfolioItems.cards[this.state.currentImage]
      : undefined;

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
              <div className={'p_relative'}>
                <button
                  onClick={() => this.sliderInterface?.prev()}
                  className={'slide__arrow slide__arrow--left slide__arrows'}
                >
                  {'<'}
                </button>
                <div className="vw-80 py-3  border_thin_t border_thin_b p_relative center_triangle_up center_triangle_down">
                  <ImageSlider
                    sliderId="0"
                    initCallback={this.sliderInit.bind(this)}
                    onSlideChanged={(index) => (this.slideIndex = index)}
                    slideWidth={135}
                    slides={this.receiverImages.map((elem) => {
                      const slide = {
                        url:
                          elem.tokenId === -1
                            ? WalletLogo
                            : this.cards?.cards[elem.level].cards[
                                elem.index
                              ].url
                                .replace('{res}', '300')
                                .replace('.mp4', '.mp4.jpg') || '',
                      } as IMAGE_SLIDER_SLIDE;
                      return slide;
                    })}
                  />
                </div>
                <button
                  onClick={() => this.sliderInterface?.next()}
                  className={'slide__arrow slide__arrow--right slide__arrows'}
                >
                  {'>'}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className={'page4sInvest-container center-container my-5'}>
              <div className="d-flex align-items-center justify-content-even mb-3">
                <button
                  className="arrow_left m-0 mr-2"
                  onClick={() => handleImageChange(-1)}
                />
                {cfolioItem && (
                  <img
                    className={'w-80'}
                    src={cfolioItem.url.replace('{res}', '500')}
                    alt=""
                    style={{ maxWidth: '500px' }}
                  />
                )}
                <button
                  className="arrow_right m-0 ml-2"
                  onClick={() => handleImageChange(1)}
                />
              </div>

              <div className={'t-left'}>
                <h1 className={'tk-vincente h-1'}>
                  {' '}
                  {cfolioItem ? cfolioItem.name : 'WOLVES WOWS/ETH NFT'}{' '}
                </h1>

                <div
                  className={'tk-grotesk-lightbold font-16 line-break-enable'}
                >
                  <p>{cfolioItem?.description}</p>
                  <p>{this.state.cfolioItems?.description}</p>
                </div>

                <div className="p_relative">
                  <input
                    type="text"
                    className="wolve_input text-white font-14"
                    style={{ paddingRight: '125px' }}
                  />
                  {/*<div className="wolve_input_max">MAX</div>*/}
                  <div className={'wolve_input_label font-14'}>WOWS/ETH LP</div>
                </div>

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
              </div>
            </div>
          </div>
        </>
      </>
    );
  }
}

export default withTranslation()(Page4StakedInvest);
