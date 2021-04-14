/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/**
 * The purpose of this file is to control the import order of Hardhat and
 * plugins. Entries have been added in .prettierignore and .eslintignore to
 * avoid formatting this file.
 */

// Import hardhat
import * as hardhat from 'hardhat';

// Import plugins
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-abi-exporter';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';

// Export fully-initialized interface
export { hardhat };
