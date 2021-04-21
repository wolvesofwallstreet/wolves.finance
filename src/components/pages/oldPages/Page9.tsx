/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './page14.css';
import './../comman.css';

import { TFunction, withTranslation } from 'react-i18next';
import {  RouteComponentProps } from 'react-router-dom';

import HorizontalLine from '../../theme/line/HorizontalLine';
import Navigation from '../../theme/navigation/Navigation';
import PageHeader from '../../theme/pageHeader/PageHeader';
import WolveCard from '../../theme/wolveCard/WolveCard';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

function ExamplePage({ t }: PROPS) {
  return (
    <>
      <div className={'w-container bg-wolves text-white'} >
        <div className={' '}>
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
            {[1, 2, 3, 4].map((card, i) => {
              return (
                <div className="p-4 bg-blue-transparent " key={i + Math.random()}>
                  <div className={'g-card'}>
                    <div className="p-1">
                      <div className="">
                        <h3 className={'tk-vincente-bold font-24'}>
                          {' '}
                          BOIS NYC USDT{' '}
                        </h3>
                        <span className={'single-line'}>
                        {' '}
                          LPToken: 0.00{' '}
                      </span>{' '}
                        <br />
                        <span className={'single-line'}> Staked: 0.00 </span>{' '}
                        <br />
                        <span className={'single-line'}>
                        {' '}
                          Earned: 0.000000 WOWS,{' '}
                      </span>{' '}
                        <br />
                      </div>
                    </div>
                    <div className="w-50 g-card-img-container">
                      <img
                        className={'img-fluid g-card-big-small'}
                        src={
                          'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg'
                        }
                        alt={'card img'}
                      />
                      <img
                        className={'img-fluid g-card-img-small'}
                        src={
                          'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg'
                        }
                        alt={'card img'}
                      />
                    </div>
                  </div>
                  <div className={'pt-2 tk-grotesk-lightbold font-16'}>
                    <span className="pr-2"> APY*: 394.45% </span>
                    <span className="pr-2"> APR: 162.31% </span>
                  </div>
                </div>
              );
            })}
          </div>

          <HorizontalLine />

          <Navigation
            centerLinks={[
              {href: '/page9?item=One', name: 'One'},
              {href: '/page9?item=Two', name: 'Two', active: true},
              {href: '/page9?item=Three', name: 'Three'},
            ]}
          />

          <span className={'wolves-orange-light font-20'}>
          1/20 RARITY - 25% PROFIT SHARE
        </span>

          <div className="wolve-cards-container">
            {[1, 2, 3].map((_, i) => {
              return (
                <WolveCard
                  key={i + Math.random()}
                  title={'AKSINIA HUNTLEY'}
                  cardLink={'/page9?item=three' + i}
                  linkType="image"
                  src="https://4travelers.de/wolves_assets/cards/wolves/level1/PAWLY-300.jpg"
                  bottomContent={
                    <>
                    <span
                      className="tk-vincente-lightbold font-32 mt-3s"
                      style={{ lineHeight: 0.8 }}
                    >
                      MINT NFT
                    </span>
                      <span className="tk-grotesk-lightbold font-14 ellipsis">
                      MOTTO: This is Moto right
                    </span>
                      {/*<Hr/>*/}
                      <h2 className="tk-vincente-lightbold ellipsis">1/100</h2>
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
