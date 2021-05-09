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

// Page 4

class Page4StakedInvest extends React.Component<PROPS, STATE> {
  images = [
    'https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-500.jpg',
    'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-500.mp4.jpg',
  ];

  glide = new Glide('.page4sInvest-slider-1', {
    classes: {
      activeSlide: 'slider_active_slide',
    },
    gap: 23,
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
      1000: {
        perView: 4,
      },
      900: {
        perView: 3,
      },
      800: {
        perView: 3,
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
  }

  componentWillUnmount() {
    this.glideProperties.destroy();
  }

  render(): JSX.Element {
    const handleImageChange = (change: number) => {
      if (this.state.currentImage + change < 0) {
        return this.setCurrentImage(this.images.length - 1);
      }

      if (this.state.currentImage + change >= this.images.length) {
        return this.setCurrentImage(0);
      }

      return this.setCurrentImage(this.state.currentImage + change);
    };
    return (
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
            className={'d-flex justify-content-center bg-transparent-orange '}
          >
            <div className="vw-80 position-relative glide-border-t glide-border-b pg4_triange_down pg4_triange_up">
              <div className="page4sInvest-slider-1 triange-margin-fixation">
                <div className="glide__track" data-glide-el="track">
                  <ul className="glide__slides">
                    {[1, 2, 3, 4, 5].map((card, i) => {
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
                              src="https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg"
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
                      ['--left' as string]: '0%',
                    }}
                  >
                    {/*<i className="fas fa-arrow-left"/>*/}
                  </button>

                  <button
                    className="glide__arrow glide__arrow--right"
                    data-glide-dir=">"
                    style={{
                      ['--right' as string]: '-0%',
                    }}
                  >
                    {/*<i className="fas fa-arrow-right"/>*/}
                  </button>
                </div>
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
                src={this.images[this.state.currentImage]}
                alt={this.images[this.state.currentImage]}
                style={{ maxWidth: '500px' }}
              />
              <button
                className="arrow_right m-0 ml-2"
                onClick={() => handleImageChange(1)}
              />
            </div>

            <div className={'t-left'}>
              <h1 className={'tk-vincente h-1'}> WOLVES WOWS/ETH NFT </h1>

              <div className={'tk-grotesk-lightbold font-16 line-break-enable'}>
                <p>
                  Wall Street Hustler - He’s worked his way up from the actual
                  street. Learning the hustle on the street has given him the
                  perfect grounding for working the trade floor. Forget rough
                  diamond this trader is a blood diamond, and isnt afraid to
                  step on toes and ears to make the deals he needs.
                </p>
                <p>
                  This is a staker card and allows to stake Wolf on the
                  tradefloor and also Raid. You can sell this character licence
                  at any point wither on our platform or on opensea
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
                  'page4sInvest-text-input mt-3 m-0 page4sInvest-btn-stack font-10'
                }
              >
                BUY STAKED ETH/WOWS NFT
              </button>
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
