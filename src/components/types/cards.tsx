/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
export type CARD = {
  id: string;
  chainRef: number;
  minted: number;
  name: string;
  motto: string;
  description: string;
  type: 'image' | 'movie';
  url: string;
};

export type CARD_LEVEL = {
  levelId: number;
  chainRef: number;
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

export type CFOLIO_ITEM = {
  id: string;
  chainRef: number;
  price: number;
  minted: number;
  maxMintable: number;
  name: string;
  description: string;
  type: string;
  url: string;
};

export type CFOLIO_ITEMS = {
  type: string;
  title: string;
  shortDescription: string;
  description: string;
  constraints?: 'wolves' | 'bois';
  cards: CFOLIO_ITEM[];
};

export const INITIAL_CFOLIO_ITEMS: CFOLIO_ITEMS = {
  type: '',
  title: '',
  shortDescription: '',
  description: '',
  cards: [],
};
