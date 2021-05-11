/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

library TokenIds {
  // 128 bit underlying hash
  uint256 public constant HASH_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

  function isBaseCard(uint256 tokenId) internal pure returns (bool) {
    return (tokenId & HASH_MASK) < 0x10000000000000000;
  }

  function isStockCard(uint256 tokenId) internal pure returns (bool) {
    return (tokenId & HASH_MASK) < 0x100000000;
  }

  function isCFolioCard(uint256 tokenId) internal pure returns (bool) {
    return
      (tokenId & HASH_MASK) >= 0x10000000000000000 &&
      (tokenId & HASH_MASK) < 0x100000000000000000000000000000000;
  }

  function toSftTokenId(uint256 tokenId) internal pure returns (uint256) {
    return tokenId & HASH_MASK;
  }

  function maskHash(uint256 tokenId) internal pure returns (uint256) {
    return tokenId & ~HASH_MASK;
  }
}
