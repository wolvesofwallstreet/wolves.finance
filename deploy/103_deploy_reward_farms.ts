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
const CFOLIO_FARM_CONTRACT = 'CFolioFarm';
const ADDRESS_REGISTRY_CONTRACT = 'AddressRegistry';
const TRADE_FLOOR_CLIENT_LP_CONTRACT = 'TradeFloorClientLP';

// Deployed aliases
const CFOLIO_FARM_LP_CONTRACT = 'CFolioFarmLP';

// Path to address files
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const FORCE_REBUILD = process.env.FORCE_REBUILD !== undefined;

// Addressbook constants
const SFT_EVALUATOR_PROXY_KEY = ethers.utils.formatBytes32String(
  'SFT_EVALUATOR_PROXY'
);
//const BOIS_REWARDS_KEY = ethers.utils.formatBytes32String('BOIS_REWARDS');
const WOLVES_REWARDS_KEY = ethers.utils.formatBytes32String('WOLVES_REWARDS');

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Utility function to register contract addresses in the address registry
 *
 * @param deployer The account used to deploy contracts
 * @param execute The contract execution function from the hardhat-deploy plugin
 * @param registryInstance The instance of the deployed address registry contract
 * @param key The name of the contract
 * @param value The address of the contract
 */
async function setRegistryKey(deployer, execute, registryInstance, key, value) {
  // Check existing value
  try {
    const existingValue = await registryInstance.getRegistryEntry(key);
    if (existingValue === value) {
      console.log(`Registry value for ${key} already set`);
      return;
    }
  } catch (err) {
    console.log(`No registry value for ${key}`);
  }

  console.log(`Settings registry value for ${key}`);

  // Assign new value
  await execute(
    ADDRESS_REGISTRY_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    'setRegistryEntry',
    key,
    value
  );
}

/**
 * Steps to deploy the BOIS and Wolves c-folio farms
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();

  // Load contract addresses
  const configNetworks = JSON.parse(
    fs.readFileSync(CONFIG_ADDRESSES).toString()
  );
  const generatedNetworks = JSON.parse(
    fs.readFileSync(GENERATED_ADDRESSES).toString()
  );

  const configAddresses = (!FORCE_REBUILD && configNetworks[chainId]) || {};
  const generatedAddresses = generatedNetworks[chainId] || {};

  //////////////////////////////////////////////////////////////////////////////
  //
  // Get addresses
  //
  //////////////////////////////////////////////////////////////////////////////

  const ADDRESS_REGISTRY_ADDRESS = generatedAddresses.addressRegistry;
  const CONTROLLER_ADDRESS = generatedAddresses.controller;
  const SFT_EVALUATOR_PROXY_ADDRESS = generatedAddresses.sftEvaluatorProxy;
  const TRADE_FLOOR_PROXY_ADDRESS = generatedAddresses.tradeFloorProxy;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Get instances
  //
  //////////////////////////////////////////////////////////////////////////////

  const ADDRESS_REGISTRY_INSTANCE = await hardhat_re.ethers.getContract(
    ADDRESS_REGISTRY_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy CFolioFarm.sol
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.cfolioFarmLP) {
    log_step(`Using CFolioFarmLP: ${configAddresses.cfolioFarmLP}`);
    generatedAddresses.cfolioFarmLP = configAddresses.cfolioFarmLP;
  } else {
    log_step('Deploying CFolioFarmLP');

    const CFOLIO_FARM_LP_NAME = 'CFolio Farm LP';

    const cfolioFarmReceipt = await deploy(CFOLIO_FARM_LP_CONTRACT, {
      contract: CFOLIO_FARM_CONTRACT,
      from: deployer,
      args: [deployer, CFOLIO_FARM_LP_NAME, CONTROLLER_ADDRESS],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.cfolioFarmLP = cfolioFarmReceipt.address;
  }

  const CFOLIO_FARM_LP_ADDRESS = generatedAddresses.cfolioFarmLP;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Register addresses for CFolioFarmLP
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting CFolioFarmLP address in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    WOLVES_REWARDS_KEY,
    CFOLIO_FARM_LP_ADDRESS
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy TradeFloorClientLP
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.tradeFloorClientLP) {
    log_step(
      `Using TradeFloorClientLP contract: ${configAddresses.tradeFloorClientLP}`
    );
    generatedAddresses.tradeFloorClientLP = configAddresses.tradeFloorClientLP;
  } else {
    log_step('Deploying TradeFloorClientLP contract');

    const TRADE_FLOOR_TOKEN_ID = ethers.BigNumber.from('0x10000000000000000'); // Unique and >= 0x10000000000000000
    const TRADE_FLOOR_NUM_TOKEN_IDS = 8; // We use 8 atm for known cards

    const tradeFloorClientLPContractReceipt = await deploy(
      TRADE_FLOOR_CLIENT_LP_CONTRACT,
      {
        from: deployer,
        args: [
          ADDRESS_REGISTRY_ADDRESS,
          TRADE_FLOOR_PROXY_ADDRESS,
          TRADE_FLOOR_TOKEN_ID,
          TRADE_FLOOR_NUM_TOKEN_IDS,
        ],
        log: true,
        deterministicDeployment: true,
      }
    );

    generatedAddresses.tradeFloorClientLP =
      tradeFloorClientLPContractReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Update address registry file
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step(`Writing ${GENERATED_ADDRESSES}`);

  generatedNetworks[chainId] = generatedAddresses;

  fs.writeFileSync(
    GENERATED_ADDRESSES,
    JSON.stringify(generatedNetworks, null, '  ')
  );
};

module.exports = func;
module.exports.tags = ['RewardFarms'];
