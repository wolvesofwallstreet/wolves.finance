/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page6.css';

import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';
//

// import Logo from '../../assets/logo.png';
// import { CARD_LEVEL } from '../types/cards';

type PAGE6_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type QueryType = 'wolves' | 'bois' | 'myPack';

interface ICurrentCard {
  url: string;
  rarity: string;
  profitSharing: string;
  raidability: string;
  startingApy: string;
  monthUpgrades: string | number ;
}

type PAGE6_STATE = {
  type: QueryType;
  currentCard: ICurrentCard;
};

const INITIAL_PAGE6_STATE: PAGE6_STATE = {
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

class Page6 extends Component<PAGE6_PROPS, PAGE6_STATE> {
  constructor(props: PAGE6_PROPS) {
    super(props);
    this.state = INITIAL_PAGE6_STATE;
  }

  // componentDidMount(): void {
  // }

  // componentDidUpdate(): void {
  // }

  render(): JSX.Element {
    const { t } = this.props;
    const { currentCard } = this.state;

    const sliderImgs = [
      {
        src:
          'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
        count: 10,
        selected: false,
      },
      {
        src:
          'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
        count: 15,
        selected: false,
      },
      {
        src:
          'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
        count: 20,
        selected: true,
      },
      {
        src:
          'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
        count: 25,
        selected: false,
      },
      {
        src:
          'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
        count: 30,
        selected: false,
      },
    ];

    const sliderRender = sliderImgs.map((slide, idx) => {
      return (
        <div className="page6-slider-card" key={idx}>
          <img
            className={
              'page6-slider-card-img ' +
              (slide.selected && 'page6-slider-card-img-active')
            }
            src={slide.src}
            alt="IMg1"
          />
          <span className="page6-slider-card-count font-14">
            {slide.count}
          </span>
        </div>
      );
    });

    return (
      <>
        <div id="top" className={'wolves-container bg-wolves pt-5'}>
          {/* Hero Heading */}
          <div>
            <h2 className="tk-vincente-lightbold no-margin">
              {t('page6.welcome-wolves')}
            </h2>
            <h3 className="tk-grotesk-lightbold no-margin">
              {t('page6.header-wolves')}
            </h3>
          </div>

          <div className="page6-slider-container">
            {/* <div> Left </div> */}
            <div className="page6-slider">{sliderRender}</div>
            {/* <div> Right </div> */}
          </div>

          <div id="page6-content-container" className="">
            <div id="page6-content-image">
              <video
                id="page6-content-image-inner"
                disableRemotePlayback={true}
                className="card-visual"
                autoPlay={true}
                loop={true}
                src={currentCard?.url.replace('{res}', '500')}
                poster={currentCard?.url.replace('{res}', '500') + '.jpg'}
                playsInline
              />
            </div>

            <div id="page6-content-text">
              <div>
                <h1 className="tk-vincente-bold font-48 ">
                  Dynamic: WOLVES WOWS/ETH NFT
                </h1>

                <span className="tk-grotesk-lightbold font-20 line-break-enable">
                  Wall Street Hustler - He’s worked his way up from the actual
                  street. Learning the hustle on the street has given him the
                  perfect grounding for working the trade floor. Forget rough
                  diamond this trader is a blood diamond, and isnt afraid to
                  step on toes and ears to make the deals he needs.
                  <br />
                  <br />
                  This is a staker card and allows to stake Wolf on the
                  tradefloor and also Raid. You can sell this character licence
                  at any point wither on our platform or on opensea
                </span>

                {/* Button */}
                <div>
                  <button className="page6-btn-stack">
                    Dynamic: ETH/WOWS NFT
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

export default withTranslation()(Page6);
