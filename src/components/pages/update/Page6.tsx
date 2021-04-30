/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
// import './contentWrapper.css';

import ContentWrapper from 'components/theme/contentWrapper/ContentWrapper';
import { withTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// import HorizontalLine from '../../theme/line/HorizontalLine';
// import Navigation from '../../theme/navigation/Navigation';
import PageContainer from '../../theme/pageContainer/PageContainer';
import PageHeader from '../../theme/pageHeader/PageHeader';

function Page6() {
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
                to={'page6?item=Back'}
                className={'w-nav-section text-white'}
              >
                Back
              </Link>
              <Link
                to={'page6?item=Front'}
                className={'w-nav-section text-white'}
              >
                PRODIGY
              </Link>
            </span>
          </div>

          {/* Line */}
          <span className="line-container">
            <span id="left" className="dot" />
            <span className="line" />
            <span id="right" className="dot" />
          </span>

          <div id="page8-section-header">
            <span className="tk-vincente-lightbold font-24 single-line wolves-orange fixed-pos">
              &lt;
              <Link to="?page6=previousCard">PREVIOUS CARD</Link>
            </span>
          </div>

          <br />

          <ContentWrapper
            src="https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-500.mp4"
            mediaType="video"
          >
            <h1 className="tk-vincente-bold font-48 ">BRYANT BARKLEY</h1>
            <h2 className="tk-vincente-lightbold font-24">
              <span className="wolves-orange">MOTO:</span>
              BUY WHEN THERE IS BLOOD ON THE STREET
            </h2>
            <span className="tk-grotesk-lightbold line-h font-20 line-break-enable">
              Wall Street Hustler - He’s worked his way up from the actual
              street. Learning the hustle on the street has given him the
              perfect grounding for working the trade floor. Forget rough
              diamond this trader is a blood diamond, and isnt afraid to step on
              toes and ears to make the deals he needs.
            </span>
            <span className="tk-grotesk-lightbold line-h font-20 line-break-enable wolves-orange">
              This is a staker card and allows to stake Wolf on the tradefloor
              and also Raid. You can sell this character licence at any point
              wither on our platform or on opensea
            </span>
            <ul className="tk-vincente-bold font-24 rarity-box">
              <li>
                <h2>RARITY : 1/120</h2>
              </li>
              <li>
                <h2>SKILL 55%</h2>
              </li>
              <li>
                <h2>STARTING APY : 120%</h2>
              </li>
              <li>
                <h2>AUTO UPGRADE 2 MONTHS</h2>
              </li>
            </ul>
            <div>
              <button className="content-details-btn font-12">
                LEND WITH BRYANT BARKLEY
              </button>
            </div>
          </ContentWrapper>
          {/* </PageContainer> */}
        </>
      </PageContainer>
    </>
  );
}

export default withTranslation()(Page6);

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
