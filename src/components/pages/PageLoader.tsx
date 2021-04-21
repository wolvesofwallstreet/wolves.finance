/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React from "react";
import {TFunction, withTranslation} from 'react-i18next';
import {RouteComponentProps} from "react-router-dom";

import Page4 from "./update/Page4";
import Page7 from './update/Page7';
import Page9 from "./update/Page9";

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
  match: RouteComponentProps['match'];
};

function ExamplePage({t, ...props}: PROPS) {
  let component = (<h1>Component Loader (Dev only)</h1>)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  switch (props?.match?.params?.page) {
    case 'page4':
      component = (<Page4 {...props} />)
      break

    case 'page7':
      component = (<Page7 {...props} />)
      break

    case 'page9':
      component = (<Page9 {...props} />)
      break

    default:
      break;
  }

  return (
    <>
      {component}
    </>
  );
}

export default withTranslation()(ExamplePage);

// https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-300.jpg
