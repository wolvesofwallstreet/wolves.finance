/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * This file is derived from Compound, available under the BSD 3-Clause
 * license. https://compound.finance/
 *
 * SPDX-License-Identifier: Apache-2.0 AND BSD-3-Clause
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface CTokenInterface is IERC20 {
  function mint(uint256 mintAmount) external returns (uint256);

  function redeem(uint256 redeemTokens) external returns (uint256);

  function exchangeRateStored() external view returns (uint256);

  function supplyRatePerBlock() external view returns (uint256);

  function exchangeRateCurrent() external returns (uint256);
}
