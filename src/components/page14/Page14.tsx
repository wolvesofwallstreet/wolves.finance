/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './Page14.css';

import React from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';
import WolveCard from '../theme/wolveCard/WolveCard';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

function Page14({ t, location }: PROPS) {
  // const activeTab = (tab?: string) => {
  //   const currentTab = new URLSearchParams(location.search).get('currentTab');
  //   if (!tab) return currentTab;
  //   if (tab && currentTab === tab) {
  //     return 'nav-active';
  //   }
  //   return '';
  // };

  const cards = [
    {
      title: 'BOIS NYC USDT',
      src: 'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4.jpg',
      info: ['LPToken: 0.00', 'Staked: 0.00', 'Earned: 0.000000 WOWS'],
      extraInfo: ['APY*: 394.45%', 'APR: 162.31%'],
      apy: '394.45',
      apr: '162.31%',
    },
    {
      title: 'BBOIS LOS ANGELES DAI',
      src: 'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4.jpg',
      info: ['LPToken: 0.00', 'Staked: 0.00', 'Earned: 0.000000 WOWS'],
      extraInfo: ['APY*: 394.45%', 'APR: 162.31%'],
      apy: '394.45',
      apr: '162.31%',
    },
  ];

  return (
    <>
      <div className={'page14-container bg-wolves text-white'}>
        <div className="">
          {/* Title & heading */}
          <div>
            <img src={Logo} alt="Logo" width="50px" height="50px" />
            <h2 className="tk-vincente-lightbold font-28 mt-1 single-line">
              {'WELCOME TO YOUR PACK'}
            </h2>
            <h3 className="tk-grotesk-lightbold font-14">
              {'YOUR PACK FOR BOIS, WOLVES, UPGRADES AND LP NFTs'}
            </h3>
          </div>

          <div className="vw-80 center-container">
            <div
              className={
                'd-flex flex-column flex-md-row justify-content-center bg-blue-transparent font-14 py-2 px-3 my-2 mt-3 '
              }
            >
              <span className={' m-1 mr-1'}> Earned: 2.000000 WOWS,</span>
              <span className={' m-1 mr-1'}> 10.34 $</span>
              <span className={' m-1 mr-1'}> 12 DAI = $303.00 TOTAL</span>
            </div>

            <div className={'page14-grid text-left mb-4'}>
              {cards.map((card, i) => {
                return (
                  <div
                    className="px-4 py-2 bg-blue-transparent "
                    key={'p14' + i}
                  >
                    <div className={'page14-card justify-content-between'}>
                      <div className="p-1">
                        <div className="">
                          <h3 className={'tk-vincente-bold font-24'}>
                            {card.title}
                          </h3>
                          <div className={'d-flex flex-column '}>
                            <span
                              className={
                                'font-14 f-light single-line mt-2 mr-5 text-nowrap'
                              }
                            >
                              LPToken: 0.00
                            </span>
                            <span
                              className={
                                'font-14 f-light single-line mt-2 mr-5'
                              }
                            >
                              Staked: 0.00
                            </span>
                            <span
                              className={'font-14 f-light single-line mt-2'}
                            >
                              Earned: 0.000000 WOWS
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="">
                        <img
                          className={
                            'img-fluid g-card-big-small border broder-1'
                          }
                          src={card.src}
                          alt={card.title}
                          style={{ maxWidth: '120px', width: '100%' }}
                        />
                      </div>
                    </div>
                    <div className={'pt-1 font-16'}>
                      <span className="font-14 f-light pr-2">
                        APY*: {card.apy}
                      </span>
                      <span className="font-14 f-light "> APR: {card.apr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* H-Line */}
          <span className="line-container w-100">
            <span id="left" className="dot" />
            <span className="line" />
            <span id="right" className="dot" />
          </span>

          {/* sub-navigation */}
          <div className="mt-2 mb-0 pb-0">
            <span className="d-flex justify-content-center tk-vincente-lightbold">
              {/* Active tab */}
              <span className="mx-2 font-24 wolves-color-orange">
                PRODIGY
                <div className={'page13-triangle-down'} />
              </span>

              <Link className="mx-2 font-24 text-white" to="?tab=PHENOM">
                PHENOM
              </Link>

              <Link className="mx-2 font-24 text-white" to="?tab=NFTs">
                NFTs
              </Link>
            </span>
          </div>

          <div className="wolve-cards-container">
            {[1, 2].map((_, i) => {
              return (
                <WolveCard
                  key={i + Math.random()}
                  cardLink={'?currentTab=three' + i}
                  linkType="image"
                  src={
                    'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg'
                  }
                  count={9 + i}
                  bottomContent={
                    <>
                      <span
                        className="tk-vincente-lightbold font-32 m-0 mt-2 line-h"
                        style={{ lineHeight: 0.8 }}
                      >
                        MINT NFT
                      </span>
                      <span className="tk-grotesk-lightbold font-14 ellipsis">
                        MOTTO: FILL IT OR KILL IT
                      </span>
                      <hr className="wolves" />
                      <span className="tk-vincente font-32 m-0 line-h ellipsis">
                        1/100
                      </span>
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default withTranslation()(Page14);
