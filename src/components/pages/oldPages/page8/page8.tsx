/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page8.css';

import {Component} from 'react';
import {TFunction, withTranslation} from 'react-i18next';
import {Link, RouteComponentProps} from 'react-router-dom';

import Logo from '../../../../assets/logo.png';

type PAGE8_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type QueryType = 'wolves' | 'bois' | 'myPack';

interface ICurrentCard {
  rarity: string;
  profitSharing: string;
  url: string;
  relative_img: string;
  raidability: string;
  startingApy: string;
  monthUpgrades: string | number;
}

type PAGE8_STATE = {
  type: QueryType;
  currentCard: ICurrentCard;
};

const INITIAL_PAGE8_STATE: PAGE8_STATE = {
  type: 'wolves',
  currentCard: {
    url:
      'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-{res}.mp4',
    relative_img: 'https://4travelers.de/wolves_assets/cards/wolves/level2/MAX-{res}.mp4',
    rarity: '1/120',
    profitSharing: '55%',
    raidability: '50%',
    startingApy: '120%',
    monthUpgrades: 2,
  },
};

class Page8 extends Component<PAGE8_PROPS, PAGE8_STATE> {
  constructor(props: PAGE8_PROPS) {
    super(props);
    this.state = INITIAL_PAGE8_STATE;
  }

  // componentDidMount(): void {
  // }

  // componentDidUpdate(): void {
  // }

  render(): JSX.Element {
    const {t} = this.props;
    const {currentCard} = this.state;

    const extraInfo = {
      LPToken: '0.00 ',
      Staked: '0.00 ',
      Earned: '0.000000 WOWS',
      'APY*': '394.45% ',
      APR: '162.31%',
    };

    if (!currentCard) return <div>No content</div>;

    return (
      <>
        <div id="top" className={'wolves-container bg-wolves'}>
          {/* Hero Heading */}
          <div>
            <img src={Logo} alt="WOWS" width="50px" height="50px"/>
            <h2 className="tk-vincente-lightbold no-margin">
              {t('page8.welcome-wolves')}
            </h2>
            <h3 className="tk-grotesk-lightbold no-margin">
              {t('page8.header-wolves')}
            </h3>
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

          <div id="page8-section-header">
            <span className="tk-vincente-lightbold font-24 single-line wolves-orange fixed-pos">
              &lt;
              <Link to="?page8=previousCard">{t('page.previousCard')}</Link>
            </span>
          </div>

          <div id="page8-content-container" className="">
            <div id="page8-content-image">
              <video
                id="page8-content-image-inner"
                disableRemotePlayback={true}
                className="card-visual"
                autoPlay={true}
                loop={true}
                src={currentCard?.url.replace('{res}', '500')}
                poster={currentCard?.url.replace('{res}', '500') + '.jpg'}
                playsInline
              />
              <img className="page8-content-small-image" src={currentCard?.relative_img.replace('{res}', '500') + '.jpg'} alt={"img8"}/>
            </div>

            <div className="page8-content-text">
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
                <h1 className="tk-vincente-bold font-48 ">
                  {t('page8.card-title')}
                </h1>
                <h2 className="tk-vincente-lightbold font-24">
                  <span className="wolves-orange">MOTO:</span>{' '}
                  {t('page8.card-motto')}
                </h2>
                <span className="tk-grotesk-lightbold font-20 line-break-enable">
                  {t('page8.card-description')}
                </span>
                <ul className="tk-vincente-bold font-24 rarity-box">
                  <li>
                    <h2>RARITY: {currentCard?.rarity}</h2>
                  </li>
                  <li>
                    <h2>PROFIT SHARING: {currentCard?.profitSharing}% </h2>
                  </li>
                  <li>
                    <h2>RAIDABILITY: {currentCard?.raidability}</h2>
                  </li>
                  <li>
                    <h2 className="text-uppercase">
                      Auto upgrade {currentCard?.monthUpgrades} months
                    </h2>
                  </li>
                </ul>
              </div>

              {/* Button */}
              <div>
                <button className="page8-btn-stack">
                  {t('page8.btn-stack')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default withTranslation()(Page8);
