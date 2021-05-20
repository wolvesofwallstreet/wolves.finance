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

import React, { Fragment, useState } from 'react';
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
import { CARDS } from '../types/cards';

type IMAGE = {
  sft: SFT;
  level: number;
  index: number;
};

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type STATE = {
  sliderIndexTop: number;
  cards?: CARDS;
};

class CFolioManager extends React.Component<PROPS, STATE> {
  sliderImages: IMAGE[] = [];
  sliderInterfaces: { [id: string]: IMAGE_SLIDER_INTERFACE } = {};

  constructor(props: PROPS) {
    super(props);
    this.state = { sliderIndexTop: 0 };

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

    const newImages: IMAGE[] = [];
    tokenIds.forEach((sft, tokenIdIdx) => {
      if (sft.isStockCard && !sft.locked) {
        const tokenId = sft.id.toNumber();
        const level = cards.cards.findIndex(
          (l) => l.chainRef === tokenId >> 24
        );
        const index = cards.cards[level].cards.findIndex(
          (card) => card.chainRef === ((tokenId >> 16) & 0xff)
        );
        newImages.push({ sft, level, index });
      } else if (sft.isWallet) {
        newImages.push({ sft, level: -1, index: -1 });
      }
    });

    this.sliderImages = newImages;
    this.setState({ cards });
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
                'w-75 p_relative center-container center_triangle_up center_triangle_down'
              }
            >
              <ImageSlider
                sliderId="0"
                initCallback={this.sliderInit.bind(this)}
                slideWidth={135}
                slides={this.sliderImages.map((elem) => {
                  const slide = {
                    url: elem.sft.isWallet
                      ? WalletLogo
                      : this.state.cards?.cards[elem.level].cards[
                          elem.index
                        ].url
                          .replace('{res}', '300')
                          .replace('.mp4', '.mp4.jpg') || '',
                  } as IMAGE_SLIDER_SLIDE;
                  return slide;
                })}
              />
            </div>

            {/* Card slider-2 */}
            <div className={'w-75 center-container pt-4'}>
              <div className={'slider-wrap-bar before_none after_none'}></div>
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
