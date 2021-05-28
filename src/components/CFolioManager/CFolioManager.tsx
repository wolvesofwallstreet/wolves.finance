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
import { ASSETS_STATE } from '../../stores/constants';
import { AssetStateresult, SFT, StoreClasses } from '../../stores/store';
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
  sliderImagesBottom: IMAGE[];
  checkedMiddle: number[];
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
      sliderImagesBottom: [],
      checkedMiddle: [],
    };

    this.onAssetsState = this.onAssetsState.bind(this);
  }

  componentDidMount() {
    StoreClasses.emitter.on(ASSETS_STATE, this.onAssetsState);
    this._updateImages();
  }

  componentWillUnmount() {
    StoreClasses.emitter.off(ASSETS_STATE, this.onAssetsState);
  }

  onAssetsState(status: AssetStateresult) {
    if (['loaded', 'tokens'].includes(status.status)) this._updateImages();
  }

  _updateImages() {
    const assets = StoreClasses.store.getAssets();
    this.cards = assets.cards;
    const tokenIds = assets.userSFT;

    const pred = (sft: SFT) => sft.cfolioItems.length > 0;
    const newImages = this._getSftImages(tokenIds, pred);

    this.cfolioItemCards = assets.cfolioItems;
    this.setState({ sliderImagesTop: newImages });

    this._createSliderImages(newImages);
  }

  _getSftImages(
    tokenIds: SFT[],
    pred: (s: SFT) => boolean,
    pred2?: (l: number, i: number) => boolean
  ): IMAGE[] {
    const result: IMAGE[] = [];
    tokenIds.forEach((sft, tokenIdIdx) => {
      if (pred(sft)) {
        if (sft.isStockCard && !sft.locked) {
          const tokenId = sft.id.toNumber();
          const level =
            this.cards?.cards.findIndex((l) => l.chainRef === tokenId >> 24) ??
            -1;
          const index =
            this.cards?.cards[level].cards.findIndex(
              (card) => card.chainRef === ((tokenId >> 16) & 0xff)
            ) ?? -1;
          if (!pred2 || pred2(level, index)) {
            const url =
              this.cards?.cards[level].cards[index].url
                .replace('{res}', '300')
                .replace('.mp4', '.mp4.jpg') || '';
            result.push({
              url,
              cfolioItems: sft.cfolioItems,
              tokenId: sft.id,
              sft,
              level,
              index,
            });
          }
        } else if (sft.isWallet) {
          result.push({
            url: WalletLogo,
            cfolioItems: sft.cfolioItems,
            sft,
            level: -1,
            index: -1,
          });
        }
      }
    });
    return result;
  }

  _createSliderImages(topImages: IMAGE[]) {
    const sliderImagesMiddle: SUBIMAGE[] = [];
    const sliderImagesBottom: IMAGE[] = [];
    const constraints: { [x: string]: boolean } = {};

    if (this.sliderIndex[0] < topImages.length) {
      const cfolioItems = topImages[this.sliderIndex[0]].sft.cfolioItems;
      cfolioItems.forEach((cfi) => {
        let cfiCard: CFOLIO_ITEM | undefined;
        const cat = this.cfolioItemCards.find(
          (category) =>
            (cfiCard = category.cards.find(
              (card) => card.chainRef === cfi.type
            ))
        );
        if (cfiCard) {
          sliderImagesMiddle.push({
            url: cfiCard?.url.replace('{res}', '300'),
            cfolioItem: cfiCard,
            tokenId: cfi.id,
          });
          if (cat?.constraints) {
            constraints[cat.constraints] = true;
          } else {
            constraints['wolves'] = true;
            constraints['bois'] = true;
          }
        }
      });

      // Create bottom images, only contraint matching
      // and never insert current selected top element
      const pred = (sft: SFT) =>
        sft.id !== topImages[this.sliderIndex[0]].sft.id;
      const pred2 = (l: number, i: number) =>
        constraints[this.cards?.cards[l].type || ''];
      sliderImagesBottom.push(
        ...this._getSftImages(
          StoreClasses.store.getAssets().userSFT,
          pred,
          pred2
        )
      );
    }
    this.setState({ sliderImagesMiddle });
    this.setState({ sliderImagesBottom });
  }

  setSliderIndex(pos: number, index: number, checked?: number[]) {
    if (this.sliderIndex[pos] !== index) {
      this.sliderIndex[pos] = index;
      if (pos === 0) this._createSliderImages(this.state.sliderImagesTop);
    }
    if (checked && checked !== this.state.checkedMiddle)
      this.setState({ checkedMiddle: checked });
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
              'd-flex flex-column bg-blue-transparent wolves-orange-border font-16 my-2 pt-2'
            }
          >
            {/* Card slider-1 */}
            <div
              className={
                'w-90-36px pb-3 p_relative center-container center_triangle_down rotate-180'
              }
            >
              <div className="d-flex">
                <button
                  onClick={() => this.sliderInterfaces[0]?.prev()}
                  className={'slide__arrow slide__arrow--left'}
                  style={{
                    ['--left' as string]: '-22px',
                  }}
                >
                  {'<'}
                </button>
                <ImageSlider
                  sliderId="0"
                  initCallback={this.sliderInit.bind(this)}
                  slideWidth={150}
                  onSlideChanged={(index) => this.setSliderIndex(0, index)}
                  slides={this.state.sliderImagesTop}
                />
                <button
                  onClick={() => this.sliderInterfaces[0]?.next()}
                  className={'slide__arrow slide__arrow--right slide__arrows'}
                  style={{
                    ['--right' as string]: '-22px',
                  }}
                >
                  {'>'}
                </button>
              </div>
            </div>

            {/* Card slider-2 */}
            <div className={'w-90-36px center-container pt-2'}>
              <div className="d-flex p_relative">
                <button
                  onClick={() => this.sliderInterfaces[1]?.prev()}
                  className={'slide__arrow slide__arrow--left'}
                  style={{
                    ['--left' as string]: '-22px',
                  }}
                >
                  {'<'}
                </button>
                <ImageSlider
                  sliderId="1"
                  initCallback={this.sliderInit.bind(this)}
                  slideWidth={135}
                  onSlideChanged={(index, checked) =>
                    this.setSliderIndex(1, index, checked)
                  }
                  slides={this.state.sliderImagesMiddle}
                  checkbox={true}
                />
                <button
                  onClick={() => this.sliderInterfaces[1]?.next()}
                  className={'slide__arrow slide__arrow--right slide__arrows'}
                  style={{
                    ['--right' as string]: '-22px',
                  }}
                >
                  {'>'}
                </button>
              </div>
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
                MULTI TRANSFER ({this.state.checkedMiddle.length} SELECTED)
              </button>
              <div className={'arrow_down mt-1'} />
            </div>

            {/* H-line */}
            <div className={'cfm-h-line'} />

            {/* Card slider-3 */}
            <div
              className={
                'w-90-36px pb-3 p_relative center_triangle_down center-container'
              }
            >
              <div className="d-flex p_relative">
                <button
                  onClick={() => this.sliderInterfaces[2].prev()}
                  className={'slide__arrow slide__arrow--left'}
                  style={{
                    ['--left' as string]: '-22px',
                  }}
                >
                  {'<'}
                </button>
                <ImageSlider
                  sliderId="2"
                  initCallback={this.sliderInit.bind(this)}
                  slideWidth={150}
                  onSlideChanged={(index) => this.setSliderIndex(2, index)}
                  slides={this.state.sliderImagesBottom}
                />
                <button
                  onClick={() => this.sliderInterfaces[2]?.next()}
                  className={'slide__arrow slide__arrow--right slide__arrows'}
                  style={{
                    ['--right' as string]: '-22px',
                  }}
                >
                  {'>'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default withTranslation()(CFolioManager);
