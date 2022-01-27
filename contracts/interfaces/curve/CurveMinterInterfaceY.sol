/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

/* solhint-disable func-name-mixedcase */
abstract contract ICurveFiMinterY {
  function mint(address gaugeAddr) external virtual;

  function minted(address _for, address gaugeAddr)
    external
    view
    virtual
    returns (uint256);

  function toggle_approve_mint(address mintingUser) external virtual;

  function token() external view virtual returns (address);
}
