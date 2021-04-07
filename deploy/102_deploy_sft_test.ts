/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */

const ethers = require('ethers');
const fs = require('fs');

require('hardhat-deploy');
require('hardhat-deploy-ethers');

// TODO: Fully qualified contract names
const TRADE_FLOOR_CONTRACT = 'TradeFloor';
const TRADE_FLOOR_PROXY_CONTRACT = 'TradeFloorProxy';
const TEST_STAKING_CONTRACT = 'TestStakingContract';

// TODO: Trade floor will use {id} mechamism eventually
const METADATA_URI =
  'https://4travelers.de/wolves_assets/tradefloor/rinkeby/metadata/';
const CONTRACT_METADATA_URI =
  'https://4travelers.de/wolves_assets/tradefloor/rinkeby/metadata/contract.json';

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

  const { get, deploy } = deployments;
  const { deployer } = await getNamedAccounts();

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
    args: [],
    log: true,
    deterministicDeployment: true,
  });

  const TRADE_FLOOR_ADDRESS = tradeFloorReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Create initialization calldata
  //
  //////////////////////////////////////////////////////////////////////////////

  const ADDRESS_REGISTRY_ADDRESS = addressRegistry.hardhat.addressRegistry;
  const tradefloorInterface = new ethers.utils.Interface(tradeFloorReceipt.abi);
  const proxyCallData = tradefloorInterface.encodeFunctionData('initialize', [
    ADDRESS_REGISTRY_ADDRESS,
    METADATA_URI,
    CONTRACT_METADATA_URI,
  ]);

  //////////////////////////////////////////////////////////////////////////////
  //
  // Create initialization calldata
  //
  //////////////////////////////////////////////////////////////////////////////

  let tradeFloorProxyReceipt = undefined;
  try {
    tradeFloorProxyReceipt = await get(TRADE_FLOOR_PROXY_CONTRACT);
    if (!tradeFloorProxyReceipt.address) throw new Error('No address');
    console.log(
      'INFO: Proxy upgrade required! Initialization: ',
      proxyCallData
    );
  } catch (err) {
    tradeFloorProxyReceipt = await deploy(TRADE_FLOOR_PROXY_CONTRACT, {
      from: deployer,
      args: [ADDRESS_REGISTRY_ADDRESS, TRADE_FLOOR_ADDRESS, proxyCallData],
      log: true,
      deterministicDeployment: true,
    });
  }
  const TRADE_FLOOR_PROXY_ADDRESS = tradeFloorProxyReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy test staking contract
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying test staking contract');

  const testStakingContractReceipt = await deploy(TEST_STAKING_CONTRACT, {
    from: deployer,
    args: [TRADE_FLOOR_PROXY_ADDRESS],
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
  addressRegistry.hardhat.tradeFloorProxy = TRADE_FLOOR_PROXY_ADDRESS;
  addressRegistry.hardhat.stakingTest = STAKING_CONTRACT_ADDRESS;

  fs.writeFileSync(
    ADDRESS_REGISTRY,
    JSON.stringify(addressRegistry, null, '  ')
  );
};

module.exports = func;
module.exports.tags = ['SFTTest'];
module.exports.dependencies = ['SFT'];
