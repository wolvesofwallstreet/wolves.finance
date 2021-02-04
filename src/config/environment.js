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
  process.env.CI_INFURA_API_KEY || process.env.INFURA_API_KEY;
const PRIVATE_KEY = process.env.CI_PRIVATE_KEY || process.env.PRIVATE_KEY;

module.exports = {
  INFURA_API_KEY,
  PRIVATE_KEY,
};
