/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './NukaSlider.css';

import Carousel from 'nuka-carousel';
import React, { Fragment } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import { StoreClasses } from '../../stores/store';
import { CARDS } from '../types/cards';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type STATE = {
  input1: string;
  input2: string;
  currentImage: number;
  slideIndex?: number;
};

type IMAGE = { tokenId: number; level: number; index: number };

// Page 4 Stake Invest

class NukaSlider extends React.Component<PROPS, STATE> {
  receiverImages: IMAGE[] = [];
  investImages = [
    'https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-500.jpg',
    'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-500.mp4.jpg',
  ];
  content: CARDS | undefined = undefined;

  constructor(props: PROPS) {
    super(props);
    this.state = {
      input1: 'ETH 2300',
      input2: 'ETH 2300',
      currentImage: 0,
      slideIndex: 0,
    };
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
  }

  componentDidMount() {
    this._updateImages();
  }

  componentWillUnmount() {
    //
  }

  _updateImages() {
    const cards = StoreClasses.store.getAssets().cards;
    const tokenIds = StoreClasses.store.getAssets().userSFT;

    const newImages: IMAGE[] = [];
    tokenIds.forEach((elem) => {
      if (elem.isStockCard && elem.id.toNumber() >> 24 >= 4) {
        const tokenId = elem.id.toNumber();
        const newLevel = cards.cards.findIndex(
          (level) => level.chainRef === tokenId >> 24
        );
        const newIndex = cards.cards[newLevel].cards.findIndex(
          (card) => card.chainRef === ((tokenId >> 16) & 0xff)
        );
        newImages.push({ tokenId: tokenId, level: newLevel, index: newIndex });
      }
    });
    if (newImages !== this.receiverImages) {
      this.receiverImages = newImages;
      this.setCurrentImage(this.state.currentImage);
    }
    this.content = cards;
  }

  render(): JSX.Element {
    // const { slideIndex } = this.state;

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
              <div className="vw-80 position-relative glide-border-t glide-border-b center_triange_down center_triange_up">
                <div className="nuka_slider triange-margin-fixation">
                  <Carousel
                    // slideIndex={this.state.slideIndex}
                    afterSlide={(slideIndex: number) =>
                      this.setState({ slideIndex })
                    }
                  >
                    <img
                      src="https://via.placeholder.com/400/ffffff/c0392b/&text=slide1"
                      alt={'img-1'}
                    />
                    <img
                      src="https://via.placeholder.com/400/ffffff/c0392b/&text=slide2"
                      alt={'img-2'}
                    />
                    <img
                      src="https://via.placeholder.com/400/ffffff/c0392b/&text=slide3"
                      alt={'img-3'}
                    />
                    <img
                      src="https://via.placeholder.com/400/ffffff/c0392b/&text=slide4"
                      alt={'img-4'}
                    />
                    <img
                      src="https://via.placeholder.com/400/ffffff/c0392b/&text=slide5"
                      alt={'img-5'}
                    />
                    <img
                      src="https://via.placeholder.com/400/ffffff/c0392b/&text=slide6"
                      alt={'img-6'}
                    />
                  </Carousel>
                </div>
              </div>
            </div>
          </div>
        </>
      </>
    );
  }
}

export default withTranslation()(NukaSlider);
