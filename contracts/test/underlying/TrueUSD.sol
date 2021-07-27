/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '../token/TestERC20Mintable.sol';

// Mainnet address: 0x0000000000085d4780b73119b644ae5ecd22b376
// Yearn vault address: 0x73a052500105205d34daf004eab301916da8190f
contract TrueUSD is TestERC20Mintable {
  constructor() ERC20('Funny TrueUSD', 'TUSD') {}
}
