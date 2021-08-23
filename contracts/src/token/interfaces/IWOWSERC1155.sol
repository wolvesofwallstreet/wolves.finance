/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

/**
 * @notice Cryptofolio interface
 */
interface IWOWSERC1155 {
  //////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Get the token ID of a given address
   *
   * A cross check is required because token ID 0 is valid.
   *
   * @param tokenAddress The address to convert to a token ID
   *
   * @return The token ID on success, or uint256(-1) if `tokenAddress` does not
   * belong to a token ID
   */
  function addressToTokenId(address tokenAddress)
    external
    view
    returns (uint256);

  /**
   * @dev Get the address for a given token ID
   *
   * @param tokenId The token ID to convert
   *
   * @return The address, or address(0) in case the token ID does not belong
   * to an NFT
   */
  function tokenIdToAddress(uint256 tokenId) external view returns (address);

  /**
   * @dev Return the level and the mint timestamp of tokenId
   *
   * @param tokenId The tokenId to query
   *
   * @return mintTimestamp The timestamp token was minted
   * @return level The level token belongs to
   */
  function getTokenData(uint256 tokenId)
    external
    view
    returns (uint64 mintTimestamp, uint8 level);

  /**
   * @dev Return all tokenIds owned by account
   */
  function getTokenIds(address account)
    external
    view
    returns (uint256[] memory);

  /**
   * @dev Returns the cFolioItemType of a given cFolioItem tokenId
   */
  function getCFolioItemType(uint256 tokenId) external view returns (uint256);

  //////////////////////////////////////////////////////////////////////////////
  // State modifiers
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Set the base URI for either predefined cards
   *
   * The resulting uri is baseUri+[hex(tokenId)] + '.json'. where
   * tokenId will be reduces to upper 16 bit (>> 16) before building the hex string.
   *
   */
  function setBaseMetadataURI(string calldata baseContractMetadata) external;

  /**
   * @dev Set the base URI for custom cards
   *
   * The resulting uri is baseUri+[hex(tokenId)] + '.json'.
   */
  function setCustomMetadataURI(string calldata customMetadataURI) external;

  /**
   * @dev Set the base URI for cfolio cards
   *
   * The resulting uri is baseUri+[hex(tokenId)] + '.json'.
   */
  function setCFolioMetadataURI(string calldata cfolioMetadataURI) external;

  /**
   * @dev Set the contracts metadata URI
   *
   * @param contractMetadataURI The URI which point to the contract metadata file.
   */
  function setContractMetadataURI(string calldata contractMetadataURI) external;

  /**
   * @dev Each custom card has its own level. Level will be used when
   * calculating rewards and raiding power.
   *
   * @param tokenId The ID of the token whose level is being set
   * @param cardLevel The new level of the specified token
   */
  function setCustomCardLevel(uint256 tokenId, uint8 cardLevel) external;

  /**
   * @dev Sets the cfolioItemType of a cfolioItem tokenId, not yet used
   * sftHolder tokenId expected (without hash)
   */
  function setCFolioItemType(uint256 tokenId, uint256 cfolioItemType_) external;
}
