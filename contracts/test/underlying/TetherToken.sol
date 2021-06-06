/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '../token/TestERC20Mintable.sol';

// Mainnet address: 0xdac17f958d2ee523a2206206994597c13d831ec7
// Yearn vault address: 0x83f798e925BcD4017Eb265844FDDAbb448f1707D
contract TetherToken is TestERC20Mintable {
  constructor() ERC20('Funny Tether USD', 'USDT') {
    // Initialize {ERC20}
    _setupDecimals(6);
  }
}
