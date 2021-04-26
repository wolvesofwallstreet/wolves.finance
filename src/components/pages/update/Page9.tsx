/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './glidejs/glide.core.min.css';
import './glidejs/glide.theme.min.css';
import './glideJs.css';

import GlideJS from '@glidejs/glide';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {Breakpoints, Controls} from '@glidejs/glide/dist/glide.modular.esm';
import Modal from 'components/theme/modal/Modal';
import React, {Fragment} from 'react';
import {TFunction, withTranslation} from 'react-i18next';
import {RouteComponentProps} from 'react-router-dom';

import IMG_ETH_WOWS_LP_TOKEN_500 from '../../../assets/eth_wows_lp_token-500.jpg';
import Logo from '../../../assets/logo.png';
import PageHeader from '../../theme/pageHeader/PageHeader';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

const Page9 = ({t, location, history}: PROPS) => {
  const [activeCard, setActiveCard] = React.useState<number>(0);
  const [show, setShow] = React.useState(false);

  const [barsInfo] = React.useState([
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
  ]);

  const initGlide = () => {
    new GlideJS('.images', {
      classes: {
        activeSlide: 'slider_active_slide',
      },
      gap: 10,
      peek: 10,
      type: 'slider', // carousel
      perView: 5,
      startAt: activeCard,
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
    }).mount({
      Controls,
      Breakpoints,
    });
  };

  // const cards = [
  //   {
  //     id: 1,
  //     title: 'WORK AS A PACK ! ',
  //     src: '',
  //     paragraphs: [
  //       `IN ORDER TO SAVE THE GAS COSTS INTERACTING WITH YEARN WE HAVE CREATED ANAUTOMATED BATCH SYSTEM. WE QUEUE AND COLLECT 4 GAS TRANSACTIONS BUT ONLY MAKE 1 TRANSACTION ON THE 5TH INVESTMENT`,
  //       `IF YOU WANT TO SAVE 70% GAS CLICK‘SMART INVEST - EARN GAS’. THE PACK STRNGTH NUMBER SHOWS THE CURRENT AMOUNT OF BOIS IN QUEUE`,
  //       `IF YOU DONT WANT TO WAIT, CLICK ‘DIRECT INVEST - EARN GAS’. THE AMOUNT DUE TO BE REFUNDED IN BOTH CASES IS SHOWN AS GAS REFUND.`,
  //     ],
  //   },
  // ];

  React.useEffect(() => {
    initGlide();
  });

  const setModalContent = (card: { [key: string]: string | number }) => {
    setShow(true);
  };

  return (
    <>
      <Modal
        show={show}
        setShow={setShow}
        content={
          <>
            <h2 className="tk-vincente-lightbold font-32 single-line m-4">
              WORK AS A PACK !
            </h2>
            <div className={'font-14 mt-2'}>
              <p>
                IN ORDER TO SAVE THE GAS COSTS INTERACTING WITH YEARN WE HAVE
                CREATED ANAUTOMATED BATCH SYSTEM. WE QUEUE AND COLLECT 4 GAS
                TRANSACTIONS BUT ONLY MAKE 1 TRANSACTION ON THE 5TH INVESTMENT.
              </p>

              <p>
                IF YOU WANT TO SAVE 70% GAS CLICK‘SMART INVEST - EARN GAS’. THE
                PACK STRNGTH NUMBER SHOWS THE CURRENT AMOUNT OF BOIS IN QUEUE,
              </p>

              <p>
                IF YOU DONT WANT TO WAIT, CLICK ‘DIRECT INVEST - EARN GAS’. THE
                AMOUNT DUE TO BE REFUNDED IN BOTH CASES IS SHOWN AS GAS REFUND.
              </p>
            </div>
          </>
        }
      />

      <div className={'wolves-container-fluid bg-flat2 text-white text-center'}>
        {/* Title & heading */}
        <div>
          <PageHeader
            heading="WELCOME TO THE YEARN CRV POOL"
            headingSecondry="CHOOSE YOUR CRYPTO FOLIO YOU WANT TO USE"
          />
        </div>

        {/* Card slider */}
        <div className={'slider-wrap-bar bg-transparent-orange'}>
          <div className={'wrap'}>
            <div className="images glide wolves-orange-border-t  wolves-orange-border-b">
              <div className="glide__track" data-glide-el="track">
                <ul className="glide__slides">
                  {[1, 2, 3, 4, 5].map((card, i) => {
                    return (
                      <Fragment key={i + Math.random()}>
                        <div
                          className="glide__slide"
                          onClick={() => {
                            setModalContent({card});
                            setActiveCard(i);
                          }}
                        >
                          <div className="slide-count"> {i} </div>
                          <img
                            className={
                              'responsive-img slide-img img-bryant_bark-300'
                            }
                            src="https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-300.jpg"
                            alt=""
                          />
                        </div>
                      </Fragment>
                    );
                  })}
                </ul>
              </div>
              <div className="glide__arrows" data-glide-el="controls">
                <button className="glide__arrow glide__arrow--left"
                        data-glide-dir="<"
                        style={{
                          ['--left' as string]: '-15%',
                        }}
                >
                  {/*<i className="fas fa-arrow-left"/>*/}
                </button>

                <button className="glide__arrow glide__arrow--right"
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
        <div className={'two-column-container w-80 center-container my-5'}>
          <div className={''}>
            <img
              className={'responsive-img'}
              src={IMG_ETH_WOWS_LP_TOKEN_500}
              alt={'IMG_ETH_WOWS_LP_TOKEN_500'}
              style={{maxWidth: '400px'}}
            />
          </div>

          <div className={'t-left mx-lg-5-5 px-lg-5'}>
            <h1 className={'f-vincente h-1'}> YEARN QUAD POOL </h1>

            {/* BarChar */}
            {barsInfo.map((bar, i) => {
              return (
                <Fragment key={i + Math.random()}>
                  {/* Orange Horizontal Bar */}
                  <div className=" d-flex justify-content-between p-3 bg-orange-trans">
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
                      20%
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

            {/* img + Title */}
            <div className={'d-flex align-items-center'}>
              <img src={Logo} alt="Logo" width="30px" height="30px"/>
              <span className="f-vincente font-24 ml-2">PACK STRENGTH : 3</span>
            </div>

            <div className={'d-flex '}>
              {/* left */}
              <div className={'w-100'}>
                <span className={'h-4 f-vincente '}>GAS YOU SAVE</span>
                <span className={'ml-5 f-light font-20'}>0.3 ETH</span>
                <button className={'w-100 m-0 mr-3 page5-btn-stack'}>
                  SMART INVEST - SAVE GAS
                </button>
              </div>

              {/* right */}
              <div className={'w-100 ml-3'}>
                <span className={'h-4 f-vincente '}>GAS REFUND</span>
                <span className={'ml-5 f-light font-20'}>0.24 ETH</span>
                <button className={'w-100 m-0 page5-btn-stack'}>
                  DIRECT INVEST - EARN GAS
                </button>
              </div>
            </div>

            <div className={'w-100 mt-3'}>
              WHAT DOES PACK STRENGTH MEAN AND HOW CAN I SAVE GAS?
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default withTranslation()(Page9);

/*
var style = { "--my-css-var": 10 } as React.CSSProperties;
return <div style={style}>...</div>
*/
