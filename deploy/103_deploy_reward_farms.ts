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
const CFOLIO_ITEM_HANDLER_SC_CONTRACT = 'CFolioItemHandlerSC';
const CFOLIO_ITEM_HANDLER_SC_PROXY_CONTRACT = 'CFolioItemHandlerSCProxy';
const UPGRADE_PROXY_CONTRACT = 'UpgradeProxy';

// Deployed aliases
const CFOLIO_FARM_LP_CONTRACT = 'CFolioFarmLP';
const CFOLIO_FARM_SC_CONTRACT = 'CFolioFarmSC';

// Contract ABIs
const CFOLIO_ITEM_HANDLER_SC_ABI = `${__dirname}/../src/abi/contracts/src/cfolio/CFolioItemHandlerSC.sol/CFolioItemHandlerSC.json`;

// Path to address files
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// Addressbook constants
const BOIS_REWARDS_KEY = ethers.utils.formatBytes32String('BOIS_REWARDS');
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

  console.log(`Setting registry value for ${key}`);

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

  const { deploy, execute, get } = deployments;
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

  // Load ABIs
  const cfolioItemHandlerSCAbi = JSON.parse(
    fs.readFileSync(CFOLIO_ITEM_HANDLER_SC_ABI)
  );

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
  // Deploy CFolioFarm.sol (for SC)
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.cfolioFarmSC) {
    log_step(`Using CFolioFarmSC: ${configAddresses.cfolioFarmSC}`);
    generatedAddresses.cfolioFarmSC = configAddresses.cfolioFarmSC;
  } else {
    log_step('Deploying CFolioFarmSC');

    const CFOLIO_FARM_SC_NAME = 'CFolio Farm SC';

    const cfolioFarmSCReceipt = await deploy(CFOLIO_FARM_SC_CONTRACT, {
      contract: CFOLIO_FARM_CONTRACT,
      from: deployer,
      args: [deployer, CFOLIO_FARM_SC_NAME, CONTROLLER_ADDRESS],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.cfolioFarmSC = cfolioFarmSCReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Register addresses for CFolioFarmSC
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting CFolioFarmSC address in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    BOIS_REWARDS_KEY,
    generatedAddresses.cfolioFarmSC
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy CFolioItemHandlerSC
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.cfolioItemHandlerSC) {
    log_step(
      `Using CFolioItemHandlerSC contract: ${configAddresses.cfolioItemHandlerSC}`
    );
    generatedAddresses.cfolioItemHandlerSC =
      configAddresses.cfolioItemHandlerSC;
  } else {
    log_step('Deploying CFolioItemHandlerSC contract');

    const cfolioItemHandlerSCContractReceipt = await deploy(
      CFOLIO_ITEM_HANDLER_SC_CONTRACT,
      {
        from: deployer,
        args: [ADDRESS_REGISTRY_ADDRESS],
        log: true,
        deterministicDeployment: true,
      }
    );

    generatedAddresses.cfolioItemHandlerSC =
      cfolioItemHandlerSCContractReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Create initialization calldata
  //
  //////////////////////////////////////////////////////////////////////////////

  const cfolioItemHandlerSCInterface = new ethers.utils.Interface(
    cfolioItemHandlerSCAbi
  );
  const proxyCallData = cfolioItemHandlerSCInterface.encodeFunctionData(
    'initialize',
    []
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy CFolioItemHandlerSCProxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.cfolioItemHandlerSCProxy) {
    log_step(
      `Using CFolioItemHandlerSC proxy: ${configAddresses.cfolioItemHandlerSCProxy}`
    );
    generatedAddresses.cfolioItemHandlerSCProxy =
      configAddresses.cfolioItemHandlerSCProxy;
  } else {
    log_step('Deploying CFolioItemHandlerSC proxy');

    let cfolioItemHandlerSCProxyReceipt = undefined;
    try {
      cfolioItemHandlerSCProxyReceipt = await get(
        CFOLIO_ITEM_HANDLER_SC_PROXY_CONTRACT
      );

      if (!cfolioItemHandlerSCProxyReceipt.address) {
        throw new Error('No address');
      }

      console.log(
        'INFO: Proxy upgrade required! Initialization: ',
        proxyCallData
      );
    } catch (err) {
      cfolioItemHandlerSCProxyReceipt = await deploy(
        CFOLIO_ITEM_HANDLER_SC_PROXY_CONTRACT,
        {
          contract: UPGRADE_PROXY_CONTRACT,
          from: deployer,
          args: [
            ADDRESS_REGISTRY_ADDRESS,
            generatedAddresses.cfolioItemHandlerSC,
            proxyCallData,
          ],
          log: true,
          deterministicDeployment: true,
        }
      );
    }

    generatedAddresses.cfolioItemHandlerSCProxy =
      cfolioItemHandlerSCProxyReceipt.address;
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
