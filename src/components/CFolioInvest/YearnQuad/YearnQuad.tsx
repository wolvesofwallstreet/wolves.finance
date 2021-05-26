/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './YearnQuad.css';

import { TFunction, withTranslation } from 'react-i18next';

import { SFT, SFTCHILD } from '../../../stores/store';

type PROPS = {
  t: TFunction;
  investCurrency: string;
  cfolioItem?: SFTCHILD;
  sft?: SFT;
};

function YearnQuad({ cfolioItem, investCurrency, sft, t }: PROPS): JSX.Element {
  return <></>;
}

export default withTranslation()(YearnQuad);
