/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../token/interfaces/ICFolioItemCallback.sol';

/**
 * @dev Interface to C-folio item contracts
 */
interface ICFolioItemHandler is ICFolioItemCallback {
  /**
   * @dev Called when a SFT tokens grade needs re-evaluation
   *
   * @param tokenId The ERC-1155 token ID
   * Rate is in 1E6 convention: 1E6 = 100%
   * @param newRate new value rate
   */
  function sftUpgrade(uint256 tokenId, uint32 newRate) external;

  /**
   * @dev Called from SFTMinter after an Investment SFT is minted
   *
   * @param payer the approved address to get investment from
   * @param sftTokenId the sftTokenId that cfolio is the owner of investment
   * @param amounts the amounts of invested assets
   */
  function setupCFolio(
    address payer,
    uint256 sftTokenId,
    uint256[] calldata amounts
  ) external;

  /**
   * @dev Adds investments into an cFolioItem SFT
   *
   * Transfers amounts of assets from users wallet to the contract.
   * In general an Approval call is required before function is called
   *
   * @param tokenId cFolioItem tokenId, must be unlocked
   * @param amounts invetsment amounts, implementation specific
   */
  function deposit(uint256 tokenId, uint256[] calldata amounts) external;

  /**
   * @dev Removes investments into an cFolioItem SFT
   *
   * Withdrawn token are transfered back to msg.sender
   *
   * @param tokenId cFolioItem tokenId, must be unlocked
   * @param amounts invetsment amounts, implementation specific
   */
  function withdraw(uint256 tokenId, uint256[] calldata amounts) external;

  /**
   * @dev Get the rewards collected by an SFT base card
   *
   * @param recipient recipient of the rewards (- fees)
   * @param tokenId SFT base card tokenId, must be unlocked
   */
  function getRewards(address recipient, uint256 tokenId) external;
}
