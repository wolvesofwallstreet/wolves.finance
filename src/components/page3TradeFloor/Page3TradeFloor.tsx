/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './Page3TradeFloor.css';

import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import * as cFolioItems from '../../locales/en_US/cFolioItems.json';

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
interface IWolvesCards {
  id: string;
  chainRef: number;
  minted: number;
  constraint: string;
  name: string;
  motto: string;
  description: string;
  type: string;
  url: string;
}

type PAGE7_PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type PAGE7_STATE = {
  cards: Array<ICard>;
  cFolioItems: Array<IWolvesCards>;
};

const INITIAL_PAGE7_STATE: PAGE7_STATE = {
  cFolioItems: cFolioItems.wolves,
  cards: [
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      poster:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      poster:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      poster:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      poster:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },

    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      poster:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      poster:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },

    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      poster:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
    {
      title: 'MINT NFT',
      moto: 'FILL IT OR KILL IT',
      image:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      poster:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4.jpg',
      video:
        'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-300.mp4',
      bucket: '1/100',
      cardId: 'gorgan',
      levelId: '1',
    },
  ],
};

// PAGE 3
class Page3TradeFloor extends Component<PAGE7_PROPS, PAGE7_STATE> {
  constructor(props: PAGE7_PROPS) {
    super(props);
    this.state = INITIAL_PAGE7_STATE;
  }

  render(): JSX.Element {
    // const { t } = this.props;
    const { cFolioItems } = this.state;

    const cardRender =
        cFolioItems?.length &&
        cFolioItems
            .map((card, index) => {
              return (
                  <div className="page3Trade-card" key={index + Math.random()}>
                    <Link to={`staked-invest?type=wolves&levelId=0&cardId=${card.id}`}>
                      <video
                          className="card-media"
                          src={card.url}
                          poster={card.url}
                          autoPlay
                          loop
                          playsInline
                      />
                    </Link>
                    <span className="tk-vincente-lightbold font-32 m-0 mt-2 line-h">
                {card?.name}
              </span>
                    <span className="tk-grotesk-lightbold font-14 ellipsis">
                MOTTO: {card?.motto}
              </span>
                    <hr className="wolves"/>
                    <span className="tk-vincente font-32 m-0 line-h ellipsis">
                {card?.minted || 1}/100
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
          <span className="line-container page3Trade-line-w-80">
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
          <div className="page3Trade-card-container mt-5">{cardRender}</div>
        </div>
        </>
    );
  }
}

export default withTranslation()(Page3TradeFloor);
