/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/**
 * @dev Extension of OpenZeppelin's {ERC20} that allows anyone to mint tokens
 * to arbitrary accounts.
 *
 * FOR TESTING ONLY.
 */
abstract contract TestERC20Mintable is ERC20 {
  //////////////////////////////////////////////////////////////////////////////
  // Minting interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Creates `amount` tokens and assigns them to `account`, increasing
   * the total supply.
   */
  function mint(address account, uint256 amount) public {
    // Call ancestor
    _mint(account, amount);
  }
}
