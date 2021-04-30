/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React, {Component} from 'react';
import {TFunction, withTranslation} from 'react-i18next';
import {Link, RouteComponentProps} from 'react-router-dom';

import Logo from '../../../assets/logo.png';
import wolfd_app_devs_flat231_300 from '../../../assets/wolfd_app_devs_flat231_300.jpg';
import PageHeader from "../../theme/pageHeader";

type PAGE8_PROPS = {
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
//
//   [key: string]: string | number;
// }

type PAGE8_STATE = {
  type: QueryType;
  [key: string]: string | number;
};

const INITIAL_PAGE8_STATE: PAGE8_STATE = {
  type: 'wolves',
  input: ''
};

class Page11 extends Component<PAGE8_PROPS, PAGE8_STATE> {

  constructor(props: PAGE8_PROPS) {
    super(props);
    this.state = INITIAL_PAGE8_STATE;
  }

  handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const {name, value} = e.target
    if (name && value) {
      this.setState({
        ...this.state,
        [name]: value
      })
    }
  }

  render(): JSX.Element {
    const {t} = this.props;
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
            <PageHeader
              logoSrc={Logo}
              heading=" WELCOME TO YOUR PACK"
              headingSecondry="THIS BOIS CRYPTOFOLIO, WILL IN TIME, ALLOW YOU TO YIELD FARM, DEFEND THE BOOSTER POOL, HOLD NFT UPGRADES, HOLD OTHER NFTS AND BUNDLE THEM TOGETHER TO SELL, AND MUCH MORE."
            />
          </div>

          <div className="mt-4 mb-0 pb-0">
            <span className="tk-vincente-lightbold font-24 single-line fixed-pos">
              &lt;
              <Link to="?page8=back" className="text-white">
                {t('page.back')}
              </Link>
            </span>
            <span className="tk-vincente-lightbold font-24 single-line fixed-pos ml-2 disabled-link">
              <Link to="?page8=prodigy" className="text-white">
                {t('page8.prodigy')}
              </Link>
            </span>
          </div>

          {/* Line */}
          <span className="line-container">
            <span id="left" className="dot"/>
            <span className="line"/>
            <span id="right" className="dot"/>
          </span>

          <div id="page11-section-header">
            <span className="tk-vincente-lightbold font-24 single-line wolves-orange fixed-pos">
              &lt;
              <Link to="?page8=previousCard">{t('page.previousCard')}</Link>
            </span>
          </div>
          <div id="page11-content-container" className="">
            <div id="page11-content-image">
              <video
                id="page11-content-image-inner"
                disableRemotePlayback={true}
                className="card-visual"
                autoPlay={true}
                loop={true}
                src={"https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4".replace('{res}', '500')}
                poster={"https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4".replace('{res}', '500') + '.jpg'}
                playsInline
              />
              <img className="page11-content-small-image" src={wolfd_app_devs_flat231_300} alt={"BRYANT_BARK_500"}/>
            </div>

            <div className="page11-content-text">
              <div>
                <div>
                  <ul className="info-ribbon tk-grotesk-lightbold ">
                    {Object.entries(extraInfo).map(([key, value], i) => (
                      <li key={key + i}>
                        {key !== undefined && `${key} : ${value}`}
                      </li>
                    ))}
                  </ul>
                </div>
                <h1 className="h-1 f-vincente">
                  BRYANT BARKLEY
                </h1>
                <h2 className="tk-vincente-lightbold font-24">
                  <span className="wolves-orange">MOTO:</span>
                  BUY WHEN THERE IS BLOOD ON THE STREET
                </h2>
                <div>
                  <p className={'tk-grotesk-lightbold font-16 line-break-enable'}>
                    Wall Street Hustler - He’s worked his way up from the actual street. Learning the hustle on the street
                    has given him the perfect grounding for working the trade floor. Forget rough diamond this trader is a
                    blood diamond, and isnt afraid to step on toes and ears to make the deals he needs.
                  </p>
                  <p className={'tk-grotesk-lightbold font-16 line-break-enable'}>
                    his is a staker card and allows to stake Wolf on the tradefloor and also Raid. You can sell this character licence at any point wither on our platform or on opensea
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

                <div className="w-100 page5-grid-btn ">
                  <div className={'d-flex justify-content-between page4-text-input'}>
                    <div className="">
                      MAX
                    </div>
                    <div className="">
                      50%
                    </div>
                  </div>

                  <div></div>
                  <button className={'page5-btn-stack m-0'}>
                    CLAIM REWARDS
                  </button>
                  <button className={'page5-btn-stack m-0 bg-blue-dark --text-gray'}>
                    CLAIM REWARDS & DESTROY NFT (UNSTAKE)
                  </button>
                  <button className={'page5-btn-stack m-0'}>
                    LOCK FOR SALE
                  </button>
                  <button className={'page5-btn-stack m-0'}>
                    C-FOLIO TRANSFER MANAGER
                  </button>
                </div>
              </div>
            </div>

            <div id="page11-content-image">
              <button className={'w-100 m-0 page5-btn-stack bg-blue-transparent text-white'}>
                AUTO UPGRADE : 15 PROWESS 43 : 21 : 56
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default withTranslation()(Page11);
