/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import '../theme/checkbox/wolve_checkbox.css';
import './CFolioManager.css';

import React from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import WalletLogo from '../../assets/openwallet.png';
import { ASSETS_LOADED, SFT_STATE } from '../../stores/constants';
import { SFT, SFTStateresult, StoreClasses } from '../../stores/store';
import {
  IMAGE_SLIDER_INTERFACE,
  IMAGE_SLIDER_SLIDE,
  ImageSlider,
} from '../controls/image_slider';
import { CARDS, CFOLIO_ITEM, CFOLIO_ITEMS } from '../types/cards';

interface IMAGE extends IMAGE_SLIDER_SLIDE {
  sft: SFT;
  level: number;
  index: number;
}

interface SUBIMAGE extends IMAGE_SLIDER_SLIDE {
  cfolioItem: CFOLIO_ITEM;
}

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type STATE = {
  sliderImagesTop: IMAGE[];
  sliderImagesMiddle: SUBIMAGE[];
};

class CFolioManager extends React.Component<PROPS, STATE> {
  cards?: CARDS;
  cfolioItemCards: CFOLIO_ITEMS[] = [];
  sliderInterfaces: { [id: string]: IMAGE_SLIDER_INTERFACE } = {};
  sliderIndex = [0, 0, 0];

  constructor(props: PROPS) {
    super(props);
    this.state = {
      sliderImagesTop: [],
      sliderImagesMiddle: [],
    };

    this.onSFTState = this.onSFTState.bind(this);
    this._updateImages = this._updateImages.bind(this);
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

    // Create top images
    const newImages: IMAGE[] = [];
    tokenIds.forEach((sft, tokenIdIdx) => {
      if (sft.isStockCard && !sft.locked && sft.cfolioItems.length > 0) {
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
    this.setState({ sliderImagesTop: newImages });
    this.cards = cards;
    this.cfolioItemCards = assets.cfolioItems;

    this._createSliderImages();
  }

  _createSliderImages() {
    const sliderImagesMiddle: SUBIMAGE[] = [];
    if (this.sliderIndex[0] < this.state.sliderImagesTop.length) {
      const cfolioItems =
        this.state.sliderImagesTop[this.sliderIndex[0]].sft.cfolioItems;
      cfolioItems.forEach((cfi) => {
        let cfiCard: CFOLIO_ITEM | undefined;
        this.cfolioItemCards.find(
          (category) =>
            (cfiCard = category.cards.find(
              (card) => card.chainRef === cfi.type
            ))
        );
        if (cfiCard) {
          sliderImagesMiddle.push({
            url: cfiCard?.url.replace('{res}', '300'),
            cfolioItem: cfiCard,
          });
        }
      });
    }
    this.setState({ sliderImagesMiddle });
  }

  setSliderIndex(pos: number, index: number) {
    if (this.sliderIndex[pos] !== index) {
      this.sliderIndex[pos] = index;
      if (pos === 0) this._createSliderImages();
    }
  }

  sliderInit(id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) {
    this.sliderInterfaces[id || 'default'] = iface;
  }

  render() {
    return (
      <>
        <div className={'cfm-container bg-wolves'}>
          {/* Title & heading */}
          <div>
            <h2 className="tk-vincente-lightbold font-28 mt-1 single-line">
              {'WELCOME TO YOUR C-FOLIO TRANSFER MANAGER'}
            </h2>
            <h3 className="tk-grotesk-lightbold font-14">
              {'MANAGE YOUR ASSETS WITH MULTI TRANSACTIONS IN ONE.'}
            </h3>
          </div>

          <div
            className={
              'd-flex flex-column bg-blue-transparent wolves-orange-border font-16 py-4 my-2 mt-3'
            }
          >
            {/* Card slider-1 */}
            <div
              className={
                'w-90-36px py-3 p_relative center-container center_triangle_down'
              }
            >
              <ImageSlider
                sliderId="0"
                initCallback={this.sliderInit.bind(this)}
                slideWidth={135}
                onSlideChanged={(index) => this.setSliderIndex(0, index)}
                slides={this.state.sliderImagesTop}
              />
            </div>

            {/* Card slider-2 */}
            <div className={'w-90-36px center-container pt-4'}>
              <ImageSlider
                sliderId="1"
                initCallback={this.sliderInit.bind(this)}
                slideWidth={135}
                onSlideChanged={(index) => this.setSliderIndex(1, index)}
                slides={this.state.sliderImagesMiddle}
              />
            </div>

            {/* H-line */}
            <div className={'cfm-h-line'} />

            {/* center btn, arrow */}
            <div
              className={
                'center-container d-flex flex-column justify-content-center align-items-center'
              }
            >
              <button className={'wolve_btn w-100 cfm-btn-stack'}>
                MULTI TRANSFER
              </button>
              <div className={'arrow_down mt-1'} />
            </div>

            {/* H-line */}
            <div className={'cfm-h-line'} />

            {/* Card slider-3 */}
            <div className={'w-100 mt-2 center-container'}>
              <div className={'slider-wrap-bar before_none after_none'}></div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default withTranslation()(CFolioManager);
