/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Page11.css';

import React, { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import Logo from './../../assets/logo.png';

type PAGE11_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type QueryType = 'wolves' | 'bois' | 'myPack';

// interface ICurrentCard {
//   rarity: string;
//   url: string;
//   relative_img: string;
//   prowess: string;
//   startingApy: string | number;
//   monthUpgrades: string | number;
//   [key: string]: string | number;
// }

type PAGE11_STATE = {
  type: QueryType;
  [key: string]: string | number;
};

const INITIAL_PAGE11_STATE: PAGE11_STATE = {
  type: 'wolves',
  input: '',
};

class Page11 extends Component<PAGE11_PROPS, PAGE11_STATE> {
  constructor(props: PAGE11_PROPS) {
    super(props);
    this.state = INITIAL_PAGE11_STATE;
  }

  handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name && value) {
      this.setState({
        ...this.state,
        [name]: value,
      });
    }
  }

  render(): JSX.Element {
    const { t } = this.props;
    // const {currentCard, input1} = this.state;

    const extraInfo = {
      LPToken: '0.00 ',
      Staked: '0.00 ',
      Earned: '0.000000 WOWS',
      'APY*': '394.45% ',
      APR: '162.31%',
    };

    return (
      <>
        <div id="top" className={'wolves-container bg-wolves'}>
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
              <Link to="?page5=back" className="text-white">
                {t('page.back')}
              </Link>
            </span>
            <span className="tk-vincente-lightbold font-24 single-line fixed-pos ml-2 disabled-link">
              <Link to="?page5=prodigy" className="text-white">
                {'PRODIGY'}
              </Link>
            </span>
          </div>

          {/* h-line */}
          <span className="line-container">
            <span id="left" className="dot" />
            <span className="line" />
            <span id="right" className="dot" />
          </span>

          {/* sub-navigation 2 */}
          <div className={'page11-section-header'}>
            <span className="tk-vincente-lightbold font-24 single-line wolves-color-orange fixed-pos">
              &lt;
              <Link to="?cards=previousCard">PREVIOUS CARD</Link>
            </span>
          </div>

          <div className={'page11-content-container'}>
            <div>
              <div className={'page11-content-image'}>
                <video
                  disableRemotePlayback={true}
                  className="card-visual page11-content-image-inner"
                  autoPlay={true}
                  loop={true}
                  src={'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-{res}.mp4'.replace(
                    '{res}',
                    '500'
                  )}
                  poster={
                    'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-{res}.mp4'.replace(
                      '{res}',
                      '500'
                    ) + '.jpg'
                  }
                  playsInline
                />
                <img
                  className="page11-content-small-image"
                  src={
                    'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg'
                  }
                  alt={'img8'}
                />
              </div>
              <div id="page11-content-image">
                <button
                  className={
                    'wolve_btn w-100 m-0 mt-2 mb-1 page11-btn-stack bg-blue-transparent-dark text-white'
                  }
                >
                  AUTO UPGRADE : 15 PROWESS 43 : 21 : 56
                </button>
              </div>
            </div>
            <div className="page11-content-text">
              <div>
                <div>
                  <ul className="page11-info-ribbon tk-grotesk-lightbold ">
                    {Object.entries(extraInfo).map(([key, value], i) => (
                      <li key={key + i}>
                        {key !== undefined && `${key} : ${value}`}
                      </li>
                    ))}
                  </ul>
                </div>
                <h1 className="tk-vincente-bold h-1 tk-vincente ">
                  BRYANT BARKLEY
                </h1>
                <h2 className="tk-vincente-lightbold font-24">
                  <span className="wolves-color-orange">MOTO:</span>
                  BUY WHEN THERE IS BLOOD ON THE STREET
                </h2>
                <div>
                  <p
                    className={'tk-grotesk-lightbold font-16 line-break-enable'}
                  >
                    Wall Street Hustler - He’s worked his way up from the actual
                    street. Learning the hustle on the street has given him the
                    perfect grounding for working the trade floor. Forget rough
                    diamond this trader is a blood diamond, and isnt afraid to
                    step on toes and ears to make the deals he needs.
                  </p>
                  <p
                    className={
                      'tk-grotesk-lightbold font-16 line-break-enable wolves-color-orange'
                    }
                  >
                    This is a staker card and allows to stake Wolf on the
                    tradefloor and also Raid. You can sell this character
                    licence at any point wither on our platform or on opensea
                  </p>
                </div>

                <ul className="tk-vincente-bold font-24 rarity-box">
                  <li>
                    <h2>RARITY: 1/120 </h2>
                  </li>
                  <li>
                    <h2>PROWESS: 50% </h2>
                  </li>
                  <li>
                    <h2>STARTING APY: 120% </h2>
                  </li>
                </ul>

                <div className="w-100 page11-grid-btn ">
                  <div
                    className={
                      'd-flex justify-content-between page11-text-input'
                    }
                  >
                    <div className="">MAX</div>
                    <div className="">50%</div>
                  </div>

                  <div></div>
                  <button className={'wolve_btn page11-btn-stack m-0'}>
                    CLAIM REWARDS
                  </button>
                  <button
                    className={
                      'wolve_btn page11-btn-stack m-0 bg-blue-transparent-dark text-gray'
                    }
                  >
                    CLAIM REWARDS & DESTROY NFT (UNSTAKE)
                  </button>
                  <button className={'wolve_btn page11-btn-stack m-0'}>
                    LOCK FOR SALE
                  </button>
                  <button className={'wolve_btn page11-btn-stack m-0'}>
                    C-FOLIO TRANSFER MANAGER
                  </button>
                </div>

                <div className={'w-100 mt-2 font-13'}>
                  WHAT DOES PACK STRENGTH MEAN AND HOW CAN I SAVE GAS?
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default withTranslation()(Page11);
