/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';

import '../src/token/interfaces/IMinterCallback.sol';
import '../src/token/TradeFloor.sol';

contract TestStakingContract is IMinterCallback, ERC1155Holder {
  TradeFloor private _tradeFloor;

  constructor(address tradeFloor) {
    require(tradeFloor != address(0), 'Trade floor is zero address');
    _tradeFloor = TradeFloor(tradeFloor);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IMinterCallback}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IMinterCallback-onTransferFrom}.
   */
  function onTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 amount
  ) public override {}

  /**
   * @dev See {IMinterCallback-onBurn}.
   */
  function onBurn(
    address recipient,
    address account,
    uint256 tokenId,
    uint256 amount
  ) public override {}

  //////////////////////////////////////////////////////////////////////////////
  // Public API
  //////////////////////////////////////////////////////////////////////////////

  function stake(address receiver, uint256 tokenId) public {
    _tradeFloor.mint(receiver, tokenId, 1, _toBytes(address(this)));
  }

  function unstake(address owner, uint256 tokenId) public {
    _tradeFloor.burn(owner, tokenId, 1);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  function _toBytes(address addr) private pure returns (bytes memory) {
    return abi.encodePacked(addr);
  }
}
