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
   * @dev get the next tokenId for the specified card
   */
  function getNextMintableTokenId(uint8 level, uint8 cardId)
    external
    view
    returns (bool, uint256);

  /**
   * @dev return the next mintable custon tokenId
   */
  function getNextMintableCustomToken() external view returns (uint256);

  /**
   * @dev each custom card has an own level. Level will be used when
   * calculating rewards and raiding power.
   */
  function setCustomCardLevel(uint256 tokenId, uint8 cardLevel) external;

  /**
   * @dev set the default URI (tokenId = 0) or custom URI (tokenId >= 0xFFFFFFFF)
   */
  function setURI(uint256 tokenId, string memory _uri) external;

  /**
   * @dev mint a new token at id tokenId (MINTER_ROLE)
   */
  function mint(
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
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
