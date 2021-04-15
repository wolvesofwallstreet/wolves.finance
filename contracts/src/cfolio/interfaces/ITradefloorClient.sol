/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../token/interfaces/IMinterCallback.sol';

/**
 * @dev Interface to C-folio item contracts
 */
interface ITradeFloorClient is IMinterCallback {
  /**
   * @dev Called when a SFT tokens grade needs re-evaluation
   *
   * @param tokenId The ERC-1155 token ID
   * Rates in 1E6 convention: 1E6 = 100%
   * @param prevRate previous value rate
   * @param newRate new value rate
   */
  function sftUpgrade(uint256 tokenId, uint32 prevRate, uint32 newRate) external;
}
