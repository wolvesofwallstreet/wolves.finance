/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

interface IStrategy {
  function getId() external pure returns (bytes32);

  function approve(address token) external;

  function invest(address token, uint256 assetAmount)
    external
    returns (uint256);

  function redeem(address token, uint256 poolAmount) external returns (uint256);

  function balanceOf(address token, address _owner)
    external
    view
    returns (uint256);

  function getAssetAmount(address token, address _owner)
    external
    view
    returns (uint256);

  function getApr(address token) external view returns (uint256);

  function refresh(address token) external;
}
