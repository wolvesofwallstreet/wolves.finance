/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';

interface IERC1155BurnMintable is IERC1155 {
  /**
   * @dev mint amount new tokens at id tokenId (MINTER_ROLE required)
   */
  function mint(
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) external;

  /**
   * @dev mint amounts new tokens at ids tokenIds (MINTER_ROLE required)
   */
  function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) external;

  /**
   * @dev burn value amount tokens with id.
   * caller must be approvedForAll;
   */
  function burn(
    address account,
    uint256 id,
    uint256 value
  ) external;

  /**
   * @dev burn values amount[] tokens with ids[]
   * caller must be approvedForAll;
   */
  function burnBatch(
    address account,
    uint256[] memory ids,
    uint256[] memory values
  ) external;
}
