/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import './TestTetherToken.sol';

/**
 * @dev Extension of {TestTetherToken} that allows anyone to mint tokens to
 * arbitrary accounts.
 *
 * FOR TESTING ONLY.
 */
contract TestTetherMintable is TestTetherToken {
  /**
   *  The contract can be initialized with a number of tokens
   *  All the tokens are deposited to the owner address
   *
   * @param _initialSupply Initial supply of the contract
   * @param _name Token Name
   * @param _symbol Token symbol
   * @param _decimals Token decimals
   */
  constructor(
    uint256 _initialSupply,
    string memory _name,
    string memory _symbol,
    uint256 _decimals
  ) TestTetherToken(_initialSupply, _name, _symbol, _decimals) {}

  //////////////////////////////////////////////////////////////////////////////
  // Minting interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Creates `amount` tokens and assigns them to `account`, increasing the
   * total supply.
   *
   * Emits a {TestTetherToken-Issue} event.
   */
  function mint(address to, uint256 amount) public {
    // Tokens are issued to the owner
    owner = to;
    super.issue(amount);
    owner = address(0);
  }
}
