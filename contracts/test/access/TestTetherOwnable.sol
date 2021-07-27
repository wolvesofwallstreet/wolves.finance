/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

/**
 * @title TestTetherOwnable
 *
 * @dev Ownership is not needed nor implemented for the test Tether token.
 * Transfer fees are issued to the owner, so set owner to address(0) to burn
 * the fees.
 *
 * This contract is a replacement for the {Ownable} contract of mainnet
 * Tether (0xdac17f958d2ee523a2206206994597c13d831ec7).
 *
 * See https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7#code
 *
 * FOR TESTING ONLY.
 */
contract TestTetherOwnable {
  /**
   * @dev Fees sent to the owner are burned
   */
  address public owner = address(0);
}
