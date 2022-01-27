/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

/* solhint-disable func-name-mixedcase */
abstract contract ICurveFiSwapY {
  function add_liquidity(uint256[4] calldata amounts, uint256 minMintAmount)
    external
    virtual;

  function remove_liquidity(uint256 _amount, uint256[4] calldata minAmounts)
    external
    virtual;

  function remove_liquidity_imbalance(
    uint256[4] calldata amounts,
    uint256 maxBurnAmount
  ) external virtual;

  function calc_token_amount(uint256[4] calldata amounts, bool deposit)
    external
    view
    virtual
    returns (uint256);

  function balances(int128 i) external view virtual returns (uint256);

  function coins(int128 i) external view virtual returns (address);
}
