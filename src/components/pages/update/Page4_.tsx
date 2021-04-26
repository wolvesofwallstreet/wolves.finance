/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */


// import './page4.css'; // TODO

import React from "react";
import {TFunction, withTranslation} from 'react-i18next';
import {Link, RouteComponentProps} from "react-router-dom";

import Hr from "../../theme/hr";
import HorizontalLine from "../../theme/line";
import PageHeader from "../../theme/pageHeader";
import WolveCard from "../../theme/wolveCard";

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

type QueryLevelTypes = 'PRODIGY' | 'PHENOM';

const levelTypes = {
  PRODIGY: 'PRODIGY',
  PHENOM: 'PHENOM'
}

const Page4_ = ({t, location, history,}: PROPS) => {
  const [currentLevelType, setCurrentLevelType] = React.useState(levelTypes.PHENOM);

  React.useEffect(() => {
    const query = new URLSearchParams(location.search);
    setCurrentLevelType(query.get('levelType') as QueryLevelTypes)
  }, [history, location]);

  const cards = [
    {
      levelType: levelTypes.PRODIGY,
      moto: 'FILL IT OR KILL IT',
      title: 'WARG THE WATCHER',
      src: 'x-special/nautilus-clipboardx-special/nautilus-clipboardbryant_bark.png',
      quantity: '1/100 - 20 WOLF'
    },
    {
      levelType: levelTypes.PHENOM,
      title: 'WARG THE WATCHER',
      moto: 'FILL IT OR KILL IT  [P]',
      src: 'bryant_bark.png',
      quantity: '1/100 - 20 WOLF'
    }, {
      levelType: levelTypes.PRODIGY,
      moto: 'FILL IT OR KILL IT',
      title: 'WARG THE WATCHER',
      src: 'x-special/nautilus-clipboardx-special/nautilus-clipboardbryant_bark.png',
      quantity: '1/100 - 20 WOLF'
    },
    {
      levelType: levelTypes.PHENOM,
      title: 'WARG THE WATCHER',
      moto: 'FILL IT OR KILL IT  [P]',
      src: 'bryant_bark.png',
      quantity: '1/100 - 20 WOLF'
    }, {
      levelType: levelTypes.PRODIGY,
      moto: 'FILL IT OR KILL IT',
      title: 'WARG THE WATCHER',
      src: 'x-special/nautilus-clipboardx-special/nautilus-clipboardbryant_bark.png',
      quantity: '1/100 - 20 WOLF'
    },
    {
      levelType: levelTypes.PHENOM,
      title: 'WARG THE WATCHER',
      moto: 'FILL IT OR KILL IT  [P]',
      src: 'bryant_bark.png',
      quantity: '1/100 - 20 WOLF'
    }, {
      levelType: levelTypes.PRODIGY,
      moto: 'FILL IT OR KILL IT',
      title: 'WARG THE WATCHER',
      src: 'x-special/nautilus-clipboardx-special/nautilus-clipboardbryant_bark.png',
      quantity: '1/100 - 20 WOLF'
    },
    {
      levelType: levelTypes.PHENOM,
      title: 'WARG THE WATCHER',
      moto: 'FILL IT OR KILL IT  [P]',
      src: 'bryant_bark.png',
      quantity: '1/100 - 20 WOLF'
    },
  ]

  return (
    <>
      <div className={'wolves-container bg-wolves text-white'}>

        {/* Title, heading */}
        <div>
          <PageHeader
            logoSrc="/static/media/logo.ac917530.png"
            heading="WELCOME TO THE BOIS"
            headingSecondry="IN ORDER TO STAKE WITH WOLVES ON THE WOLF TRADEFLOOR YOU WILL NEED TO PURCHASE YOUR SFT CHARACTER CRYPTO LICENCE"
          />
        </div>

        {/* H-line */}
        <div style={{width: '85%'}}>
          <HorizontalLine/>
        </div>

        {/* Nav-bar */}
        <div>
            <span className="tk-vincente-lightbold font-24  single-line wolves-orange fixed-pos">
              {/* TODO:: margin-top */}
              <Link
                to={`?levelType=${levelTypes.PRODIGY}`}
                className={`text-white mt-5 m-4 ${levelTypes.PRODIGY === currentLevelType && 'nav-link-active'}`}>
                {levelTypes.PRODIGY}
              </Link>
              <Link
                to={`?levelType=${levelTypes.PHENOM}`}
                className={`text-white mt-5 m-4 ${levelTypes.PHENOM === currentLevelType && 'nav-link-active'}`}>
                {levelTypes.PHENOM}
              </Link>
            </span>
        </div>

        {/* Cards */}
        <div className="page4-card-container">
          {cards
            // .filter((card) => card.levelType === currentLevelType)
            .map((card, i) => {
              return (
                <WolveCard
                  key={i + Math.random()}
                  cardLink={`?levelType=PHENOM&cardType=${i}`} // CARD URL
                  linkType="image"
                  // src={`${process.env.PUBLIC_URL}/assets/bryant_bark.png`} // CARD IMG/VIDEO
                  // TODO::SRC-IMG
                  // src={`https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-300.jpg`} // CARD IMG/VIDEO
                  media_className={'img-bryant_bark-300'}
                  bottomContent={
                    <>
                  <span
                    className="tk-vincente-lightbold font-32 mt-3s"
                    style={{lineHeight: 0.8}}
                  >
                    {card.title}
                  </span>
                      <span className="tk-grotesk-lightbold font-14 ellipsis">
                    MOTTO: {card.moto}
                  </span>
                      <Hr/>
                      <h2 className="tk-vincente-lightbold ellipsis">
                        {card.quantity}
                      </h2>
                    </>
                  }
                />
              )
            })}
        </div>

      </div>
    </>
  );
}

export default withTranslation()(Page4_);


// const t = () => {
//   history.push(`${window.location.pathname}&page=${1}`)
// }
