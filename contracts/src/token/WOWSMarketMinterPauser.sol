/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/access/AccessControl.sol';
import '../../0xerc1155/utils/Context.sol';

import './WOWSMarket.sol';

/**
 * @dev Partial implementation of https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Multi Token Standard
 */
abstract contract WOWSMarketMinterPauser is Context, AccessControl, WOWSMarket {
  //////////////////////////////////////////////////////////////////////////////
  // Roles
  //////////////////////////////////////////////////////////////////////////////

  // Role to mint new tokens
  bytes32 public constant MINTER_ROLE = 'MINTER_ROLE';

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
    require(hasRole(MINTER_ROLE, _msgSender()), 'Only minter');

    // Validate parameters
    require(to != address(0), "Can't mint to zero address");

    // Update state
    _mintAndEmit(to, tokenId, amount, data);
  }

  /**
   * @dev Batched variant of {mint}.
   */
  function mintBatch(
    address to,
    uint256[] calldata tokenIds,
    uint256[] calldata amounts,
    bytes calldata data
  ) public virtual {
    // Validate access
    require(hasRole(MINTER_ROLE, _msgSender()), 'Only minter');

    // Validate parameters
    require(to != address(0), "Can't mint to zero address");
    require(tokenIds.length == amounts.length, "Lengths don't match");

    // Update state
    _batchMintAndEmit(to, tokenIds, amounts, data);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Burning interface
  //////////////////////////////////////////////////////////////////////////////

  function burn(
    address account,
    uint256 id,
    uint256 value
  ) public virtual {
    // Validate access
    require(
      account == _msgSender() || isApprovedForAll(account, _msgSender()),
      'Caller is not owner nor approved'
    );

    // Update state
    _burn(account, id, value);
  }

  function burnBatch(
    address account,
    uint256[] calldata ids,
    uint256[] calldata values
  ) public virtual {
    // Validate access
    require(
      account == _msgSender() || isApprovedForAll(account, _msgSender()),
      'Caller is not owner nor approved'
    );

    // Update state
    _batchBurn(account, ids, values);
  }
}
