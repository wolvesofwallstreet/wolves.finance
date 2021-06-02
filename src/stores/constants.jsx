/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

// Events (used in dispatcher and emitter)
export const ASSETS_STATE = 'ASSETS_STATE';

export const ADDRESS_COPIED = 'ADDRESS_COPIED';
export const CONNECTION_CHANGED = 'CONNECTION_CHANGED';
export const NEW_BLOCK = 'NEW_BLOCK'; // Block ticker

export const ERC20_TOKEN_CONTRACT = 'ERC20_TOKEN_CONTRACT'; // information from token contract

export const STAKE_ADD = 'STAKE_ADD'; // stake LP tokens
export const STAKE_CLAIM = 'STAKE_CLAIM'; // claim stake rewards
export const STAKE_EXIT = 'STAKE_EXIT'; // unstake and claim rewards
export const STAKE_STATE = 'STAKE_STATE'; // request Stake information
export const STAKE_LP_AVAILABLE = 'STAKE_LP_AVAILABLE'; // Available LP token

export const SFT_BUY = 'SFT_BUY'; // Buy (mint) an SFT with given level / class
export const SFT_LOCK = 'SFT_LOCK'; // Transfer SFT to TradingFloor contract
export const SFT_UNLOCK = 'SFT_UNLOCK'; // Burn NFT, transfer SFT back
export const SFT_REWARD = 'SFT_REWARD'; // REQUEST REWARD INFO

export const CFOLIO_ITEM_BUY = 'CFOLIO_ITEM_BUY'; // Buy (mint) cfolioItem
export const CFOLIO_ITEM_DEPOSIT_LP = 'CFOLIO_ITEM_DEPOSIT_LP'; // Add LP token into existing CFI
export const CFOLIO_ITEM_WITHDRAW_LP = 'CFOLIO_ITEM_WITHDRAW_LP'; // Remove LP token from existing CFI
export const CFOLIO_ITEM_LOCK_TRANSFER = 'CFOLIO_ITEM_LOCK_TRANSFER'; // LockTransfer / transfer CFI's
