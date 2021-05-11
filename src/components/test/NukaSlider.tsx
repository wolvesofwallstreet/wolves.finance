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

type AnyObjType = { [key: string]: string };

type STATE = {
  input1: string;
  input2: string;
  currentImage: number;
  slideIndex?: number;
  imgSlides: AnyObjType[];
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
      imgSlides: [],
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

  fetchData() {
    fetch('https://reqres.in/api/users?page=2')
      .then((res) => res.json().then((r) => r))
      .then((res) => {
        this.setState({
          ...this.state,
          imgSlides: res.data,
        });
      });
  }

  render(): JSX.Element {
    // const { slideIndex } = this.state;
    const colors = ['7732bb', '047cc0', '00884b', 'e3bc13', 'db7c00'];
    const slides = [...colors, ...colors.slice(1, 2)].map((color, index) => (
      <img
        src={`https://via.placeholder.com/400/${color}/ffffff/&text=slide${
          index + 1
        }`}
        alt={`Slide ${index + 1}`}
        key={color}
        style={{
          width: '100%',
          height: '150px',
        }}
        onClick={() => {
          this.setState({ slideIndex: index });
        }}
      />
    ));

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

            {/* <button onClick={() => goToSlide(1)}>go to SLide</button> */}

            {/* Card slider */}
            <div
              className={
                'd-flex justify-content-center bg-transparent-orange mb-3 '
              }
            >
              <div className="vw-80 position-relative glide-border-t glide-border-b center_triange_down center_triange_up">
                <div className="nuka_slider d-flex">
                  <Carousel
                    wrapAround
                    cellAlign="center"
                    cellSpacing={20}
                    slidesToShow={5}
                    slideIndex={this.state.slideIndex}
                    afterSlide={(slideIndex) => {
                      this.setState({ slideIndex });
                    }}
                  >
                    {slides}
                    {[].map((slide, index) => {
                      <img
                        key={Math.random() + index}
                        src={`'`}
                        alt={`Slide ${index + 1}`}
                        onClick={() => {
                          this.setState({ slideIndex: index });
                        }}
                        style={{
                          width: '100%',
                          height: '150px',
                        }}
                      />;
                    })}
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
