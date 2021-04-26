/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import GlideJS from "@glidejs/glide";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {Breakpoints, Controls} from "@glidejs/glide/dist/glide.modular.esm";
import React, {Fragment, useState} from "react";
import {TFunction, withTranslation} from 'react-i18next';
import {RouteComponentProps} from 'react-router-dom';

import ETH_WOWS_GREEN_CARD from '../../../assets/wolfd_app_devs_flat2_136_300.jpg'
import ETH_WOWS_BLUE_CARD from '../../../assets/wolfd_app_devs_flat231_300.jpg'


type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

function Page12({t}: PROPS) {
  const [slider1Cards, /*setSlider1Cards*/] = useState([
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
    },
    {
      id: Math.random(),
      title: 'BRYANT',
      src: 'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4.jpg',
      count: 3
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      count: 1
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      type: 'blank_box',
      boxTitle: 'OPEN WALLET'
    },
  ]);
  const [slider2Cards, /*setSlider2Cards*/] = useState([
    {
      id: Math.random(),
      title: 'MOBILE UPGRADE',
      src: ETH_WOWS_GREEN_CARD,
      checked: true,
    },
    {
      id: Math.random(),
      title: 'YEARN DAI / USDC',
      src: ETH_WOWS_BLUE_CARD,
      checked: true,
    },
    {
      id: Math.random(),
      title: 'YEARN USDT',
      src: ETH_WOWS_GREEN_CARD,
      checked: false,
    },
  ]);
  const [slider3Cards, /*setSlider3Cards*/] = useState([
    {
      id: Math.random(),
      title: 'WOWS_BLUE',
      src: ETH_WOWS_BLUE_CARD,
    },
    {
      id: Math.random(),
      title: 'BRYANT',
      src: 'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4.jpg',
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
    },
    {
      id: Math.random(),
      title: 'OPEN WALLET',
      src: '',
      type: 'blank_box',
      boxTitle: 'OPEN WALLET'
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
    },
  ]);

  const initGlide = () => {

    // Slider-1
    new GlideJS('.slider-1', {
      classes: {
        activeSlide: 'slider_active_slide',
      },
      gap: 10,
      peek: 10,
      type: 'slider', // carousel
      perView: 6,
      startAt: 2,
      focusAt: 'center',
      rewind: true,
      breakpoints: {
        1200: {
          perView: 6,
        },
        900: {
          perView: 3,
        },
        800: {
          perView: 2,
        },
        600: {
          perView: 2,
        },
        400: {
          perView: 2,
        },
      },
    }).mount({
      Controls,
      Breakpoints,
    });

    // Slider-2
    new GlideJS('.slider-2', {
      classes: {
        activeSlide: 'slider_active_slide',
      },
      gap: 15,
      peek: 10,
      type: 'slider', // carousel
      perView: 5,
      // startAt: 1,
      focusAt: 'center',
      rewind: true,
      breakpoints: {
        1200: {
          perView: 6,
        },
        800: {
          perView: 2,
        },
        600: {
          perView: 2,
        },
        400: {
          perView: 2,
        },
      },
    }).mount({
      Controls,
      Breakpoints,
    });

    // Slider-3
    new GlideJS('.slider-3', {
      classes: {
        activeSlide: 'slider_active_slide',
      },
      gap: 20,
      peek: 10,
      type: 'slider', // carousel
      perView: 7,
      startAt: 3,
      focusAt: 'center',
      rewind: true,
      breakpoints: {
        1200: {
          perView: 7,
        },
        800: {
          perView: 4,
        },
        600: {
          perView: 3,
        },
        400: {
          perView: 2,
        },
      },
    }).mount({
      Controls,
      Breakpoints,
    });

  };

  const SliderCardBox = ({id, src, count = -1, title = 'thumb'}) => {
    return (
      <Fragment key={id + Math.random()}>
        <div className="glide__slide">
          {count > -1 && <div className="slide-count"> {count} </div>}
          <img className={'responsive-img slide-img'} src={src} alt={title + '-img'}/>
        </div>
      </Fragment>
    )
  }

  const BlackBox = ({boxTitle}) => (
    <Fragment>
      <div className="glide__slide">
        <div className={'glide__slide_custom_box d-flex justify-content-center font-10 font-weight-bold'}>
          {boxTitle}
        </div>
      </div>
    </Fragment>
  )

  React.useEffect(() => {
    initGlide();
  });

  return (
    <>
      <div className={'w-container bg-wolves text-white'}>

        <div className="">
          <div>
            <h2 className="tk-vincente-lightbold font-32 single-line">WELCOME TO YOUR C-FOLIO TRANSFER MANAGER</h2>
            <h3 className="tk-vincente-lightbold">MANAGE YOUR ASSETS WITH MULTI TRANSACTIONS IN ONE.</h3>
          </div>
        </div>

        <div className={'d-flex flex-column bg-blue-transparent wolves-orange-border font-16 px-5 py-4 my-2 mt-3'}>
          {/* Card slider-1 */}
          <div className={'w-75 center-container'}>
            <div className={'slider-wrap-bar before_none after_none'}>
              <div className={'wrap'} style={{maxWidth: '950px'}}>
                <div className="slider-1 images glide">
                  <div className="glide__track" data-glide-el="track">
                    <ul className="glide__slides">
                      {slider1Cards.map((card, i) => {
                        if (card.type === 'blank_box') {
                          return (<BlackBox  {...card}/>)
                        }
                        return (<SliderCardBox {...card}/>)
                      })}
                    </ul>
                  </div>
                  <div className="glide__arrows" data-glide-el="controls">
                    <button className="glide__arrow glide__arrow--left"
                            data-glide-dir="<"
                            style={{
                              ['--left' as string]: '-13%',
                            }}
                    >
                      {/*<i className="fas fa-arrow-left"/>*/}
                    </button>

                    <button className="glide__arrow glide__arrow--right"
                            data-glide-dir=">"
                            style={{
                              ['--right' as string]: '-13%',
                            }}
                    >
                      {/*<i className="fas fa-arrow-right"/>*/}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card slider-2 */}
          <div className={'w-75 center-container pt-4'}>
            <div className={'slider-wrap-bar before_none after_none'}>
              <div className={'wrap'}>
                <div className="slider-2 glide">
                  <div className="glide__track" data-glide-el="track">
                    <ul className="glide__slides">

                      {slider2Cards.map((card, i) => {
                        const {id, title, src, checked} = card
                        return (
                          <Fragment key={i + Math.random()}>
                            <div className="glide__slide d-flex flex-column align-items-center">
                              <h5 className={'font-13 font-weight-normal'}> {title} </h5>
                              <img className={'responsive-img'} style={{width: '85px', height: '100px'}} src={src} alt={'img-' + title}/>
                              <br/>
                              <span className={'font-13 font-weight-bold'}>
                              <label className="control mt-2 control-checkbox" form={`slide-${id}`}>
                                  SELECT
                                  <input type="checkbox" id={`slide-${id}`} name={`slide-${id}`} defaultChecked={checked}/>
                                  <div className="control_indicator"/>
                              </label>
                              </span>
                            </div>
                          </Fragment>
                        )
                      })}

                    </ul>
                  </div>
                  <div className="glide__arrows" data-glide-el="controls">
                    <button className="glide__arrow glide__arrow--left"
                            data-glide-dir="<"
                            style={{
                              ['--left' as string]: '-30%',
                            }}
                    >
                      {/*<i className="fas fa-arrow-left"/>*/}
                    </button>

                    <button className="glide__arrow glide__arrow--right"
                            data-glide-dir=">"
                            style={{
                              ['--right' as string]: '-30%',
                            }}
                    >
                      {/*<i className="fas fa-arrow-right"/>*/}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* H-line */}
          <div className={'h-line'}/>

          {/* center btn, arrow */}
          <div className={'center-container d-flex flex-column justify-content-center align-items-center'}>
            <button className={'w-100 m-0 mr-3 my-2 px-6 py-2 font-13 page5-btn-stack'}>
              MULTI TRANSFER
            </button>
            <div className={'arrow_down mt-2'}/>
          </div>

          {/* H-line */}
          <div className={'h-line'}/>

          {/* Card slider-3 */}
          <div className={'w-100 center-container'}>
            <div className={'slider-wrap-bar before_none after_none'}>
              <div className={'wrap'} style={{maxWidth: '1000px'}}>
                <div className="slider-3 images glide">
                  <div className="glide__track" data-glide-el="track">
                    <ul className="glide__slides">
                      {slider3Cards.map((card, i) => {
                        return (card.type === 'blank_box') ?
                          <BlackBox {...card}/> :
                          <SliderCardBox {...card} />
                      })}
                    </ul>
                  </div>
                  <div className="glide__arrows" data-glide-el="controls">
                    <button className="glide__arrow glide__arrow--left"
                            data-glide-dir="<"
                            style={{
                              ['--left' as string]: '-8%',
                            }}
                    >
                      {/*<i className="fas fa-arrow-left"/>*/}
                    </button>

                    <button className="glide__arrow glide__arrow--right"
                            data-glide-dir=">"
                            style={{
                              ['--right' as string]: '-8%',
                            }}
                    >
                      {/*<i className="fas fa-arrow-right"/>*/}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default withTranslation()(Page12);
