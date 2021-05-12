/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Page4StakedInvest.css';

import Carousel from 'nuka-carousel';
import React from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import { ASSETS_LOADED, SFT_STATE } from '../../stores/constants';
import { SFTStateresult, StoreClasses } from '../../stores/store';
import { CARDS } from '../types/cards';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type ObjType = { [key: string]: string };
type STATE = {
  input1: string;
  input2: string;
  currentImage: number;
  slideIndex?: number;
  imgSlides?: ObjType[];
  [key: string]: unknown;
};

type IMAGE = { tokenId: number; level: number; index: number };

// Page 4 Stake Invest

class Page4StakedInvest extends React.Component<PROPS, STATE> {
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
      slidesToShow: 5,
    };
    this.onSFTState = this.onSFTState.bind(this);
    this._updateImages = this._updateImages.bind(this);
    this.fetchData = this.fetchData.bind(this);
  }

  setInput1(val: string) {
    this.setState({ input1: val });
  }

  setInput2(val: string) {
    this.setState({ input2: val });
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
  }

  componentDidMount() {
    this.fetchData();
    StoreClasses.emitter.on(ASSETS_LOADED, this._updateImages);
    StoreClasses.emitter.on(SFT_STATE, this.onSFTState);
    this._updateImages();
  }

  componentWillUnmount() {
    StoreClasses.emitter.off(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.off(ASSETS_LOADED, this._updateImages);
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

  onSFTState(result: SFTStateresult) {
    if (result.status === 'user') this._updateImages();
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
    const handleImageChange = (change: number) => {
      if (this.state.currentImage + change < 0) {
        return this.setCurrentImage(this.investImages.length - 1);
      }

      if (this.state.currentImage + change >= this.investImages.length) {
        return this.setCurrentImage(0);
      }

      return this.setCurrentImage(this.state.currentImage + change);
    };

    const { imgSlides = [] } = this.state;
    let slides = null;
    if (imgSlides.length) {
      slides = imgSlides.map((elem, index) => {
        const { avatar = '' } = elem;
        return (
          <div key={'n_slide' + index} className={'nuka_slide'}>
            <div
              className="slide_test__img_container"
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

            {/* Card slider */}
            <div
              className={
                'd-flex justify-content-center bg-transparent-orange mb-3 '
              }
            >
              <div className="vw-80 py-2 glide-border-t glide-border-b p_relative center_triange_down center_triange_up">
                <div className="nuka_slider">
                  <Carousel
                    wrapAround
                    swiping
                    cellAlign="center"
                    cellSpacing={30}
                    slideIndex={this.state.slideIndex}
                    slideWidth="120px"
                    renderCenterLeftControls={({ previousSlide }) => (
                      <div className="slide__arrows">
                        <button
                          className={`slide__arrow slide__arrow--left`}
                          onClick={previousSlide}
                        />
                      </div>
                    )}
                    renderCenterRightControls={({ nextSlide }) => (
                      <div className="slide__arrows">
                        <button
                          className={`slide__arrow slide__arrow--right`}
                          onClick={nextSlide}
                        />
                      </div>
                    )}
                    afterSlide={(slideIndex) => {
                      this.setState({ slideIndex });
                    }}
                  >
                    {slides}
                  </Carousel>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className={'page4sInvest-container center-container my-5'}>
              <div className="d-flex align-items-center justify-content-even mb-3">
                <button
                  className="arrow_left m-0 mr-2"
                  onClick={() => handleImageChange(-1)}
                />
                <img
                  className={'w-80'}
                  src={this.investImages[this.state.currentImage]}
                  alt={this.investImages[this.state.currentImage]}
                  style={{ maxWidth: '500px' }}
                />
                <button
                  className="arrow_right m-0 ml-2"
                  onClick={() => handleImageChange(1)}
                />
              </div>

              <div className={'t-left'}>
                <h1 className={'tk-vincente h-1'}> WOLVES WOWS/ETH NFT </h1>

                <div
                  className={'tk-grotesk-lightbold font-16 line-break-enable'}
                >
                  <p>
                    Wall Street Hustler - He’s worked his way up from the actual
                    street. Learning the hustle on the street has given him the
                    perfect grounding for working the trade floor. Forget rough
                    diamond this trader is a blood diamond, and isnt afraid to
                    step on toes and ears to make the deals he needs.
                  </p>
                  <p>
                    This is a staker card and allows to stake Wolf on the
                    tradefloor and also Raid. You can sell this character
                    licence at any point wither on our platform or on opensea
                  </p>
                </div>

                <div className={'d-flex'}>
                  <div className="d-flex justify-content-between px-3 py-2 font-14 border-white-thin bg-orange-transparent ">
                    <p className={'m-0'}> BUY MAX </p>
                    <p className={'m-0 bold'}> WOWS/ETH LP </p>
                  </div>
                </div>

                <div className="d-flex justify-content-end mt-1 font-13">
                  BUY V.2 ETH/WOWS LP TOKENS HERE
                </div>

                <button
                  className={
                    'wolve_btn page4sInvest-text-input mt-3 m-0 page4sInvest-btn-stack font-10'
                  }
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
