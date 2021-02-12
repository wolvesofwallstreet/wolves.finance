/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

// Events (used in dispatcher and emitter)
export const ADDRESS_COPIED = 'ADDRESS_COPIED';
export const CONNECTION_CHANGED = 'CONNECTION_CHANGED';
export const NEW_BLOCK = 'NEW_BLOCK'; // Block ticker

export const ERC20_TOKEN_CONTRACT = 'ERC20_TOKEN_CONTRACT'; // information from token contract

export const PRESALE_BUY = 'PRESALE_BUY'; // call for presale / buy tokens
export const PRESALE_LIQUIDITY = 'PRESALE_LIQUIDITY'; // call for presale / buy and provide liq.
export const PRESALE_STATE = 'PRESALE_STATE'; // request / receive presale information

export const STAKE_STATE = 'STAKE_STATE'; // request Stake information
