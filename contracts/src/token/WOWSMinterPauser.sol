/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 * *
 * This file is derived from OpenZeppelin, available under the MIT
 * license. https://openzeppelin.com/contracts/

 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/tokens/ERC1155/ERC1155Metadata.sol';
import '../../0xerc1155/tokens/ERC1155/ERC1155MintBurn.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/Context.sol';

/**
 * @dev Partial implementation of https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Multi Token Standard
 *
 * This contract is a replacement for the file ERC1155PresetMinterPauser.sol
 * in the OpenZeppelin project.
 */
contract WOWSMinterPauser is
  Context,
  AccessControl,
  ERC1155MintBurn,
  ERC1155Metadata
{
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  // Role to pause token transfers
  bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');

  // Role to mint new tokens
  bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

  // Pause
  bool private _pause;
  // Event triggered when _pause state changed
  event Pause(bool on);

  //////////////////////////////////////////////////////////////////////////////
  // Constructor
  //////////////////////////////////////////////////////////////////////////////

  constructor(string memory uri) ERC1155(uri) {}

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
  function pause(bool pause) public virtual {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'pauser role required');

    if (_pause != pause) {
      // Update state
      _pause = pause;
    }
  }

  /**
    * @dev Returns true if the contract is paused, and false otherwise.
    */
  function paused() public view virtual returns (bool) {
      return _paused;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Minting interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Creates `amount` new tokens for `to`, of token type `tokenId`.
   *
   * See {ERC1155-_mint}.
   *
   * Requirements:
   *
   * - The caller must have the `MINTER_ROLE`.
   */
  function mint(
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) public virtual {
    // Validate access
    require(hasRole(MINTER_ROLE, _msgSender()), 'minter role required');

    // Validate parameters
    require(to != address(0), "Can't mint to zero address");

    // Update state
    _mint(to, tokenId, amount, data);
  }

  /**
   * @dev Batched variant of {mint}.
   */
  function mintBatch(
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) public virtual {
    // Validate access
    require(hasRole(MINTER_ROLE, _msgSender()), 'minter role required');

    // Validate parameters
    require(to != address(0), "Can't mint to zero address");
    require(tokenIds.length == amounts.length, "Lengths don't match");

    // Update state
    _mintBatch(to, tokenIds, amounts, data);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC1155}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155-_beforeBatchTokenTransfer}.
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
    require(_pause == false, 'Transfer operation paused!');
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
    require(_pause == false, 'Transfer operation paused!');
    // Call ancestor
    super._beforeBatchTokenTransfer(operator, from, to, tokenIds, amounts, data);
  }
}
