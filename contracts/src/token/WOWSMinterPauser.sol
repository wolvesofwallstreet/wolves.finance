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

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC1155/ERC1155Burnable.sol';
import '@openzeppelin/contracts/token/ERC1155/ERC1155Pausable.sol';
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
  ERC1155Burnable,
  ERC1155Pausable
{
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  // Role to pause token transfers
  bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');

  // Role to mint new tokens
  bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

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
   * See {ERC1155Pausable} and {Pausable-_pause}.
   *
   * Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function pause() public virtual {
    // Validate access
    require(hasRole(PAUSER_ROLE, _msgSender()), 'pauser role required');

    // Update state
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   *
   * See {ERC1155Pausable} and {Pausable-_unpause}.
   *
   * Requirements:
   *
   * - The caller must have the `PAUSER_ROLE`.
   */
  function unpause() public virtual {
    // Validate access
    require(hasRole(PAUSER_ROLE, _msgSender()), 'pauser role required');

    // Update state
    _unpause();
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
  // Implementation of {ERC1155} via {ERC1155Pausable}
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
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override(ERC1155, ERC1155Pausable) {
    // Call ancestor
    super._beforeTokenTransfer(operator, from, to, tokenIds, amounts, data);
  }
}
