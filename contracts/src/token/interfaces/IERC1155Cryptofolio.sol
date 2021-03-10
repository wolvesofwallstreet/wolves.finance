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
   * @dev called from WOWSErc1155TokenReceiver every time new ERC1155 tokens are transfered.
   * This allows us to build up a collection of cryptofolio items.
   * _msgSender() has to be one of our cryptofoio auto generated contracts
   */
  function onTokensReceived(
    address operator,
    uint256[] memory ids,
    uint256[] memory amounts
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
