/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */

//const ethers = require('ethers');
const fs = require('fs');

require('hardhat-deploy');
require('hardhat-deploy-ethers');

// TODO: Fully qualified contract names
const TOKEN_CONTRACT = 'WowsToken';
const SFT_CONTRACT = 'WOWSERC1155';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';

// Path to generated address registry file
const ADDRESS_REGISTRY = `${__dirname}/../src/config/generated-addresses.json`;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Steps to deploy the WOWS SFT environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { execute } = deployments;
  const { marketingWallet } = await getNamedAccounts();

  // Load contract addresses
  const addressRegistry = JSON.parse(
    fs.readFileSync(ADDRESS_REGISTRY).toString()
  );

  const addresses = addressRegistry.hardhat;

  const TOKEN_INSTANCE = await hardhat_re.ethers.getContract(TOKEN_CONTRACT);
  const SFT_INSTANCE = await hardhat_re.ethers.getContract(SFT_CONTRACT);

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for SFT
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for SFT');

  //
  // 1.) WowsToken:: grantRole (REWARD_ROLE, WOWSSftMinter.sol)
  //

  await execute(
    TOKEN_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'grantRole',
    await TOKEN_INSTANCE.REWARD_ROLE(),
    addresses.sftMinter
  );

  //
  // 2.) Call WOWSSftMinter.sol::setPrices()
  //     For test: ["0", "1", "2", "3"], ["500000000000000000", "1000000000000000000", "2000000000000000000", "4000000000000000000"]
  //

  await execute(
    SFT_MINTER_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'setPrices',
    ['0', '1', '2', '3'],
    [
      '500000000000000000',
      '1000000000000000000',
      '2000000000000000000',
      '4000000000000000000',
    ]
  );

  //
  // 3.) Call WowsERC1155.sol::grantRole(MINTER_ROLE, WOWSSftMinter.sol)
  //

  await execute(
    SFT_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'grantRole',
    await SFT_INSTANCE.MINTER_ROLE(),
    addresses.sftMinter
  );
};

module.exports = func;
module.exports.tags = ['SFTSetup'];
module.exports.dependencies = ['SFT'];
