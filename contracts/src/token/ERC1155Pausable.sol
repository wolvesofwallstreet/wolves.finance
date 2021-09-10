/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/access/AccessControl.sol';
import '../../0xerc1155/tokens/ERC1155/ERC1155MintBurn.sol';
import '../../0xerc1155/utils/Context.sol';

/**
 * @dev Partial implementation of the https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Multi Token Standard that allows for pausing.
 */
contract ERC1155Pausable is Context, AccessControl, ERC1155MintBurn {
  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Pause state
  bool private _pauseActive;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  // Event triggered when pause state is changed
  event Pause(bool active);

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Construct the contract in a paused state
   */
  constructor() {
    _pause(true);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Pausing interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Pauses all token transfers.
   *
   * Requirements:
   *
   * - The caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function pause(bool active) public {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Update state
    _pause(active);
  }

  /**
   * @dev Returns true if the contract is paused, and false otherwise.
   */
  function paused() public view returns (bool) {
    // Access state
    return _pauseActive;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal pausing interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Returns true if the contract is paused, and false otherwise.
   */
  function _pause(bool active) internal {
    // Validate state
    require(_pauseActive != active, 'No state change');

    // Update state
    _pauseActive = active;

    // Dispatch event
    emit Pause(active);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC1155} via {ERC1155MintBurn}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155-_beforeTokenTransfer}.
   *
   * This function is necessary due to diamond inheritance.
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) internal virtual override {
    // Validate state
    require(!_pauseActive, 'Transfer operation paused!');

    // Call ancestor
    super._beforeTokenTransfer(operator, from, to, tokenId, amount, data);
  }

  /**
   * @dev See {ERC1155-_beforeBatchTokenTransfer}.
   *
   * This function is necessary due to diamond inheritance.
   */
  function _beforeBatchTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override {
    // Valiate state
    require(!_pauseActive, 'Transfer operations paused!');

    // Call ancestor
    super._beforeBatchTokenTransfer(
      operator,
      from,
      to,
      tokenIds,
      amounts,
      data
    );
  }
}
