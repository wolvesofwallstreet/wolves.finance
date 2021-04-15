/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

interface ITradeFloor {
  /**
   * @dev called from previous TradeFloorClient if it gets upgraded.
   */
  function setMinter(uint256 tokenId, address newMinter) external;
}