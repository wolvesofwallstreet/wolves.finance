/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Page7BoisBoardrooms.css';

import React from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

// BoisBoardroomsPage7
const Page7BoisBoardrooms = ({ t, location, history }: PROPS) => {
  const cards = [
    {
      title: 'LOS ANGELES - DAI POOL',
      subTitle: '130% APR',
      paragraphs: [
        `SEEK YOUR FORTUNE IN THE CITY OF SIN. THE HEAT IS ON FOR THE PROFIT POTENTIAL OF THE DAI POOL WTH YEARN`,
        `GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.`,
      ],
    },
    {
      title: 'CHICAGO - USDT',
      subTitle: '130% APR',
      paragraphs: [
        'SET YOUR SITES ON THE WINDY CITY AND THE HEADY PROFIT POTENTIAL OF THE US DOLLAR TETHER POOL WTH YEARN',
        'GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.',
      ],
    },
    {
      title: 'HOUSTON - USDC',
      subTitle: '130% APR',
      paragraphs: [
        `ITS TIME TO GO TO THE BIG APPLE AND TAKE A MASSIVE BITE OF THE US DOLLAR COIN POOL WTH YEARN`,
        `GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.`,
      ],
    },
    {
      title: 'NEW YORK - TUSD',
      subTitle: '130% APR',
      paragraphs: [
        `TS TIME TO GO TO THE BIG APPLE AND TAKE A MASSIVE BITE OF THE US DOLLAR COIN POOL WTH YEARN`,
        `GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.`,
      ],
    },
  ];

  return (
    <>
      <div className={'wolves-container bg-wolves text-white'}>
        {/* Title & heading */}
        <div>
          <img src={Logo} alt="Logo" width="50px" height="50px" />
          <h2 className="tk-vincente-lightbold font-28 single-line mt-1">
            {'WELCOME TO THE BOIS YEARN CRV BOARDROOMS'}
          </h2>
          <h3 className="tk-grotesk-lightbold font-14">
            {'FOUR INVESTMENTS ONE HIGH YIELD POOL'}
          </h3>
        </div>

        {/* H-Line */}
        <span className="line-container page3Trade-line-w-80">
          <span id="left" className="dot" />
          <span className="line" />
          <span id="right" className="dot" />
        </span>

        <div className="page7-cards-container">
          {cards.map((card, i) => {
            return (
              <div
                key={Math.random() + i}
                className={`card-page7 card-page7-bg-${i + 1}`}
              >
                <h4 className="tk-vincente-bold font-20 mb-3">
                  LOS ANGELES - DAI POOL
                </h4>

                <div className={'wolves-border mt-4'}>
                  <h5 className="tk-vincente-bold page7-card-box-subtitle">
                    {card.subTitle}
                  </h5>

                  <div className={`page7-card-box-description font-10`}>
                    {card.paragraphs.length &&
                      card.paragraphs.map((p) => (
                        <p className={'tk-grotesk-lightbold'}>{p}</p>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default withTranslation()(Page7BoisBoardrooms);
