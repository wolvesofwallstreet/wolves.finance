/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import '../theme/checkbox/wolve_checkbox.css';
import './Page12CFolioManager.css';

import React, { Fragment, useState } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

//Page 12
function CFolioManagerPage12({ t }: PROPS) {
  const [slider1Cards /*setSlider1Cards*/] = useState([
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
      count: 3,
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      count: 1,
    },
    {
      id: Math.random(),
      title: 'GORGAN',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      type: 'empty_box',
      boxTitle: 'OPEN WALLET',
    },
  ]);
  const [slider2Cards /*setSlider2Cards*/] = useState([
    {
      id: Math.random(),
      title: 'MOBILE UPGRADE',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-300.jpg',
      checked: true,
    },
    {
      id: Math.random(),
      title: 'YEARN DAI / USDC',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level1/KURT-300.jpg',
      checked: true,
    },
    {
      id: Math.random(),
      title: 'YEARN USDT',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-300.jpg',
      checked: false,
    },
  ]);
  const [slider3Cards /*setSlider3Cards*/] = useState([
    {
      id: Math.random(),
      title: 'WOWS_BLUE',
      src: 'https://4travelers.de/wolves_assets/cards/wolves/level1/KURT-300.jpg',
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
      type: 'empty_box',
      boxTitle: 'OPEN WALLET',
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

  const SliderCardBox = ({
    id = '',
    src = '',
    count = -1,
    title = 'thumb',
  }: {
    src: string;
    [key: string]: string | number;
  }) => {
    return (
      <Fragment key={Math.random()}>
        <div className="glide__slide">
          {count > -1 && <div className="slide-count"> {count} </div>}
          <img
            className={'responsive-img slide-img'}
            src={src}
            alt={title + '-img'}
          />
        </div>
      </Fragment>
    );
  };

  const EmptyBox = ({ boxTitle }: { boxTitle: string }) => (
    <Fragment>
      <div className="glide__slide">
        <div className={'glide__slide_empty_box'}>
          <div>{boxTitle}</div>
        </div>
      </div>
    </Fragment>
  );

  return (
    <>
      <div className={'page12-container bg-wolves'}>
        {/* Title & heading */}
        <div>
          <h2 className="tk-vincente-lightbold font-28 mt-1 single-line">
            {'WELCOME TO YOUR C-FOLIO TRANSFER MANAGER'}
          </h2>
          <h3 className="tk-grotesk-lightbold font-14">
            {'MANAGE YOUR ASSETS WITH MULTI TRANSACTIONS IN ONE.'}
          </h3>
        </div>

        <div
          className={
            'd-flex flex-column bg-blue-transparent wolves-orange-border font-16 py-4 my-2 mt-3'
          }
        >
          {/* Card slider-1 */}
          <div className={'w-75 center-container'}>
            <div className={'slider-wrap-bar before_none after_none'}></div>
          </div>

          {/* Card slider-2 */}
          <div className={'w-75 center-container pt-4'}>
            <div className={'slider-wrap-bar before_none after_none'}></div>
          </div>

          {/* H-line */}
          <div className={'page12-h-line'} />

          {/* center btn, arrow */}
          <div
            className={
              'center-container d-flex flex-column justify-content-center align-items-center'
            }
          >
            <button className={'wolve_btn w-100 page12-btn-stack'}>
              MULTI TRANSFER
            </button>
            <div className={'arrow_down mt-1'} />
          </div>

          {/* H-line */}
          <div className={'page12-h-line'} />

          {/* Card slider-3 */}
          <div className={'w-100 mt-2 center-container'}>
            <div className={'slider-wrap-bar before_none after_none'}></div>
          </div>
        </div>
      </div>
    </>
  );
}

export default withTranslation()(CFolioManagerPage12);
