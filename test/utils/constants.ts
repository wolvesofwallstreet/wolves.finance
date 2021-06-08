/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import { ethers } from 'ethers';

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

export const HASH_MASK = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';

export const MAX_UINT256 = ethers.BigNumber.from(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
);
