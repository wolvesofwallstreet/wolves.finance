/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

interface IERC1155Cryptofolio {
  /**
   * @dev call this function if cryptofolio tokens are transfered from or to the Cryptofolio NFT
   * specified by address.
   * msgSender() needs to have TRADEFLOOR_ROLE
   */
  function tradeableItemsTransfered(
    address operator,
    address tokenAddress,
    uint256[] memory ids,
    bool[] memory hasAmounts
  ) external;

  /**
   * @dev evaluate the tokenid from a given address
   * @return returns tokenId on success, uint256(-1) if tokenAddress does not belong to an tokenId.
   */
  function addressToTokenId(address tokenAddress)
    external
    view
    returns (uint256);

  /**
   * @dev evaluate the address from a given tokenId
   * @return returns address(0) in case the tokenId does not belong to an NFT.
   */
  function tokenIdToAddress(uint256 tokenId) external view returns (address);
}
