/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

/* solhint-disable func-name-mixedcase */
abstract contract ICurveFiGauge {
  function lp_token() external view virtual returns (address);

  function crv_token() external view virtual returns (address);

  function balanceOf(address addr) external view virtual returns (uint256);

  function deposit(uint256 _value) external virtual;

  function withdraw(uint256 _value) external virtual;

  function claimable_tokens(address addr) external virtual returns (uint256);

  function minter() external view virtual returns (address); //use minter().mint(gauge_addr) to claim CRV

  function integrate_fraction(address _for)
    external
    view
    virtual
    returns (uint256);

  function user_checkpoint(address _for) external virtual returns (bool);
}
