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

import GlideJS from '@glidejs/glide'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {Breakpoints, Controls} from "@glidejs/glide/dist/glide.modular.esm";
import React, {Fragment} from "react";
import {TFunction, withTranslation} from 'react-i18next';
import {RouteComponentProps} from "react-router-dom";

import IMG_ETH_WOWS_LP_TOKEN_500 from '../../../assets/eth_wows_lp_token-500.jpg'
import PageHeader from "../../theme/pageHeader/PageHeader";

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

const Page9 = ({t, location, history,}: PROPS) => {

  const initGlide = () => {
    new GlideJS('.images', {
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
          perView: 5
        },
        800: {
          perView: 2
        },
        600: {
          perView: 2
        }
      },
    }).mount({
      Controls,
      Breakpoints,
    })
  }

  React.useEffect(() => {
    //
    initGlide()
  })

  return (
    <>
      <div className={'wolves-container-fluid bg-flat2 text-white text-center'}>

        {/* Title & heading */}
        <div>
          <PageHeader
            heading="WELCOME TO THE YEARN CRV POOL"
            headingSecondry="CHOOSE YOUR CRYPTO FOLIO YOU WANT TO USE"
          />
        </div>

        {/* Card slider */}
        <div className={'slider-wrap-bar'}>
          <div className={'wrap'}>
            <div className="images glide">
              <div className="glide__track" data-glide-el="track">
                <ul className="glide__slides">
                  {[1, 2, 3, 4, 5].map((card, i) => {
                    return (
                      <Fragment key={i + Math.random()}>
                        <div className="glide__slide">
                          <div className="slide-count"> {i} </div>
                          <img className={'responsive-img slide-img img-bryant_bark-300'} src="https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-300.jpg" alt=""/>
                        </div>
                      </Fragment>
                    )
                  })}
                </ul>
              </div>
              <div className="glide__arrows" data-glide-el="controls">
                <button className="glide__arrow glide__arrow--left" data-glide-dir="<"><i className="fas fa-arrow-left"/></button>
                <button className="glide__arrow glide__arrow--right" data-glide-dir=">"><i className="fas fa-arrow-right"/></button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={'two-column-container w-80 center-container my-5'}>
          <div className={''}>
            <img className={'responsive-img'} src={IMG_ETH_WOWS_LP_TOKEN_500} alt={'IMG_ETH_WOWS_LP_TOKEN_500'}/>
          </div>

          <div className={'t-left mx-5'}>
            <h1 className={'f-vincente h-1'}> YEARN QUAD POOL </h1>
            {[1, 2, 3, 4].map((bar, i) => {
              return (
                <Fragment key={i + Math.random()}>
                  <div className=" d-flex justify-content-between border p-3 bg-orange-trans">
                    <p className={'m-0'}> DAI-MAX </p>
                    <p className={'m-0 bold'}>24.00000</p>
                  </div>

                  <div className="d-flex justify-content-between">
                    {
                      [1, 2, 3, 4, 5].map((bar, i) => {
                        return (
                          <Fragment key={i + Math.random()}>
                            <div>{i}</div>
                          </Fragment>
                        )
                      })
                    }
                  </div>
                </Fragment>
              )
            })}
          </div>
        </div>

      </div>
    </>
  );
}

export default withTranslation()(Page9);
