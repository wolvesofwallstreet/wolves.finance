/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import BoisBoardroomsPage7 from './BoisBoardroomsPage7';
import BoisBoardroomsPage9 from './BoisBoardroomsPage9';
import CFolioManagerPage12 from "./CFolioManagerPage12";
import BoisBoardroomsPage8 from './InvestmentSftsPage8';
import MyPackPage6 from './MyPackPage6';
import Page5 from './Page5';
import Page11 from './Page11';
import Page13 from './Page13';
import Page14 from './Page14';
import Page15 from './Page15';
import TradeFloorPage4 from './TradeFloorPage4';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
  match: RouteComponentProps['match'];
};

function ExamplePage({ t, ...props }: PROPS) {
  let component = <h1>Component Loader (Dev only)</h1>;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  switch (props?.match?.params?.page) {
    case 'page4':
      component = <TradeFloorPage4 {...props} />;
      break;

    case 'page5':
      component = <Page5 {...props} />;
      break;

    case 'page6':
      component = <MyPackPage6 {...props} />;
      break;

    case 'page7':
      component = <BoisBoardroomsPage7 {...props} />;
      break;

    case 'page8':
      component = <BoisBoardroomsPage8 {...props} />;
      break;

    case 'page9':
      component = <BoisBoardroomsPage9 {...props} />;
      break;

    // case 'page10': /// WIP 100%
    //   // component = <Page11 {...props} />;
    //   break;

    case 'page11':
      component = <Page11 {...props} />;
      break;

    case 'page12': /// WIP 100%
      component = <CFolioManagerPage12 {...props} />;
      break;

    case 'page13':
      component = <Page13 {...props} />;
      break;

    case 'page14': // WIP Count, ...
      component = <Page14 {...props} />;
      break;

    case 'page15': // WIP Count, ...
      component = <Page15 {...props} />;
      break;

    default:
      break;
  }

  return <>{component}</>;
}

export default withTranslation()(ExamplePage);

// https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-300.jpg
