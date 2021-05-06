/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

abstract contract ICurveFi_DepositY {
  function add_liquidity(uint256[4] calldata uamounts, uint256 min_mint_amount)
    external
    virtual;

  function remove_liquidity(uint256 _amount, uint256[4] calldata min_uamounts)
    external
    virtual;

  function remove_liquidity_imbalance(
    uint256[4] calldata uamounts,
    uint256 max_burn_amount
  ) external virtual;

  function coins(int128 i) external view virtual returns (address);

  function underlying_coins(int128 i) external view virtual returns (address);

  function underlying_coins() external view virtual returns (address[4] memory);

  function curve() external view virtual returns (address);

  function token() external view virtual returns (address);
}
