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
const TRADE_FLOOR_CONTRACT = 'TradeFloor';
const TEST_STAKING_CONTRACT = 'TestStakingContract';

// TODO: Trade floor will use {id} mechamism eventually
const METADATA_URI = '';

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

  const { deploy } = deployments;
  const { deployer, marketingWallet } = await getNamedAccounts();

  // Load contract addresses
  const addressRegistry = JSON.parse(
    fs.readFileSync(ADDRESS_REGISTRY).toString()
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Trade Floor
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying Trade Floor');

  const tradeFloorReceipt = await deploy(TRADE_FLOOR_CONTRACT, {
    from: deployer,
    args: [marketingWallet, METADATA_URI],
    log: true,
    deterministicDeployment: true,
  });

  const TRADE_FLOOR_ADDRESS = tradeFloorReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy test staking contract
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying test staking contract');

  const testStakingContractReceipt = await deploy(TEST_STAKING_CONTRACT, {
    from: deployer,
    args: [TRADE_FLOOR_ADDRESS],
    log: true,
    deterministicDeployment: true,
  });

  const STAKING_CONTRACT_ADDRESS = testStakingContractReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Update address registry file
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step(`Writing ${ADDRESS_REGISTRY}`);

  addressRegistry.hardhat.tradeFloor = TRADE_FLOOR_ADDRESS;
  addressRegistry.hardhat.stakingTest = STAKING_CONTRACT_ADDRESS;

  fs.writeFileSync(
    ADDRESS_REGISTRY,
    JSON.stringify(addressRegistry, null, '  ')
  );
};

module.exports = func;
module.exports.tags = ['SFTTest'];
module.exports.dependencies = ['SFT'];
