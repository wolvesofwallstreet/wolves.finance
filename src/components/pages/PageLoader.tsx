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

import Page4 from './update/Page4';
import Page5 from './update/Page5';
import Page6 from './update/Page6';
import Page7 from './update/Page7';
import Page8 from './update/Page8';
import Page9 from './update/Page9';
import Page11 from './update/Page11';
import Page12 from "./update/Page12";
import Page13 from './update/Page13';
import Page14 from './update/Page14';
import Page15 from './update/Page15';

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
      component = <Page4 {...props} />;
      break;

    case 'page5':
      component = <Page5 {...props} />;
      break;

    case 'page6':
      component = <Page6 {...props} />;
      break;

    case 'page7':
      component = <Page7 {...props} />;
      break;

    case 'page8':
      component = <Page8 {...props} />;
      break;

    case 'page9':
      component = <Page9 {...props} />;
      break;

    // case 'page10': /// WIP 100%
    //   // component = <Page11 {...props} />;
    //   break;

    case 'page11':
      component = <Page11 {...props} />;
      break;

    case 'page12': /// WIP 100%
      component = <Page12 {...props} />;
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
