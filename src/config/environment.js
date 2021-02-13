/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

require('dotenv-defaults/config');

//
// Environment parameters may come from GitHub Actions secrets.
//
// When triggered by a PR from an external repo, the environment variable will
// evaluate to an empty string, which overrides the default of the same name
// specified in .env.defaults.
//
// To allow for overriding variables that can be empty strings, the prefix CI_
// is used to pass CI secrets.
//

const INFURA_API_KEY =
  process.env.CI_INFURA_API_KEY ||
  process.env.REACT_APP_INFURA_ID ||
  process.env.INFURA_API_KEY;
const ETHERSCAN_API_KEY =
  process.env.CI_ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
const DEPLOYER_WALLET =
  process.env.CI_DEPLOYER_WALLET || process.env.DEPLOYER_WALLET;
const MARKETING_WALLET =
  process.env.CI_MARKETING_WALLET || process.env.MARKETING_WALLET;
const TEAM_WALLET = process.env.CI_TEAM_WALLET || process.env.TEAM_WALLET;
const TEST_WALLET = process.env.CI_TEST_WALLET || process.env.TEST_WALLET;

module.exports = {
  INFURA_API_KEY,
  ETHERSCAN_API_KEY,
  DEPLOYER_WALLET,
  MARKETING_WALLET,
  TEAM_WALLET,
  TEST_WALLET,
};
