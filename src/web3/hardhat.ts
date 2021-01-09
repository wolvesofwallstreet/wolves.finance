/*
 * Copyright (C) 2020 The Wolfpack
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
import 'hardhat-abi-exporter';

// Export fully-initialized interface
export { hardhat };
