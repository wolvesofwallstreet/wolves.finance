/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './page5.css';

import React, { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import Logo from './../../assets/logo.png';

type PAGE5_PROPS = {
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

type PAGE5_STATE = {
  type: QueryType;
  [key: string]: string | number;
};

const INITIAL_PAGE5_STATE: PAGE5_STATE = {
  type: 'wolves',
  input: '',
};

class Page5 extends Component<PAGE5_PROPS, PAGE5_STATE> {
  constructor(props: PAGE5_PROPS) {
    super(props);
    this.state = INITIAL_PAGE5_STATE;
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
        <div
          id="top"
          className={
            'page5-container d-flex flex-column justify-content-center bg-wolves text-center text-white'
          }
        >
          {/* Title & heading */}
          <div>
            {<img src={Logo} alt="Logo" width="50px" height="50px" />}
            <h2 className="tk-vincente-lightbold font-28 single-line">
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

          {/* Content */}
          <div className={'page6-two-col-container center-container my-5'}>
            <div className="d-flex flex-column align-items-start justify-content-even pr-sm-0 m pr-md-4 pr-lg-4 mb-3 p_relative">
              <div className="p_relative">
                <video
                  id="page5-content-image-inner"
                  disableRemotePlayback={true}
                  className=""
                  autoPlay={true}
                  loop={true}
                  src={'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-{res}.mp4'.replace(
                    '{res}',
                    '500'
                  )}
                  poster={
                    'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-{res}.mp4'.replace(
                      '{res}',
                      '500'
                    ) + '.jpg'
                  }
                  playsInline
                />
                <img
                  className="page5-content-small-image"
                  src={
                    'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg'
                  }
                  alt={'img8'}
                />

                <button
                  className={
                    'wolve_btn w-100 m-0 mt-2 mb-1 page5-btn-stack bg-blue-transparent-dark text-white'
                  }
                >
                  AUTO UPGRADE : 15 PROWESS 43 : 21 : 56
                </button>
              </div>
            </div>

            <div className={'t-left pl-2'}>
              <div>
                <div>
                  <ul className="page5-info-ribbon tk-grotesk-lightbold ">
                    {Object.entries(extraInfo).map(([key, value], i) => (
                      <li key={key + i} className="font-10 ">
                        <span className="">
                          {key !== undefined && `${key} : ${value}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <h1 className="tk-vincente-bold h-1 tk-vincente ">
                  GORGAN DECKO
                </h1>
                <h2 className="tk-vincente-lightbold font-24">
                  <span className="wolves-color-orange">MOTO:</span>
                  BUY WHEN THERE IS BLOOD ON THE STREET
                </h2>
                <div className="tk-grotesk-lightbold font-16 line-break-enable">
                  <p
                  // className={'tk-grotesk-lightbold font-16 line-break-enable'}
                  >
                    Wall Street Hustler - He’s worked his way up from the actual
                    street. Learning the hustle on the street has given him the
                    perfect grounding for working the trade floor. Forget rough
                    diamond this trader is a blood diamond, and isnt afraid to
                    step on toes and ears to make the deals he needs.
                  </p>
                  <p
                  // className={'tk-grotesk-lightbold font-16 line-break-enable'}
                  >
                    his is a staker card and allows to stake Wolf on the
                    tradefloor and also Raid. You can sell this character
                    licence at any point wither on our platform or on opensea
                  </p>
                </div>

                <ul className="rarity-box">
                  <li>
                    <h2 className="tk-vincente font-28">RARITY: 1/120 </h2>
                  </li>
                  <li>
                    <h2 className="tk-vincente font-28">PROWESS: 50% </h2>
                  </li>
                  <li>
                    <h2 className="tk-vincente font-28">STARTING APY: 120% </h2>
                  </li>
                </ul>

                <div className="d-grid mb-2">
                  <div className="p_relative">
                    <input
                      type="text"
                      className="wolve_input text-white font-14"
                      style={{ paddingRight: '125px' }}
                    />
                    <div className="wolve_input_max">MAX</div>
                    <div className={'wolve_input_label font-14'}>50%</div>
                  </div>
                </div>

                <div className="page5_button_continer">
                  <button className={'wolve_btn page5_btn  font-10'}>
                    CLAIM REWARDS
                  </button>
                  <button
                    className={
                      'wolve_btn page5_btn font-10 bg-blue-transparent-dark text-gray'
                    }
                  >
                    CLAIM REWARDS & DESTROY NFT (UNSTAKE)
                  </button>
                  <button className={'wolve_btn page5_btn  font-10'}>
                    LOCK FOR SALE
                  </button>
                  <button className={'wolve_btn page5_btn  font-10'}>
                    C-FOLIO TRANSFER MANAGER
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default withTranslation()(Page5);
