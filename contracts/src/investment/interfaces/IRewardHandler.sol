/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

interface IRewardHandler {
  /**
   * @dev Transfer reward and distribute the fee
   * Future implementation
   *
   * _to values are in 1e6 factor notation.
   */
  function distribute2(
    address recipient,
    uint256 amount,
    uint32 fee
  ) external;

  /**
   * @dev Transfer reward and distribute the fee
   * Backward compatibility implementation
   *
   * _to values are in 1e6 factor notation.
   */
  function distribute(
    address recipient,
    uint256 amount,
    uint32 fee,
    uint32 toTeam,
    uint32 toMarketing,
    uint32 toBooster,
    uint32 toRewardPool
  ) external;
}
