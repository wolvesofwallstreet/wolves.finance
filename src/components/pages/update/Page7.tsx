/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */


// import './page4.css'; // TODO

import React from "react";
import {TFunction, withTranslation} from 'react-i18next';
import { RouteComponentProps} from "react-router-dom";

import PageHeader from "../../theme/pageHeader/PageHeader";

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

const Page7 = ({t, location, history,}: PROPS) => {

  const cards = [
    {
      title: 'LOS ANGELES - DAI POOL',
      subTitle: '130% APR',
      paragraphs: [
        `SEEK YOUR FORTUNE IN THE CITY OF SIN. THE HEAT IS ON FOR THE PROFIT POTENTIAL OF THE DAI POOL WTH YEARN`,
        `GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.`
      ],
    },
    {
      title: 'CHICAGO - USDT',
      subTitle: '130% APR',
      paragraphs: [
        'SET YOUR SITES ON THE WINDY CITY AND THE HEADY PROFIT POTENTIAL OF THE US DOLLAR TETHER POOL WTH YEARN',
        'GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.']
    },
    {
      title: 'HOUSTON - USDC',
      subTitle: '130% APR',
      paragraphs: [
        `ITS TIME TO GO TO THE BIG APPLE AND TAKE A MASSIVE BITE OF THE US DOLLAR COIN POOL WTH YEARN`,
        `GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.`
      ]
    },
    {
      title: 'NEW YORK - TUSD',
      subTitle: '130% APR',
      paragraphs: [
        `TS TIME TO GO TO THE BIG APPLE AND TAKE A MASSIVE BITE OF THE US DOLLAR COIN POOL WTH YEARN`,
        `GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.`
      ],
    }
  ]

  return (
    <>
      <div className={'wolves-container bg-wolves text-white'}>

        <div>
          <PageHeader
            logoSrc="/static/media/logo.ac917530.png"
            heading="WELCOME TO THE BOIS YEARN BOARDROOMS"
            headingSecondry="SELECT YOUR PREFERRED INVESTMENT POOL"
          />
        </div>

        <div className="page7-cards-container">
          {cards.map((card, i) => {
            return (<div key={Math.random() + i } className={`card-page7 card-page7-bg-${i + 1}`}>
              <h4 className="tk-vincente-bold font-20 mb-3">LOS ANGELES - DAI POOL</h4>

              <div className={"wolves-border mt-4"}>
                <h5 className="tk-vincente-bold page7-card-box-subtitle">
                  {card.subTitle}
                </h5>

                <div className={`page7-card-box-description`}>
                  {card.paragraphs.length && card.paragraphs.map(p => (
                    <p className={'tk-grotesk-lightbold'}>{p}</p>
                  ))}
                </div>
              </div>

            </div>)
          })}
        </div>

      </div>
    </>
  );
}

export default withTranslation()(Page7);
