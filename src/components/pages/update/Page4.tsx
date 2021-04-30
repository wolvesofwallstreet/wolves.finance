/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './../../theme/glidejs/glide.core.min.css';
import './../../theme/glidejs/glide.theme.min.css';
import './../../theme/glidejs/glide_custom.css';

import GlideJS from '@glidejs/glide';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Breakpoints, Controls } from '@glidejs/glide/dist/glide.modular.esm';
import React, { Fragment } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import IMG_BRYANT_500 from '../../../assets/bryant_bark_500.jpg';
import IMG_ETH_WOWS_LP_TOKEN_GREEN_500 from '../../../assets/wolfd_app_devs_flat2_136_500.jpg';
import IMG_ETH_WOWS_LP_TOKEN_BLUE_500 from '../../../assets/wolfd_app_devs_flat231_300.jpg';
import PageHeader from '../../theme/pageHeader/PageHeader';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

const Page4 = ({ t, location, history }: PROPS) => {
  const [input1, setInput1] = React.useState('ETH 2300');
  const [input2, setInput2] = React.useState('ETH 2300');
  const [images /*setImages*/] = React.useState([
    IMG_ETH_WOWS_LP_TOKEN_GREEN_500,
    IMG_ETH_WOWS_LP_TOKEN_BLUE_500,
    IMG_BRYANT_500,
  ]);
  const [currentImage, setCurrentImage] = React.useState(0);

  const initGlide = () => {
    new GlideJS('.page4-slider', {
      classes: {
        activeSlide: 'slider_active_slide',
      },
      gap: 35,
      peek: 10,
      type: 'slider', // carousel
      perView: 5,
      startAt: 1,
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

  React.useEffect(() => {
    initGlide();
  });

  React.useEffect(() => {
    console.log('Page4 72 currentImage ', currentImage);
  }, [currentImage]);

  const handleImageChange = (change: number) => {
    if (currentImage + change < 0) {
      return setCurrentImage(images.length - 1);
    }

    if (currentImage + change >= images.length) {
      return setCurrentImage(0);
    }

    return setCurrentImage(currentImage + change);
  };

  return (
    <>
      <div className={'wolves-container-fluid bg-flat2 text-white text-center'}>
        {/* Title & heading */}
        <div>
          <PageHeader
            heading="WOLF TRADE FLOOR - CHOOSE YOUR C-FOLIO TO STAKE WITH"
            headingSecondry="PICK YOUR HIGHEST LEVEL WORK TO STAKE"
          />
        </div>

        {/* Card slider */}
        <div className={'slider-wrap-bar bg-transparent-orange'}>
          <div className={'wrap'}>
            <div className="page4-slider wolves-orange-border-t wolves-orange-border-b">
              <div className="glide__track" data-glide-el="track">
                <ul className="glide__slides">
                  {[1, 2, 3, 4, 5].map((card, i) => {
                    return (
                      <Fragment key={i + Math.random()}>
                        <div className="glide__slide">
                          <div className="slide-count"> {i} </div>
                          <img
                            className={
                              'responsive-img slide-img img-bryant_bark-300'
                            }
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
        <div className={'two-column-container w-80 center-container my-5'}>
          <div className="d-flex align-items-center justify-content-around">
            <button
              className="arrow_left m-0 mr-3"
              onClick={() => handleImageChange(-1)}
            />
            <img
              className={'responsive-img'}
              src={images[currentImage]}
              alt={images[currentImage]}
              style={{ maxWidth: '500px' }}
            />
            <button
              className="arrow_right m-0 ml-3"
              onClick={() => handleImageChange(1)}
            />
          </div>

          <div className={'t-left mx-lg-5-5 px-lg-5'}>
            <h1 className={'f-vincente h-1'}> WOLVES WOWS/ETH NFT </h1>

            <div className={'tk-grotesk-lightbold font-20 line-break-enable'}>
              <p>
                Wall Street Hustler - He’s worked his way up from the actual
                street. Learning the hustle on the street has given him the
                perfect grounding for working the trade floor. Forget rough
                diamond this trader is a blood diamond, and isnt afraid to step
                on toes and ears to make the deals he needs.
              </p>
              <br />
              <p>
                This is a staker card and allows to stake Wolf on the tradefloor
                and also Raid. You can sell this character licence at any point
                wither on our platform or on opensea
              </p>
            </div>

            <div className={'d-flex flex-wrap'}>
              {/* left */}
              <input
                className={'page4-text-input font-14 mr-2 '}
                name={'input1'}
                id={'input1'}
                onChange={(e) => setInput1(e.target.value)}
                value={input1}
              />
              {/* Right */}
              <input
                className={'page4-text-input font-14 mr-2 '}
                name={'input2'}
                id={'input2'}
                onChange={(e) => setInput2(e.target.value)}
                value={input2}
              />
            </div>

            <div className={'w-80 mt-3'}>
              <button className={'m-0 page5-btn-stack'}>
                BUY STAKED ETH/WOWS NFT
              </button>
            </div>

            {/*<div className="d-flex w-100">*/}
            {/*  <button className={'w-25 m-0 page5-btn-stack'}>*/}
            {/*    DIRECT INVEST - EARN GAS*/}
            {/*  </button>*/}
            {/*</div>*/}
          </div>
        </div>
      </div>
    </>
  );
};

export default withTranslation()(Page4);

/*
var style = { "--my-css-var": 10 } as React.CSSProperties;
return <div style={style}>...</div>
*/
