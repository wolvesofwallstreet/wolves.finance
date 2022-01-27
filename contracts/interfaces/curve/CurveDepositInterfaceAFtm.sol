/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

/* solhint-disable func-name-mixedcase */
abstract contract ICurveFiDepositAFtm {
  function add_liquidity(uint256[2] calldata uAmounts, uint256 minMintAmount)
    external
    virtual
    returns (uint256);

  function remove_liquidity(uint256 amount, uint256[2] calldata minUAmounts)
    external
    virtual
    returns (uint256[2] memory);

  function remove_liquidity_imbalance(
    uint256[2] calldata uAmounts,
    uint256 maxBurnAmount
  ) external virtual returns (uint256);

  function calc_withdraw_one_coin(uint256 wrappedAmount, int128 coinIndex)
    external
    view
    virtual
    returns (uint256 underlyingAmount);

  function remove_liquidity_one_coin(
    uint256 wrappedAmount,
    int128 coinIndex,
    uint256 minAmount
  ) external virtual returns (uint256);

  function coins(uint256 i) external view virtual returns (address);
}
