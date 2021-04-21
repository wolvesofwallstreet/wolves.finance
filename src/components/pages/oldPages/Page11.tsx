/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page11.css';

import {withTranslation} from 'react-i18next';

import PageContainer from '../../theme/pageContainer/PageContainer';
import PageHeader from '../../theme/pageHeader/PageHeader';

function ExamplePage() {
  const cards = [
    {
      title: 'LOS ANGELES - DAI POOL',
      boxTitle: '130% APR',
      boxTitleSmall: '- FIXED 2YEARS',
      content:
        'SEEK YOUR FORTUNE IN THE CITY OF SIN. THE HEAT IS ON FOR THE PROFIT POTENTIAL OF THE DAI POOL WTH YEARN \n\n GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.',
    },
    {
      title: 'CHICAGO - USDT',
      boxTitle: '130% APR ',
      boxTitleSmall: '- FIXED 2YEARS',
      content:
        'ITS TIME TO GO TO THE BIG APPLE AND TAKE A MASSIVE BITE OF THE US DOLLAR COIN POOL WTH YEARN \n\n GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSIN',
    },
    {
      title: 'NEW YORK - USDC',
      boxTitle: '130% APR ',
      boxTitleSmall: '- FIXED 2YEARS',
      content:
        'SET YOUR SITES ON THE WINDY CITY AND THE HEADY PROFIT POTENTIAL OF THE US DOLLAR TETHER POOL WTH YEARN \n\n GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.',
    },
  ];

  return (
    <>
      <PageContainer bgClass="bg-bois">
        <>
          {/* <PageContainer bgClass="bg-bois"> */}
          <PageHeader
            logoSrc="/static/media/logo.ac917530.png"
            heading="WELCOME TO THE BOIS YEARN BOARDROOMS"
            headingSecondry="THIS BOIS CRYPTOFOLIO, WILL IN TIME, ALLOW YOU TO YIELD FARM, DEFEND THE BOOSTER POOL, HOLD NFT UPGRADES, HOLD OTHER NFTS AND BUNDLE THEM TOGETHER TO SELL, AND MUCH MORE."
          />

          <br/>

          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              // backgroundColor: 'rgba(168, 240, 240, 0.459)',
            }}
          >
            <div className="grid-container">
              {cards.length &&
              cards.map((card, i) => {
                return (
                  <div className="c-item c1" key={i + Math.random()}>
                    <h4 className="tk-vincente-bold font-32 p-5">
                      {card.title}
                    </h4>
                    <div className="c-box">
                      <div className="c-box-title tk-vincente-lightbold font-24">
                        {card.boxTitle}
                        <span className="font-16"> {card.boxTitleSmall}</span>
                      </div>
                      <div className="c-box-content">{card.content}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* </PageContainer> */}
        </>
      </PageContainer>
    </>
  );
}

export default withTranslation()(ExamplePage);

/*

<PageHeader
  logoSrc="/static/media/logo.ac917530.png"
  heading="THis is main heading"
  headingSecondry="Lorem ipsum dolor sit amet consectetur adipisicing elit. Lorem ipsum dolor sit amet consectetur adipisicing elit."
/>

<PageHeader
  heading={<h1 style={{ marginTop: '100px' }}> hello Iam here</h1>}
/>

<HorizontalLine />
*/
