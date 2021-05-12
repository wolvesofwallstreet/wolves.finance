/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './NukaSlider.css';
import './triangles.css';

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
    this.fetchData = this.fetchData.bind(this);
    this.renderSlideButtons = this.renderSlideButtons.bind(this);
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
  }

  componentDidMount() {
    this._updateImages();
    this.fetchData();
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
        this.receiverImages = res.data;
      });
  }

  renderSlideButtons(
    cb: React.MouseEventHandler<HTMLButtonElement> | undefined,
    arrow_direction = 'right'
  ) {
    return (
      <div className="slide__arrows">
        <button
          className={`glide__arrow glide__arrow--${arrow_direction}`}
          onClick={cb}
        ></button>
      </div>
    );
  }

  render(): JSX.Element {
    const { imgSlides } = this.state;
    let slides = null;
    if (imgSlides.length) {
      slides = imgSlides.map((elem, index) => {
        const { avatar = '' } = elem;
        return (
          <div key={Math.random() + index} className={'nuka_slide'}>
            <div
              className="glide__slide_test__img_container"
              style={{
                ['--url' as string]: `url(${avatar}`,
              }}
              onClick={() => this.setState({ slideIndex: index })}
            >
              <div className="slide_count">{index}</div>
            </div>
          </div>
        );
      });
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
              <div className="vw-80 py-2 glide-border-t glide-border-b p_relative center_triange_down center_triange_up">
                <div className="nuka_slider ">
                  <Carousel
                    wrapAround
                    swiping
                    cellAlign="center"
                    cellSpacing={10}
                    slidesToShow={5}
                    slideIndex={this.state.slideIndex}
                    renderCenterLeftControls={({ previousSlide }) =>
                      this.renderSlideButtons(previousSlide, 'left')
                    }
                    renderCenterRightControls={({ nextSlide }) =>
                      this.renderSlideButtons(nextSlide)
                    }
                    afterSlide={(slideIndex) => {
                      this.setState({ slideIndex });
                    }}
                  >
                    {slides}
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
