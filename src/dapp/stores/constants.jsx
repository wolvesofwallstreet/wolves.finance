/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

// Events (used in dispatcher and emitter)
export const CONNECTION_CHANGED = 'CONNECTION_CHANGED';
export const TX_HASH = 'TX_HASH';

export const ERC20_TOKEN_CONTRACT = 'ERC20_TOKEN_CONTRACT'; // information from token contract

export const PRESALE_BUY = 'PRESALE_BUY'; //call for presale
export const PRESALE_CLAIM = 'PRESALE_CLAIM'; //call for claim presaled tokens
export const PRESALE_STATE = 'PRESALE_STATE'; //request / receive presale information
