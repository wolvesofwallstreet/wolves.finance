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
import './Page9BoisBoardrooms.css';

import Glide, { Properties } from '@glidejs/glide';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Breakpoints, Controls } from '@glidejs/glide/dist/glide.modular.esm';
import React, { Fragment } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';
import { CARDS } from '../types/cards';
import Modal from './Page9Modal';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type BarInfoType = {
  name: string | number;
  value: string | number;
};

type STATE = {
  barsInfo: BarInfoType[];
  currentImage: number;
  show: boolean;
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

  glide = new Glide('.page9-slider', {
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
      barsInfo: [
        {
          name: 'DAI-MAX',
          value: '24.00000',
        },
        {
          name: 'TUSD-MAX',
          value: '0.000000',
        },
        {
          name: 'USDC-MAX',
          value: '0.000000',
        },
        {
          name: 'USDT-MAX',
          value: '34.00000',
        },
      ],
      currentImage: 0,
      show: false,
    };
    this.toggleModal = this.toggleModal.bind(this);
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
  }

  toggleModal() {
    this.setState({ ...this.state, show: !this.state.show });
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
        return this.setCurrentImage(this.investImages.length - 1);
      }

      if (this.state.currentImage + change >= this.investImages.length) {
        return this.setCurrentImage(0);
      }

      return this.setCurrentImage(this.state.currentImage + change);
    };
    const { barsInfo, show: modal } = this.state;
    return (
      <>
        <Modal
          show={modal}
          setShow={this.toggleModal}
          content={
            <>
              <h2 className="tk-vincente-lightbold font-32 single-line m-4">
                WORK AS A PACK
              </h2>
              <div className={'font-14 mt-2'}>
                <p>
                  IN ORDER TO SAVE THE GAS COSTS INTERACTING WITH YEARN WE HAVE
                  CREATED ANAUTOMATED BATCH SYSTEM. WE QUEUE AND COLLECT 4 GAS
                  TRANSACTIONS BUT ONLY MAKE 1 TRANSACTION ON THE 5TH INVESTMENT
                </p>
                <p>
                  IF YOU WANT TO SAVE 70% GAS CLICK‘SMART INVEST - EARN GAS’.
                  THE PACK STRNGTH NUMBER SHOWS THE CURRENT AMOUNT OF BOIS IN
                  QUEUE
                </p>
                <p>
                  IF YOU DONT WANT TO WAIT, CLICK ‘DIRECT INVEST - EARN GAS’.
                  THE AMOUNT DUE TO BE REFUNDED IN BOTH CASES IS SHOWN AS GAS
                  REFUND.
                </p>
              </div>
            </>
          }
        />

        <div
          className={
            'flex-column justify-content-center bg-flat2 text-white text-center '
          }
        >
          {/* Title & heading */}
          <div>
            <img src={Logo} alt="Logo" width="50px" height="50px" />
            <h2 className="tk-vincente-lightbold font-28 single-line mt-1">
              {'WELCOME TO THE YEARN CRV POOL'}
            </h2>
            <h3 className="tk-grotesk-lightbold font-14">
              {'CHOOSE YOUR CRYPTOFOLIO YOU WANT TO USE'}
            </h3>
          </div>

          {/* Card slider */}
          <div
            className={'d-flex justify-content-center bg-transparent-orange '}
          >
            <div className="vw-80 position-relative glide-border-t glide-border-b center_triange_up center_triange_down">
              <div className="page9-slider triange-margin-fixation">
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
          <div
            className={
              'd-flex page9-two-column-container center-container my-5'
            }
          >
            {/* Left-side img */}
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

            {/* right-side content,bar charts */}
            <div className={'t-left px-1'}>
              <h1 className={'tk-vincente '}> YEARN QUAD POOL </h1>

              {/* BarChar */}
              <div>
                {barsInfo.map((bar, i) => {
                  return (
                    <Fragment key={i + Math.random()}>
                      {/* Orange Horizontal Bar */}
                      <div className="page9-border-thin bg-orange-transparent d-flex justify-content-between px-3 py-2 font-14">
                        <p className={'m-0'}> {bar.name} </p>
                        <p className={'m-0 bold'}>{bar.value}</p>
                      </div>

                      {/* Bar percentage chart, based on barDivisions */}
                      <div className="page9-bar-chart">
                        <div
                          className="tick"
                          style={{
                            ['--percentage' as string]: '0%',
                          }}
                        >
                          0%
                        </div>
                        <div
                          className="tick"
                          style={{
                            ['--percentage' as string]: '25%',
                          }}
                        >
                          25%
                        </div>
                        <div
                          className="tick"
                          style={{
                            ['--percentage' as string]: '50%',
                          }}
                        >
                          50%
                        </div>
                        <div
                          className="tick"
                          style={{
                            ['--percentage' as string]: '75%',
                          }}
                        >
                          75%
                        </div>
                        <div
                          className="tick"
                          style={{
                            ['--percentage' as string]: '100%',
                          }}
                        >
                          100%
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>

              {/* img + Title */}
              <div className={'d-flex align-items-center'}>
                <img src={Logo} alt="Logo" width="30px" height="30px" />
                <span className="tk-vincente font-24 ml-2">
                  PACK STRENGTH : 3
                </span>
              </div>

              <div className={'row p-2'}>
                {/* left */}
                <div className={'col p-1 '}>
                  <span className={'font-22 tk-vincente text-nowrap'}>
                    GAS YOU SAVE
                  </span>
                  <span className={'ml-5 f-light font-20 text-nowrap'}>
                    0.3 ETH
                  </span>
                  <button
                    className={'w-100 m-0 mr-3 page9-btn-stack text-nowrap'}
                  >
                    SMART INVEST - SAVE GAS
                  </button>
                </div>

                {/* right */}
                <div className={'col p-1'}>
                  <span className={'font-22 tk-vincente text-nowrap'}>
                    GAS REFUND
                  </span>
                  <span className={'font-20 f-light ml-5 text-nowrap'}>
                    0.24 ETH
                  </span>
                  <button className={'w-100 m-0 page9-btn-stack text-nowrap'}>
                    DIRECT INVEST - EARN GAS
                  </button>
                </div>
              </div>

              <div className={'w-100 mt-1 font-13'} onClick={this.toggleModal}>
                WHAT DOES PACK STRENGTH MEAN AND HOW CAN I SAVE GAS?
              </div>
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
