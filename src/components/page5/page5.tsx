/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page5.css';

import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link,RouteComponentProps } from 'react-router-dom';

import Logo from '../../assets/logo.png';

type PAGE5_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type QueryType = 'wolves' | 'bois' | 'myPack' | string;

interface ICurrentCard {
  url: string;
  rarity: string;
  profitSharing: string;
  raidability: string;
  startingApy: string;
  monthUpgrades: string | number;
}

type PAGE5_STATE = {
  type: QueryType;
  currentCard: ICurrentCard;
};

const INITIAL_PAGE5_STATE: PAGE5_STATE = {
  type: 'wolves',
  currentCard: {
    url:
      'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-{res}.mp4',
    rarity: '1/120',
    profitSharing: '55%',
    raidability: '50%',
    startingApy: '120%',
    monthUpgrades: 2,
  },
};

class Page5 extends Component<PAGE5_PROPS, PAGE5_STATE> {
  constructor(props: PAGE5_PROPS) {
    super(props);
    this.state = INITIAL_PAGE5_STATE;
  }

  // componentDidMount(): void {
  // }

  // componentDidUpdate(): void {
  // }

  render(): JSX.Element {
    const { t } = this.props;
    const {  currentCard } = this.state;

    return (
      <>
        <div id="top" className={'wolves-container bg-wolves'}>
          {/* Hero Heading */}
          <div>
            <img src={Logo} alt="WOWS" width="50px" height="50px" />
            <h2 className="tk-vincente-lightbold no-margin">
              {t('page5.welcome-wolves')}
            </h2>
            <h3 className="tk-grotesk-lightbold no-margin">
              {t('page5.header-wolves')}
            </h3>
          </div>

          <div className="mt-4 mb-0 pb-0">
            <span className="tk-vincente-lightbold font-24 single-line fixed-pos">
              &lt;
              <Link to="?page5=back" className="text-white">
                {t('page.back')}
              </Link>
            </span>
            <span className="tk-vincente-lightbold font-24 single-line fixed-pos ml-2 disabled-link">
              <Link to="?page5=prodigy" className="text-white">
                {t('page5.prodigy')}
              </Link>
            </span>
          </div>

          {/* Line */}
          <span className="line-container">
            <span id="left" className="dot" />
            <span className="line" />
            <span id="right" className="dot" />
          </span>

          <div id="page5-section-header">
            <span className="tk-vincente-lightbold font-24 single-line wolves-orange fixed-pos">
              &lt;
              <Link to="?page5?=previousCard">{t('page.previousCard')}</Link>
            </span>
          </div>

          <div id="page5-content-container" className="">
            <div id="page5-content-image">
              <video
                id="page5-content-image-inner"
                disableRemotePlayback={true}
                className="card-visual"
                autoPlay={true}
                loop={true}
                src={currentCard?.url.replace('{res}', '500')}
                poster={currentCard?.url.replace('{res}', '500') + '.jpg'}
                playsInline
              />
            </div>

            <div id="page5-content-text">
              <div>
                <h1 className="tk-vincente-bold font-48 ">
                  {t('page5.card-title')}
                </h1>
                <h2 className="tk-vincente-lightbold font-24">
                  <span className="wolves-orange">MOTO:</span>{' '}
                  {t('page5.card-motto')}
                </h2>
                <span className="tk-grotesk-lightbold font-20 line-break-enable">
                  {t('page5.card-description')}
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

                {/* Button */}
                <div>
                  <button className="page5-btn-stack">
                    {t('page5.btn-stack')}
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
