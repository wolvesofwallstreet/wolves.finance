/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * This file is derived from Aave, available under the GNU Affero General
 * Public License 3.0. https://aave.com/
 *
 * SPDX-License-Identifier: Apache-2.0 AND AGPL-3.0-or-later
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

interface AaveLP {
  function deposit(
    address _reserve,
    uint256 _amount,
    uint16 _referralCode
  ) external;

  function getReserveData(address _reserve)
    external
    view
    returns (
      uint256 totalLiquidity,
      uint256 availableLiquidity,
      uint256 totalBorrowsStable,
      uint256 totalBorrowsVariable,
      uint256 liquidityRate,
      uint256 variableBorrowRate,
      uint256 stableBorrowRate,
      uint256 averageStableBorrowRate,
      uint256 utilizationRate,
      uint256 liquidityIndex,
      uint256 variableBorrowIndex,
      address aTokenAddress,
      uint40 lastUpdateTimestamp
    );
}
