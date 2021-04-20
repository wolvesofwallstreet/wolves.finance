/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import './interfaces/ISftEvaluator.sol';
import './interfaces/ITradeFloorClient.sol';

import '../token/interfaces/IWOWSERC1155.sol';
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';

contract SftEvaluator is ISftEvaluator {
  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Registered TFClients
  ITradeFloorClient[] public tradeFloorClients;

  // Current reward weight of a sft card
  mapping(uint256 => uint32) private _rewardRate;

  // The SFT contract we need for level
  IWOWSERC1155 private immutable _sftHolder;

  // admin
  address public immutable admin;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(IAddressRegistry addressRegistry) {
    // The SFT holder
    _sftHolder = IWOWSERC1155(
      addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER)
    );

    // admin
    admin = addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation
  //////////////////////////////////////////////////////////////////////////////

  function rewardRate(uint256 tokenId) external view override returns (uint32) {
    uint32 rate = _rewardRate[tokenId];
    return rate == 0 ? _baseRate(tokenId) : rate;
  }

  function setRewardRate(uint256 tokenId, bool revertUnchanged)
    external
    override
  {
    // solhint-disable-next-line not-rely-on-time
    (uint32 untimed, uint32 timed) =
      _baseRates(tokenId, uint64(block.timestamp - 60 days));
    // first implementation, check timed auto upgrade only
    if (untimed != timed) {
      // Change state
      _rewardRate[tokenId] = timed;
      // Notify all TradeFloorClients
      uint256 length = tradeFloorClients.length;
      for (uint256 i = 0; i < length; ++i)
        tradeFloorClients[i].sftUpgrade(tokenId, untimed, timed);
    } else require(!revertUnchanged, 'Rate unchenged');
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation
  //////////////////////////////////////////////////////////////////////////////

  function _baseRate(uint256 tokenId) private view returns (uint32) {
    (uint32 untimed, ) = _baseRates(tokenId, 0);
    return untimed;
  }

  function _baseRates(uint256 tokenId, uint64 upgradeTime)
    private
    view
    returns (uint32 untimed, uint32 timed)
  {
    uint32[4] memory rates =
      [uint32(25e4), uint32(50e4), uint32(75e4), uint32(1e6)];
    (uint64 time, uint8 level) = _sftHolder.getTokenData(tokenId);
    uint8 update = (level & 3) < 3 && time <= upgradeTime ? 1 : 0;

    return (rates[(level & 3)], rates[(level & 3) + update]);
  }
}
