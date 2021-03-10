/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

interface IERC1155Mintable {
  /**
   * @dev mint a new token at id tokenId (MINTER_ROLE)
   */
  function mint(
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) external;
}
