/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

interface IWOWSCryptofolio {
  /**
   * @dev return array of cryptofolio tokenIds
   */
  function getCryptofolio(address tradefloor)
    external
    view
    returns (uint256[] memory ids, uint256 idsLength);

  /**
   * @dev set the owner of the underlying NFT
   * this owner gets allowance to transfer cryptofolio items
   */
  function setOwner(address owner) external;

  /**
   * @dev burn all cryptofolio items
   */
  function burn() external;
}
