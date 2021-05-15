/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Page9BoisBoardrooms.css';

import React, { Fragment } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';
import { ASSETS_LOADED, SFT_STATE } from '../../stores/constants';
import { SFTStateresult, StoreClasses } from '../../stores/store';
import {
  IMAGE_SLIDER_INTERFACE,
  IMAGE_SLIDER_SLIDE,
  ImageSlider,
} from '../controls/image_slider';
import { CARDS } from '../types/cards';
import Modal from './Page9Modal';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type ObjType = { [key: string]: string };
type BarInfoType = {
  name: string | number;
  value: string | number;
  slideIndex?: number;
  imgSlides?: ObjType[];
  [key: string]: unknown;
};

type STATE = {
  barsInfo: BarInfoType[];
  show: boolean;
  currentImage: number;
  slideIndex?: number;
  imgSlides?: ObjType[];
  [key: string]: unknown;
};

type IMAGE = { tokenId: number; level: number; index: number };

// Page 4 Stake Invest
class Page9BoisBoardrooms extends React.Component<PROPS, STATE> {
  receiverImages: IMAGE[] = [];
  investImages = [
    'https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-500.jpg',
    'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-500.mp4.jpg',
  ];

  content: CARDS | undefined = undefined;
  sliderInterface: IMAGE_SLIDER_INTERFACE | undefined = undefined;

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
      slideIndex: 0,
      imgSlides: [],
      show: false,
    };
    this.toggleModal = this.toggleModal.bind(this);
    this.onSFTState = this.onSFTState.bind(this);
    this._updateImages = this._updateImages.bind(this);
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
  }

  toggleModal() {
    this.setState({ ...this.state, show: !this.state.show });
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
    const cards = StoreClasses.store.getAssets().cards;
    const tokenIds = StoreClasses.store.getAssets().userSFT;

    const newImages: IMAGE[] = [];
    tokenIds.forEach((elem) => {
      if (elem.isStockCard && elem.id.toNumber() >> 24 < 4) {
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

  sliderInit(id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) {
    this.sliderInterface = iface;
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
              className={
                'd-flex justify-content-center bg-transparent-orange mb-3 '
              }
            >
              <div className={'p_relative'}>
                <button
                  onClick={() => this.sliderInterface?.prev()}
                  className={'slide__arrow slide__arrow--left slide__arrows'}
                >
                  {'<'}
                </button>
                <div className="vw-80 py-3  border_thin_t border_thin_b p_relative center_triangle_up center_triangle_down">
                  <ImageSlider
                    sliderId="0"
                    initCallback={this.sliderInit.bind(this)}
                    onSlideChanged={(index) => {
                      if (index !== this.state.slideIndex)
                        this.setState({ slideIndex: index });
                    }}
                    slideWidth={135}
                    // slides={this.receiverImages.map((elem) => {
                    //   const slide = {
                    //     url:
                    //       this.content?.cards[elem.level].cards[
                    //         elem.index
                    //       ].url.replace('{res}', '300') || '',
                    //   } as IMAGE_SLIDER_SLIDE;
                    //   return slide;
                    // })}
                    slides={Array(5)
                      .fill(null)
                      .map(
                        (elem, i) =>
                          ({
                            url: `https://reqres.in/img/faces/${
                              1 + i
                            }-image.jpg`,
                            count: i,
                          } as IMAGE_SLIDER_SLIDE)
                      )}
                  />
                </div>
                <button
                  onClick={() => this.sliderInterface?.next()}
                  className={'slide__arrow slide__arrow--right slide__arrows'}
                >
                  {'>'}
                </button>
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
                    className={
                      'wolve_btn w-100 m-0 mr-3 page9-btn-stack text-nowrap'
                    }
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
                  <button
                    className={
                      'wolve_btn w-100 m-0 page9-btn-stack text-nowrap'
                    }
                  >
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

export default withTranslation()(Page9BoisBoardrooms);

/*
var style = { "--my-css-var": 10 } as React.CSSProperties;
return <div style={style}>...</div>
*/
