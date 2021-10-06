/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

interface IAnyNftRouter {
  function nft1155SwapOut(
    address token,
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes calldata data,
    uint256 toChainID
  ) external payable;

  function nft1155BatchSwapOut(
    address token,
    address to,
    uint256[] calldata tokenIds,
    uint256[] calldata amounts,
    bytes calldata data,
    uint256 toChainID
  ) external payable;
}
