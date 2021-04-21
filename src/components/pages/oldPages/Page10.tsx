/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
// import './contentWrapper.css';

import ContentWrapper from 'components/theme/contentWrapper/ContentWrapper';
import {withTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';

import HorizontalLine from '../../theme/line/HorizontalLine';
import Navigation from '../../theme/navigation/Navigation';
import PageContainer from '../../theme/pageContainer/PageContainer';
import PageHeader from '../../theme/pageHeader/PageHeader';

function Page10() {

  // const cards = [
  //   {
  //     title: 'LOS ANGELES - DAI POOL',
  //     boxTitle: '130% APR',
  //     boxTitleSmall: '- FIXED 2YEARS',
  //     content:
  //       'SEEK YOUR FORTUNE IN THE CITY OF SIN. THE HEAT IS ON FOR THE PROFIT POTENTIAL OF THE DAI POOL WTH YEARN \n\n GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.',
  //   },
  //   {
  //     title: 'CHICAGO - USDT',
  //     boxTitle: '130% APR ',
  //     boxTitleSmall: '- FIXED 2YEARS',
  //     content:
  //       'ITS TIME TO GO TO THE BIG APPLE AND TAKE A MASSIVE BITE OF THE US DOLLAR COIN POOL WTH YEARN \n\n GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSIN',
  //   },
  //   {
  //     title: 'NEW YORK - USDC',
  //     boxTitle: '130% APR ',
  //     boxTitleSmall: '- FIXED 2YEARS',
  //     content:
  //       'SET YOUR SITES ON THE WINDY CITY AND THE HEADY PROFIT POTENTIAL OF THE US DOLLAR TETHER POOL WTH YEARN \n\n GET YOUR C-FOLIO BOI AND START EARNING 100% YIELD PLUS WOWS BUSINESS PROFIT.',
  //   },
  // ];

  return (
    <>
      <PageContainer bgClass="bg-bois">
        <>
          {/* <PageContainer bgClass="bg-bois"> */}

          <PageHeader
            logoSrc="/static/media/logo.ac917530.png"
            heading="WELCOME TO THE BOIS"
            headingSecondry="IN ORDER TO STAKE WITH WOLVES ON THE WOLF TRADEFLOOR YOU WILL NEED TO PURCHASE YOUR SFT CHARACTER CRYPTO LICENCE"
          />

          <div>
            <span className="w-nav-center tk-vincente-lightbold">
              <Link
                to={'temp?item=Back'}
                className={'w-nav-section text-white'}
              >
                Back
              </Link>
              <Link
                to={'temp?item=Front'}
                className={'w-nav-section text-white'}
              >
                PRODIGY
              </Link>
            </span>
          </div>

          <HorizontalLine/>

          <Navigation
            leftLink={{href: 'temp?java=2', name: 'Previos Element'}}
          />

          <br/>

          <ContentWrapper
            src="https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-500.mp4"
            mediaType="video"
          >
            <h1 className="tk-vincente-bold font-48 ">BRYANT BARKLEY</h1>
            <h2 className="tk-vincente-lightbold font-24">
              <span className="wolves-orange">MOTO:</span>
              MOTTO: BUY WHEN THERE IS BLOOD ON THE STREET
            </h2>
            <span className="tk-grotesk-lightbold font-20 line-break-enable">
              Wall Street Hustler - He’s worked his way up from the actual
              street. Learning the hustle on the street has given him the
              perfect grounding for working the trade floor. Forget rough
              diamond this trader is a blood diamond, and isnt afraid to step on
              toes and ears to make the deals he needs.
            </span>
            <span className="tk-grotesk-lightbold font-20 line-break-enable wolves-orange">
              This is a staker card and allows to stake Wolf on the tradefloor
              and also Raid. You can sell this character licence at any point
              wither on our platform or on opensea
            </span>
            <ul className="tk-vincente-bold font-24 rarity-box">
              <li>
                <h2>RARITY : 1/120</h2>
              </li>
              <li>
                <h2>PROFIT SHARING : 55%</h2>
              </li>
              <li>
                <h2>RAIDABILITY : 50%</h2>
              </li>
              <li>
                <h2>STARTING APY : 120%</h2>
              </li>
              <li>
                <h2 className="text-uppercase">AUTO UPGRADE 2 MONTHS </h2>
              </li>
            </ul>
            <div>
              <button className="content-details-btn ">BUY MAX FANG</button>
            </div>
          </ContentWrapper>
          {/* </PageContainer> */}
        </>
      </PageContainer>
    </>
  );
}

export default withTranslation()(Page10);

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
