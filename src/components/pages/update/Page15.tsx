/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import WOLFD_APP_DEVS_FLAT231_300 from '../../../assets/wolfd_app_devs_flat2_136_300.jpg';
import HorizontalLine from '../../theme/line/HorizontalLine';
import PageHeader from '../../theme/pageHeader/PageHeader';
import WolveCard from '../../theme/wolveCard/WolveCard';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

function ExamplePage({ t, location }: PROPS) {
  const activeTab = (tab?: string) => {
    const currentTab = new URLSearchParams(location.search).get('currentTab');
    if (!tab) return currentTab;
    if (tab && currentTab === tab) {
      return 'nav-active';
    }
    return '';
  };

  const cards = [
    {
      title: 'BOIS NYC USDT',
      src:
        'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4.jpg',
      info: ['LPToken: 0.00', 'Staked: 0.00', 'Earned: 0.000000 WOWS'],
      extraInfo: ['APY*: 394.45%', 'APR: 162.31%'],
      apy: '394.45',
      apr: '162.31%',
    },
    {
      title: 'BBOIS LOS ANGELES DAI',
      src:
        'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4.jpg',
      info: ['LPToken: 0.00', 'Staked: 0.00', 'Earned: 0.000000 WOWS'],
      extraInfo: ['APY*: 394.45%', 'APR: 162.31%'],
      apy: '394.45',
      apr: '162.31%',
    },
    {
      title: 'WOLVES STAKING',
      src:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      info: ['LPToken: 0.00', 'Staked: 0.00', 'Earned: 0.000000 WOWS'],
      extraInfo: ['APY*: 394.45%', 'APR: 162.31%'],
      apy: '394.45',
      apr: '162.31%',
    },
    {
      title: 'BOIS LOS ANGELES DAI',
      src:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      info: ['LPToken: 0.00', 'Staked: 0.00', 'Earned: 0.000000 WOWS'],
      extraInfo: ['APY*: 394.45%', 'APR: 162.31%'],
      apy: '394.45',
      apr: '162.31%',
    },
  ];

  return (
    <>
      <div className={'w-container bg-wolves text-white'}>
        <div className="">
          <div>
            <PageHeader
              logoSrc="/static/media/logo.ac917530.png"
              heading="WELCOME TO THE BOIS"
              headingSecondry="IN ORDER TO STAKE WITH WOLVES ON THE WOLF TRADEFLOOR YOU WILL NEED TO PURCHASE YOUR SFT CHARACTER CRYPTO LICENCE"
            />
          </div>

          <div className={'bg-blue-transparent font-16 py-3 px-3 my-2 mt-3'}>
            Earned: 2.000000 WOWS, | 10.348 | 12DAI = $303.00 TOTAL
          </div>

          <div className={'d-grid text-left mb-4'}>
            {cards.map((card, i) => {
              return (
                <div
                  className="p-4 bg-blue-transparent"
                  key={i + Math.random()}
                  // style={{minWidth:'260px'}}
                >
                  <div className={'g-card justify-content-between'}>
                    <div className="w-50 p-1">
                      <div className="">
                        <h3 className={'tk-vincente-bold h-4'}>{card.title}</h3>
                        <div className={'d-flex flex-column '}>
                          <span
                            className={'font-13 f-light single-line mt-2 mr-5'}
                          >
                            LPToken: 0.00
                          </span>
                          <span
                            className={'font-13 f-light single-line mt-2 mr-5'}
                          >
                            Staked: 0.00
                          </span>
                          <span className={'font-13 f-light single-line mt-2'}>
                            Earned: 0.000000 WOWS
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="">
                      <img
                        className={'img-fluid g-card-big-small'}
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

          <HorizontalLine />

          <div className="w-nav-container mb-3">
            <div className="w-nav-center tk-vincente-lightbold">
              <Link
                className={`w-nav-section mx-4 ${activeTab('PRODIGY')}`}
                to="?currentTab=PRODIGY"
              >
                PRODIGY
                {activeTab('PRODIGY') && <div className="triangle-down"></div>}
              </Link>
              <Link
                className={`w-nav-section mx-4 ${activeTab('PHENOM')}`}
                to="?currentTab=PHENOM"
              >
                PHENOM
                {activeTab('PHENOM') && <div className="triangle-down"></div>}
              </Link>
              <Link
                className={`w-nav-section mx-4 ${activeTab('NFTs')}`}
                to="?currentTab=NFTs"
              >
                NFTs
                {activeTab('NFTs') && <div className="triangle-down"></div>}
              </Link>
            </div>
          </div>

          <span className={'wolves-orange-light font-20'}>
            1/20 RARITY - 25% PROFIT SHARE
          </span>

          <div className="wolve-cards-container">
            {[1, 2].map((_, i) => {
              return (
                <WolveCard
                  key={i + Math.random()}
                  cardLink={'?item=three' + i}
                  linkType="image"
                  src={WOLFD_APP_DEVS_FLAT231_300}
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
                      <span className="f-vincente font-32 m-0 line-h ellipsis">
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

export default withTranslation()(ExamplePage);
