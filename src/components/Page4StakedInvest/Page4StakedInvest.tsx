/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import '../theme/glidejs/glide.core.min.css';
import '../theme/glidejs/glide.theme.min.css';
import '../theme/glidejs/glide_custom.css';
import './Page4StakedInvest.css';

import Glide, { Properties } from '@glidejs/glide';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Breakpoints, Controls } from '@glidejs/glide/dist/glide.modular.esm';
import React, { Fragment } from 'react';
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

type STATE = {
  input1: string;
  input2: string;
  currentImage: number;
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

  glide = new Glide('.page4sInvest-slider', {
    classes: {
      activeSlide: 'slider_active_slide',
    },
    gap: 35,
    peek: 10,
    type: 'slider', // carousel
    perView: 5,
    startAt: 0,
    focusAt: 'center',
    rewind: true,
    breakpoints: {
      1200: {
        perView: 5,
      },
      800: {
        perView: 2,
      },
      600: {
        perView: 2,
      },
    },
  });
  glideProperties = (this.glide as unknown) as Properties;

  constructor(props: PROPS) {
    super(props);
    this.state = {
      input1: 'ETH 2300',
      input2: 'ETH 2300',
      currentImage: 0,
    };
    this.onSFTState = this.onSFTState.bind(this);
    this._updateImages = this._updateImages.bind(this);
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
    this.glide.mount({
      Controls,
      Breakpoints,
    });
    StoreClasses.emitter.on(ASSETS_LOADED, this._updateImages);
    StoreClasses.emitter.on(SFT_STATE, this.onSFTState);
    this._updateImages();
  }

  componentWillUnmount() {
    StoreClasses.emitter.off(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.off(ASSETS_LOADED, this._updateImages);
    this.glideProperties.destroy();
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
    return (
      <>
        <div
          className={
            'page4sInvest-container-fluid  bg-flat2 text-white text-center'
          }
        >
          {/* Title & heading */}
          <div>
            <h2 className="tk-vincente-lightbold font-28 single-line">
              {'WOLF TRADE FLOOR - CHOOSE YOUR C-FOLIO TO STAKE WITH'}
            </h2>
            <h3 className="tk-grotesk-lightbold font-14">
              {'PICK YOUR HIGHEST LEVEL WORK TO STAKE '}
            </h3>
          </div>

          {/* Card slider */}
          <div className={'slider-wrap-bar bg-transparent-orange'}>
            <div className={'wrap'}>
              <div className="page4sInvest-slider glide-border-t glide-border-b">
                <div className="glide__track" data-glide-el="track">
                  <ul className="glide__slides">
                    {this.receiverImages.map((card, i) => {
                      return (
                        <Fragment key={'p4si' + i}>
                          <div
                            className="glide__slide"
                            onClick={() => {
                              this.glideProperties.go(`=${i}`);
                            }}
                          >
                            <div className="slide-count"> {i} </div>
                            <img
                              className={'responsive-img slide-img'}
                              src={
                                this.content
                                  ? this.content.cards[card.level].cards[
                                      card.index
                                    ].url.replace('{res}', '300')
                                  : ''
                              }
                              alt=""
                            />
                          </div>
                        </Fragment>
                      );
                    })}
                  </ul>
                </div>
                <div className="glide__arrows" data-glide-el="controls">
                  <button
                    className="glide__arrow glide__arrow--left"
                    data-glide-dir="<"
                    style={{
                      ['--left' as string]: '-15%',
                    }}
                  >
                    {/*<i className="fas fa-arrow-left"/>*/}
                  </button>

                  <button
                    className="glide__arrow glide__arrow--right"
                    data-glide-dir=">"
                    style={{
                      ['--right' as string]: '-15%',
                    }}
                  >
                    {/*<i className="fas fa-arrow-right"/>*/}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className={
              'page4sInvest-container page4sInvest-w-80 center-container my-5'
            }
          >
            <div className="d-flex align-items-center justify-content-around">
              <button
                className="arrow_left m-0 mr-3"
                onClick={() => handleImageChange(-1)}
              />
              <img
                className={'responsive-img'}
                src={this.investImages[this.state.currentImage]}
                alt={this.investImages[this.state.currentImage]}
                style={{ maxWidth: '500px' }}
              />
              <button
                className="arrow_right m-0 ml-3"
                onClick={() => handleImageChange(1)}
              />
            </div>

            <div className={'t-left mx-lg-5-5 px-lg-5'}>
              <h1 className={'tk-vincente h-1'}> WOLVES WOWS/ETH NFT </h1>

              <div className={'tk-grotesk-lightbold font-20 line-break-enable'}>
                <p>
                  Wall Street Hustler - He’s worked his way up from the actual
                  street. Learning the hustle on the street has given him the
                  perfect grounding for working the trade floor. Forget rough
                  diamond this trader is a blood diamond, and isnt afraid to
                  step on toes and ears to make the deals he needs.
                </p>
                <br />
                <p>
                  This is a staker card and allows to stake Wolf on the
                  tradefloor and also Raid. You can sell this character licence
                  at any point wither on our platform or on opensea
                </p>
              </div>

              <div className={'d-flex flex-wrap'}>
                {/* left */}
                <input
                  className={'page4sInvest-text-input font-14 mr-2 '}
                  name={'input1'}
                  id={'input1'}
                  onChange={(e) => this.setInput1(e.target.value)}
                  value={this.state.input1}
                />
                {/* Right */}
                <input
                  className={'page4sInvest-text-input font-14 mr-2 '}
                  name={'input2'}
                  id={'input2'}
                  onChange={(e) => this.setInput2(e.target.value)}
                  value={this.state.input2}
                />
              </div>

              <button
                className={
                  'mt-3 page4sInvest-text-input m-0 page4sInvest-btn-stack font-10'
                }
              >
                BUY STAKED ETH/WOWS NFT
              </button>
              <div className={''}></div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default withTranslation()(Page4StakedInvest);

/*
var style = { "--my-css-var": 10 } as React.CSSProperties;
return <div style={style}>...</div>
*/
