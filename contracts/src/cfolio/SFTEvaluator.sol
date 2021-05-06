/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import './interfaces/ISFTEvaluator.sol';
import './interfaces/ICFolioItemHandler.sol';

import '../token/interfaces/IWOWSCryptofolio.sol';
import '../token/interfaces/IWOWSERC1155.sol';
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';
import '../utils/TokenIds.sol';

contract SFTEvaluator is ISFTEvaluator {
  using TokenIds for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Current reward weight of a sft card
  mapping(uint256 => uint32) private _rewardRate;

  // The SFT contract we need for level
  IWOWSERC1155 private immutable _sftHolder;

  // The main tradefloor contract
  address private immutable _tradeFloor;

  // Admin
  address public immutable admin;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  event RewardRate(uint256 indexed tokenId, uint32 rate);

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(IAddressRegistry addressRegistry) {
    // The SFT holder
    _sftHolder = IWOWSERC1155(
      addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER)
    );

    // Admin
    admin = addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);

    // TradeFloor
    _tradeFloor = addressRegistry.getRegistryEntry(
      AddressBook.TRADE_FLOOR_PROXY
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ISFTEvaluator}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ISFTEvaluator-rewardRate}.
   */
  function rewardRate(uint256 tokenId) external view override returns (uint32) {
    require(tokenId.isBaseCard(), 'Invalid tokenId');
    return
      _rewardRate[tokenId] == 0 ? _baseRate(tokenId) : _rewardRate[tokenId];
  }

  /**
   * @dev See {ISFTEvaluator-setRewardRate}.
   */
  function setRewardRate(uint256 tokenId, bool revertUnchanged)
    external
    override
  {
    require(tokenId.isBaseCard(), 'Invalid tokenId');
    (uint32 untimed, uint32 timed) =
      // solhint-disable-next-line not-rely-on-time
      _baseRates(tokenId, uint64(block.timestamp - 60 days));

    // First implementation, check timed auto upgrade only
    if (untimed != timed) {
      // Update state
      _rewardRate[tokenId] = timed;

      IWOWSCryptofolio cFolio =
        IWOWSCryptofolio(_sftHolder.tokenIdToAddress(tokenId));
      require(address(cFolio) != address(0), 'SFTE: invalid tokenId');

      // Run through all cfolioItems of main tradefloor
      (uint256[] memory cFolioItems, uint256 length) =
        cFolio.getCryptofolio(_tradeFloor);
      if (length > 0) {
        address[] memory calledHandlers = new address[](length);
        uint256 numCalledHandlers = 0;

        for (uint256 i = 0; i < length; ++i) {
          // Secondary c-folio items have one tradefloor which is the handler
          address handler =
            IWOWSCryptofolio(_sftHolder.tokenIdToAddress(cFolioItems[i]))
              ._tradefloors(0);
          require(
            address(handler) != address(0),
            'SFTE: invalid cfolioItemHandler'
          );

          // Check if we have called this handler already
          uint256 j = numCalledHandlers;
          while (j > 0 && calledHandlers[j - 1] != handler) --j;
          if (j == 0) {
            ICFolioItemHandler(handler).sftUpgrade(tokenId, timed);
            calledHandlers[numCalledHandlers++] = handler;
          }
        }
      }

      // Fire an event
      emit RewardRate(tokenId, timed);
    } else {
      // Revert if requested
      require(!revertUnchanged, 'Rate unchanged');
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation details
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

    // Load state
    (uint64 time, uint8 level) = _sftHolder.getTokenData(tokenId);

    uint8 update = (level & 3) < 3 && time <= upgradeTime ? 1 : 0;

    return (rates[(level & 3)], rates[(level & 3) + update]);
  }
}
