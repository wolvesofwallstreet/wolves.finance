/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import { ethers } from 'ethers';

export type CARD = {
  id: string;
  chainRef: ethers.BigNumber;
  minted: number;
  name: string;
  motto: string;
  description: string;
  type: 'image' | 'movie';
  url: string;
};

export type CARD_LEVEL = {
  levelId: number;
  chainRef: ethers.BigNumber;
  type: string;
  quantity: number;
  price: number;
  autoUpgrade: string;
  profitReward: number;
  header: string;
  cards: CARD[];
};

export type CARDS = {
  levelNames: string[];
  cards: CARD_LEVEL[];
  myPackLevelDescriptions: string[];
};
