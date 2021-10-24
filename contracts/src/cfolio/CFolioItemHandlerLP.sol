/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/interfaces/IERC20.sol';
import '../../0xerc1155/utils/SafeERC20.sol';

import './CFolioItemHandlerFarm.sol';

/**
 * @dev CFolioItemHandlerLP manages CFolioItems, minted in the SFT contract.
 *
 * See {CFolioItemHandlerFarm}.
 */
contract CFolioItemHandlerLP is CFolioItemHandlerFarm {
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  // Slot 0 token (WOWS/WETH UniV2 Pair)
  IERC20 public immutable stakingToken0;
  // Slot 1 token (WOWS/Native UniV2 Pair)
  IERC20 public immutable stakingToken1;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Constructs the CFolioItemHandlerLP
   *
   * We gather all current addresses from address registry into immutable vars.
   * If one of the relevant addresses changes, the contract has to be updated.
   * There is little state here, user state is completely handled in CFolioFarm.
   */
  constructor(IAddressRegistry addressRegistry, address farm)
    CFolioItemHandlerFarm(addressRegistry, farm)
  {
    // WOWS/WETH staking token
    stakingToken0 = IERC20(
      addressRegistry.getRegistryEntry(AddressBook.UNISWAP_V2_PAIR)
    );
    // WOWS/NATIVE staking token
    stakingToken1 = IERC20(
      addressRegistry.getRegistryEntry(AddressBook.UNISWAP_V2_PAIR_NATIVE)
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {CFolioItemHandlerFarm}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {CFolioItemHandlerFarm-_deposit}.
   */
  function _deposit(
    address itemCFolio,
    address payer,
    uint256 slotId,
    uint256[] calldata amounts
  ) internal override {
    // Validate parameters
    require(amounts.length == 1 && amounts[0] > 0, 'CFIHLP: invalid amount');
    // Transfer LP token to this contract
    (slotId == 0 ? stakingToken0 : stakingToken1).safeTransferFrom(
      payer,
      address(this),
      amounts[0]
    );

    // Record assets in the Farm contract. They don't earn rewards.
    //
    // NOTE: {addAssets} must only be called from investment CFolios.
    _cfolioFarm.addAssets(itemCFolio, amounts[0], slotId);
  }

  /**
   * @dev See {CFolioItemHandlerFarm-_withdraw}.
   */
  function _withdraw(
    address itemCFolio,
    uint256 slotId,
    uint256[] calldata amounts
  ) internal override {
    // Validate parameters
    require(amounts.length == 1 && amounts[0] > 0, 'CFIHLP: invalid amount');

    // Record assets in Farm contract. They don't earn rewards.
    //
    // NOTE: {removeAssets} must only be called from Investment CFolios.
    _cfolioFarm.removeAssets(itemCFolio, amounts[0], slotId);

    // Transfer LP token from this contract.
    (slotId == 0 ? stakingToken0 : stakingToken1).safeTransfer(
      _msgSender(),
      amounts[0]
    );
  }

  /**
   * @dev Verify if target base SFT is allowed
   */
  function _verifyTransferTarget(uint256 baseSftTokenId)
    internal
    view
    override
  {
    (, uint8 level) = _sftHolder.getTokenData(baseSftTokenId);

    require((LEVEL2WOLF & (uint256(1) << level)) > 0, 'CFIHLP: Wolves only');
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICFolioItemHandler} via {CFolioItemHandlerFarm}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICFolioItemHandler-getAmounts}
   */
  function getAmounts(address cfolioItem)
    external
    view
    override
    returns (uint256[] memory result)
  {
    result = _cfolioFarm.balancesOf(cfolioItem);
  }
}
