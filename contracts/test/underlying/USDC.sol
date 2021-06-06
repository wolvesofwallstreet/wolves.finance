/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '../token/TestERC20Mintable.sol';

// Mainnet address: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
// Yearn vault address: 0xd6aD7a6750A7593E092a9B218d66C0A814a3436e
contract USDC is TestERC20Mintable {
  constructor() ERC20('Funny USD Coin', 'USDC') {
    // Initialize {ERC20}
    _setupDecimals(6);
  }
}
