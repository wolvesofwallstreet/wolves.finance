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
interface IWOWSCryptofolio {
  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Initialize the deployed contract after creation
   *
   * This is a one time call which sets _deployer to msg.sender.
   * Subsequent calls reverts.
   */
  function initialize(bool isCFolio) external;

  //////////////////////////////////////////////////////////////////////////////
  // State modifiers
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Get the handler of the I-NFT which was previous set with setHandler
   *
   * Reverts if this contract is not for an I-NFT.
   */
  function getHandler() external view returns (address);

  /**
   * @dev Set the owner of the underlying NFT
   *
   * This function is called if ownership of the parent NFT has changed
   * for cFolio
   *
   * The new owner gets allowance to transfer cryptofolio items. The new owner
   * is allowed to transfer / burn cryptofolio items. Make sure that allowance
   * is removed from previous owner.
   *
   * @param newOwner The new handler or owner of the underlying NFT,
   * or address(0) if the underlying NFT is being burned
   */
  function setOwner(address newOwner) external;

  /**
   * @dev Set the handler of the underlying NFT
   *
   * This function is called during I-NFT setup
   *
   * @param newHandler The new handler of the underlying NFT,
   */
  function setHandler(address newHandler) external;

  /**
   * @dev Allow owner (of parent NFT) to approve external operators to transfer
   * our cryptofolio items
   *
   * The NFT owner is allowed to approve operator to handle cryptofolios.
   *
   * @param operator The operator
   * @param allow True to approve for all NFTs, false to revoke approval
   */
  function setSftApproval(address operator, bool allow) external;
}
