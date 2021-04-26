/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import IMG_GREEN_ETH_WOWS_LP_TOKEN_300 from '../../../assets/wolfd_app_devs_flat2_136_300.jpg';
import IMG_BLUE_ETH_WOWS_LP_TOKEN_300 from '../../../assets/wolfd_app_devs_flat231_300.jpg';

interface ICard {
  title: string;
  moto: string;
  image: string;
  video: string;
  poster: string;
  bucket: string | number | [];
  cardId: number | string;
  levelId: number | string;
}

type PAGE7_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type PAGE7_STATE = {
  cards: Array<ICard>;
};

const INITIAL_PAGE7_STATE: PAGE7_STATE = {
  cards: [
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image: IMG_GREEN_ETH_WOWS_LP_TOKEN_300,
      poster: IMG_GREEN_ETH_WOWS_LP_TOKEN_300,
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image: IMG_GREEN_ETH_WOWS_LP_TOKEN_300,
      poster: IMG_GREEN_ETH_WOWS_LP_TOKEN_300,
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image: IMG_BLUE_ETH_WOWS_LP_TOKEN_300,
      poster: IMG_BLUE_ETH_WOWS_LP_TOKEN_300,
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image: IMG_BLUE_ETH_WOWS_LP_TOKEN_300,
      poster: IMG_BLUE_ETH_WOWS_LP_TOKEN_300,
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },

    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image: IMG_GREEN_ETH_WOWS_LP_TOKEN_300,
      poster: IMG_GREEN_ETH_WOWS_LP_TOKEN_300,
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image: IMG_GREEN_ETH_WOWS_LP_TOKEN_300,
      poster: IMG_GREEN_ETH_WOWS_LP_TOKEN_300,
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },

    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image: IMG_BLUE_ETH_WOWS_LP_TOKEN_300,
      poster: IMG_BLUE_ETH_WOWS_LP_TOKEN_300,
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image: IMG_BLUE_ETH_WOWS_LP_TOKEN_300,
      poster: IMG_BLUE_ETH_WOWS_LP_TOKEN_300,
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
  ],
};

class Page7 extends Component<PAGE7_PROPS, PAGE7_STATE> {
  constructor(props: PAGE7_PROPS) {
    super(props);
    this.state = INITIAL_PAGE7_STATE;
  }

  render(): JSX.Element {
    // const { t } = this.props;
    const { cards } = this.state;

    const cardRender =
      cards?.length &&
      cards.map((card) => {
        return (
          <div className="page8-card">
            <Link
              to={`detail?type=wolves&levelId=${card?.levelId}&cardId=${card.cardId}`}
            >
              <video
                className="card-media"
                src={card.image}
                poster={card.poster}
                autoPlay
                loop
                playsInline
              />
            </Link>
            <span className="tk-vincente-lightbold font-32 m-0 mt-2 line-h">
              {card?.title}
            </span>
            <span className="tk-grotesk-lightbold font-14 ellipsis">
              MOTTO: {card?.moto}
            </span>
            <hr className="wolves" />
            <span className="f-vincente font-32 m-0 line-h ellipsis">
              {card?.bucket}
            </span>
          </div>
        );
      });

    return (
      <>
        <div id="top" className={'wolves-container bg-wolves'}>
          {/* Hero heading */}
          <div className="mb-3">
            <h2 className="tk-vincente-lightbold no-margin">
              WELCOME TO THE YEARN CRV POOL NFTs
            </h2>
            <h3 className="tk-grotesk-lightbold no-margin">
              YEARN NFTs FOR YOUR LENDING FOR DAI / USDT / USDC / TUSD
            </h3>
          </div>

          {/* Line */}
          <span className="line-container page8-line-w-80">
            <span id="left" className="dot" />
            <span className="line" />
            <span id="right" className="dot" />
          </span>

          {/* Section title */}
          <span className="tk-vincente-lightbold">
            <span className="font-24">
              CORE LP NFT
              <div id="triangle-down" />
            </span>
          </span>

          {/* Cards listing */}
          <div className="page8-card-container mt-5">{cardRender}</div>
        </div>
      </>
    );
  }
}

export default withTranslation()(Page7);
