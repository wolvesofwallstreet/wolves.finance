/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/interfaces/IERC20.sol';

abstract contract IYERC20 is IERC20 {
  //Y-token functions
  function deposit(uint256 amount) external virtual;

  function withdraw(uint256 shares) external virtual;

  function getPricePerFullShare() external view virtual returns (uint256);

  function token() external virtual returns (address);
}
