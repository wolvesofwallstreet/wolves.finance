/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

/**
 * @dev Interface to receive callbacks when minted tokens are burnt
 */
interface IMinterCallback {
  /**
   * @dev Called when a token minted by a minter is transferred
   *
   * @param from The account sending the token
   * @param to The account receiving the token
   * @param tokenId The ERC-1155 token ID
   * @param amount The amount of tokens transfered
   */
  function onTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 amount
  ) external;

  /**
   * @dev Called when a token minted by a minter is burned
   *
   * @param recipient The account used for payback investments
   * @param account The account owning the token
   * @param tokenId The ERC-1155 token ID
   * @param amount The amount of tokens burned
   */
  function onBurn(
    address recipient,
    address account,
    uint256 tokenId,
    uint256 amount
  ) external;
}
