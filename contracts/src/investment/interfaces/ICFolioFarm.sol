/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.7.6;

/**
 * @title ICFolioFarm
 *
 * @dev ICFolioFarm is the business logic interface to c-folio farms.
 */
interface ICFolioFarm {
  /**
   * @dev Return number of slots
   */
  function slotCount() external view returns (uint256);

  /**
   * @dev Return total invested balance
   */
  function totalSupply() external view returns (uint256);

  /**
   * @dev Return invested balance of account
   */
  function balanceOf(address account, uint256 slotId)
    external
    view
    returns (uint256);

  /**
   * @dev Return invested balances per slot of account
   */
  function balancesOf(address account) external view returns (uint256[] memory);

  /**
   * @dev Return total, balances[account], rewardDuration, rewardForDuration, earned[account]
   */
  function getUIData(address account) external view returns (uint256[5] memory);

  /**
   * @dev Increase amount of non-rewarded asset
   */
  function addAssets(
    address account,
    uint256 amount,
    uint256 slotId
  ) external;

  /**
   * @dev Remove amount of previous added assets
   */
  function removeAssets(
    address account,
    uint256 amount,
    uint256 slotId
  ) external;

  /**
   * @dev Increase amount of shares and earn rewards
   */
  function addShares(
    address account,
    uint256 amount,
    uint256 slotId
  ) external;

  /**
   * @dev Remove amount of previous added shares, rewards will not be claimed
   */
  function removeShares(
    address account,
    uint256 amount,
    uint256 slotId
  ) external;

  /**
   * @dev Claim rewards harvested during reward time
   */
  function getReward(address account, address rewardRecipient) external;
}

/**
 * @title ICFolioFarmOwnable
 */

interface ICFolioFarmOwnable is ICFolioFarm {
  /**
   * @dev Transfer ownership
   */
  function transferOwnership(address newOwner) external;
}
