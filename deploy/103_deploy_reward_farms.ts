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
const CFOLIO_ITEM_HANDLER_LP_CONTRACT = 'CFolioItemHandlerLP';
const CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT = 'CFolioItemHandlerLPProxy';
const SFT_EVALUATOR_CONTRACT = 'SFTEvaluator';
const SFT_EVALUATOR_PROXY_CONTRACT = 'SFTEvaluatorProxy';
const UPGRADE_PROXY_CONTRACT = 'UpgradeProxy';

// Deployed aliases
const CFOLIO_FARM_LP_CONTRACT = 'CFolioFarmLP';

// Path to address files
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// Addressbook constants
//const BOIS_REWARDS_KEY = ethers.utils.formatBytes32String('BOIS_REWARDS');
const WOLVES_REWARDS_KEY = ethers.utils.formatBytes32String('WOLVES_REWARDS');

const ADDRESS_BOOK_SFT_EVALUATOR_PROXY_KEY = ethers.utils.formatBytes32String(
  'SFT_EVALUATOR_PROXY'
);

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

  const configAddresses = (!IGNORE_ADDRESSES && configNetworks[chainId]) || {};
  const generatedAddresses = generatedNetworks[chainId] || {};

  //////////////////////////////////////////////////////////////////////////////
  //
  // Get addresses
  //
  //////////////////////////////////////////////////////////////////////////////

  const ADDRESS_REGISTRY_ADDRESS = generatedAddresses.addressRegistry;
  const CONTROLLER_ADDRESS = generatedAddresses.controller;

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
  // Deploy SFT evaluator
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftEvaluator) {
    log_step(`Using SFT evaluator: ${configAddresses.sftEvaluator}`);
    generatedAddresses.sftEvaluator = configAddresses.sftEvaluator;
  } else {
    log_step('Deploying SFT evaluator');

    const sftEvaluatorReceipt = await deploy(SFT_EVALUATOR_CONTRACT, {
      from: deployer,
      args: [ADDRESS_REGISTRY_ADDRESS],
      log: true,
      deterministicDeployment: false,
    });

    generatedAddresses.sftEvaluator = sftEvaluatorReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT evaluator proxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftEvaluatorProxy) {
    log_step(`Using SFT evaluator proxy: ${configAddresses.sftEvaluatorProxy}`);
    generatedAddresses.sftEvaluatorProxy = configAddresses.sftEvaluatorProxy;
  } else {
    log_step('Deploying SFT evaluator proxy');

    const sftEvaluatorProxyReceipt = await deploy(
      SFT_EVALUATOR_PROXY_CONTRACT,
      {
        contract: UPGRADE_PROXY_CONTRACT,
        from: deployer,
        args: [ADDRESS_REGISTRY_ADDRESS, generatedAddresses.sftEvaluator, []],
        log: true,
        deterministicDeployment: true,
      }
    );

    generatedAddresses.sftEvaluatorProxy = sftEvaluatorProxyReceipt.address;
  }

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_SFT_EVALUATOR_PROXY_KEY,
    generatedAddresses.sftEvaluatorProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy CFolioFarm.sol (for LP)
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.cfolioFarmLP) {
    log_step(`Using CFolioFarmLP: ${configAddresses.cfolioFarmLP}`);
    generatedAddresses.cfolioFarmLP = configAddresses.cfolioFarmLP;
  } else {
    log_step('Deploying CFolioFarmLP');

    const CFOLIO_FARM_LP_NAME = 'CFolio Farm LP';

    const cfolioFarmLPReceipt = await deploy(CFOLIO_FARM_LP_CONTRACT, {
      contract: CFOLIO_FARM_CONTRACT,
      from: deployer,
      args: [deployer, CFOLIO_FARM_LP_NAME, CONTROLLER_ADDRESS],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.cfolioFarmLP = cfolioFarmLPReceipt.address;
  }

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
    generatedAddresses.cfolioFarmLP
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy CFolioItemHandlerLP
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.cfolioItemHandlerLP) {
    log_step(
      `Using CFolioItemHandlerLP contract: ${configAddresses.cfolioItemHandlerLP}`
    );
    generatedAddresses.cfolioItemHandlerLP =
      configAddresses.cfolioItemHandlerLP;
  } else {
    log_step('Deploying CFolioItemHandlerLP contract');

    const cfolioItemHandlerLPContractReceipt = await deploy(
      CFOLIO_ITEM_HANDLER_LP_CONTRACT,
      {
        from: deployer,
        args: [ADDRESS_REGISTRY_ADDRESS],
        log: true,
        deterministicDeployment: true,
      }
    );

    generatedAddresses.cfolioItemHandlerLP =
      cfolioItemHandlerLPContractReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy CFolioItemHandlerLPProxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.cfolioItemHandlerLPProxy) {
    log_step(
      `Using CFolioItemHandlerLP proxy: ${configAddresses.cfolioItemHandlerLPProxy}`
    );
    generatedAddresses.cfolioItemHandlerLPProxy =
      configAddresses.cfolioItemHandlerLPProxy;
  } else {
    log_step('Deploying CFolioItemHandlerLP proxy');

    const cfolioItemHandlerLPProxyReceipt = await deploy(
      CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT,
      {
        contract: UPGRADE_PROXY_CONTRACT,
        from: deployer,
        args: [
          ADDRESS_REGISTRY_ADDRESS,
          generatedAddresses.cfolioItemHandlerLP,
          [],
        ],
        log: true,
        deterministicDeployment: true,
      }
    );

    generatedAddresses.cfolioItemHandlerLPProxy =
      cfolioItemHandlerLPProxyReceipt.address;
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
