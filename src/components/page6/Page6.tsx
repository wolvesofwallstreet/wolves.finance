/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Page6.css';

import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';

type PAGE6_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

const Page6 = ({ t }: PAGE6_PROPS) => {
  return (
    <>
      <div className={'page6-container bg-wolves '}>
        {/* Title & heading */}
        <div>
          {<img src={Logo} alt="Logo" width="50px" height="50px" />}
          <h2 className="tk-vincente-lightbold font-28 mt-1 single-line">
            {'WELCOME TO YOUR PACK'}
          </h2>
          <h3 className="tk-grotesk-lightbold font-14">
            {
              'THIS BOIS CRYPTOFOLIO, WILL IN TIME, ALLOW YOU TO YIELD FARM, DEFEND THE BOOSTER POOL, HOLD NFT UPGRADES, HOLD OTHER NFTS AND BUNDLE THEM TOGETHER TO SELL, AND MUCH MORE.'
            }
          </h3>
        </div>

        {/* sub-navigation */}
        <div className="mt-4 mb-0 pb-0">
          <span className="tk-vincente-lightbold font-24 single-line fixed-pos">
            &lt;
            <Link to="?page6=back" className="text-white">
              {t('page.back')}
            </Link>
          </span>
          <span className="tk-vincente-lightbold font-24 single-line fixed-pos ml-2 disabled-link">
            <Link to="?page6=prodigy" className="text-white">
              {'PRODIGY'}
            </Link>
          </span>
        </div>

        {/* h-line */}
        <span className="line-container w-100">
          <span id="left" className="dot" />
          <span className="line" />
          <span id="right" className="dot" />
        </span>

        {/* sub-navigation 2 */}
        <div className={'page6-section-header'}>
          <span className="tk-vincente-lightbold font-24 single-line wolves-color-orange fixed-pos">
            &lt;
            <Link className={'text-white'} to="?cards=previousCard">
              PREVIOUS CARD
            </Link>
          </span>
        </div>

        {/* content */}
        <div className={'page6-two-col-container mt-4'}>
          <div className="">
            <img
              className={'responsive-img'}
              src={
                'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-500.mp4.jpg'
              }
              alt={'Bryant'}
              style={{ maxWidth: '500px' }}
            />
          </div>
          <div
            className={
              'd-flex flex-column justify-content-between ml-2 t-left '
            }
          >
            <h1 className="tk-vincente h-1">BRYANT BARKLEY</h1>
            <h2 className="tk-vincente-lightbold font-28">
              <span className="wolves-color-orange">MOTO:</span>
              BUY WHEN THERE IS BLOOD ON THE STREET
            </h2>
            <div
              className={'mt-2 tk-grotesk-lightbold font-18 line-break-enable'}
            >
              <p>
                Wall Street Hustler - He’s worked his way up from the actual
                street. Learning the hustle on the street has given him the
                perfect grounding for working the trade floor. Forget rough
                diamond this trader is a blood diamond, and isnt afraid to step
                on toes and ears to make the deals he needs.
              </p>
              <p className={'wolves-color-orange'}>
                This is a staker card and allows to stake Wolf on the tradefloor
                and also Raid. You can sell this character licence at any point
                wither on our platform or on opensea
              </p>
            </div>

            <ul className="tk-vincente-bold rarity-box">
              <li>
                <h2 className="font-28">RARITY: 1/120 </h2>
              </li>
              <li>
                <h2 className="font-28">PROWESS: 50% </h2>
              </li>
              <li>
                <h2 className="font-28">STARTING APY: 120% </h2>
              </li>
            </ul>

            <div className={''}>
              <button className={'wolve_btn page6-btn mt-3 m-0 font-10'}>
                BUY STAKED ETH/WOWS NFT
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default withTranslation()(Page6);
