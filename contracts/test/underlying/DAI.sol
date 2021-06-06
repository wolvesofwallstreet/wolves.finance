/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '../token/TestERC20Mintable.sol';

// Mainnet address: 0x6b175474e89094c44da98b954eedeac495271d0f
// Yearn vault address: 0x16de59092dAE5CcF4A1E6439D611fd0653f0Bd01
contract DAI is TestERC20Mintable {
  constructor() ERC20('Funny Dai Stablecoin', 'DAI') {}
}
