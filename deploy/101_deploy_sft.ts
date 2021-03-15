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
const SFT_CONTRACT = 'WOWSERC1155';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';

// ERC-1155 metadata URI
const METADATA_URI =
  'https://raw.githubusercontent.com/wolvesofwallstreet/wolves.assets.low/main/metadata/';

// Path to generated address registry file
const ADDRESS_REGISTRY = `${__dirname}/../src/config/generated-addresses.json`;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Steps to deploy the WOWS SFT environment
 */
const sft_func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { deploy } = deployments;
  const { deployer, marketingWallet } = await getNamedAccounts();

  // Load contract addresses
  const addressRegistry = JSON.parse(
    fs.readFileSync(ADDRESS_REGISTRY).toString()
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT contract
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying SFT contract');

  const sftReceipt = await deploy(SFT_CONTRACT, {
    from: deployer,
    args: [marketingWallet, METADATA_URI],
    log: true,
    deterministicDeployment: true,
  });

  const SFT_ADDRESS = sftReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT minter
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying SFT minter');

  const sftMinterReceipt = await deploy(SFT_MINTER_CONTRACT, {
    from: deployer,
    args: [
      marketingWallet,
      addressRegistry.hardhat.token,
      addressRegistry.hardhat.token,
      SFT_ADDRESS,
    ],
    log: true,
    deterministicDeployment: true,
  });

  const SFT_MINTER_ADDRESS = sftMinterReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Update address registry file
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step(`Writing ${ADDRESS_REGISTRY}`);

  addressRegistry.hardhat.sft = SFT_ADDRESS;
  addressRegistry.hardhat.sftMinter = SFT_MINTER_ADDRESS;

  fs.writeFileSync(
    ADDRESS_REGISTRY,
    JSON.stringify(addressRegistry, null, '  ')
  );
};

module.exports = sft_func;
module.exports.tags = ['SFT'];
module.exports.dependencies = ['Token'];
