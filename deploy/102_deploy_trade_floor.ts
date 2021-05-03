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
const ADDRESS_REGISTRY_CONTRACT = 'AddressRegistry';
const TRADE_FLOOR_CONTRACT = 'TradeFloor';
const TRADE_FLOOR_PROXY_CONTRACT = 'TradeFloorProxy';
const UPGRADE_PROXY_CONTRACT = 'UpgradeProxy';

const ADDRESS_BOOK_TRADE_FLOOR_PROXY_KEY = ethers.utils.formatBytes32String(
  'TRADE_FLOOR_PROXY'
);

// Contract ABIs
const TRADE_FLOOR_ABI = `${__dirname}/../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json`;

// TODO: Trade floor will use {id} mechamism eventually
const METADATA_URI =
  'https://4travelers.de/wolves_assets/tradefloor/rinkeby/metadata/';
const CONTRACT_METADATA_URI =
  'https://4travelers.de/wolves_assets/tradefloor/rinkeby/metadata/contract.json';

// Path to address files
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const FORCE_REBUILD = process.env.FORCE_REBUILD !== undefined;

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
 * Steps to deploy the WOWS SFT environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { execute, get, deploy } = deployments;
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

  // Load ABIs
  const tradeFloorAbi = JSON.parse(fs.readFileSync(TRADE_FLOOR_ABI));

  //////////////////////////////////////////////////////////////////////////////
  //
  // Get Address Registry Instance
  //
  //////////////////////////////////////////////////////////////////////////////

  const ADDRESS_REGISTRY_INSTANCE = await hardhat_re.ethers.getContract(
    ADDRESS_REGISTRY_CONTRACT
  );
  const ADDRESS_REGISTRY_ADDRESS = generatedAddresses.addressRegistry;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Trade Floor
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.tradeFloor) {
    log_step(`Using Trade Floor: ${configAddresses.tradeFloor}`);
    generatedAddresses.tradeFloor = configAddresses.tradeFloor;
  } else {
    log_step('Deploying Trade Floor');

    const tradeFloorReceipt = await deploy(TRADE_FLOOR_CONTRACT, {
      from: deployer,
      args: [
        ADDRESS_REGISTRY_ADDRESS,
        configAddresses.openSeaProxy ||
          '0x0000000000000000000000000000000000000000',
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.tradeFloor = tradeFloorReceipt.address;
  }

  const TRADE_FLOOR_ADDRESS = generatedAddresses.tradeFloor;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Create initialization calldata
  //
  //////////////////////////////////////////////////////////////////////////////

  const tradeFloorInterface = new ethers.utils.Interface(tradeFloorAbi);
  const proxyCallData = tradeFloorInterface.encodeFunctionData('initialize', [
    METADATA_URI,
    CONTRACT_METADATA_URI,
  ]);

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Trade Floor proxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.tradeFloorProxy) {
    log_step(`Using Trade Floor proxy: ${configAddresses.tradeFloorProxy}`);
    generatedAddresses.tradeFloorProxy = configAddresses.tradeFloorProxy;
  } else {
    log_step('Deploying Trade Floor proxy');

    let tradeFloorProxyReceipt = undefined;
    try {
      tradeFloorProxyReceipt = await get(TRADE_FLOOR_PROXY_CONTRACT);

      if (!tradeFloorProxyReceipt.address) {
        throw new Error('No address');
      }

      console.log(
        'INFO: Proxy upgrade required! Initialization: ',
        proxyCallData
      );
    } catch (err) {
      tradeFloorProxyReceipt = await deploy(TRADE_FLOOR_PROXY_CONTRACT, {
        contract: UPGRADE_PROXY_CONTRACT,
        from: deployer,
        args: [ADDRESS_REGISTRY_ADDRESS, TRADE_FLOOR_ADDRESS, proxyCallData],
        log: true,
        deterministicDeployment: true,
      });
    }

    generatedAddresses.tradeFloorProxy = tradeFloorProxyReceipt.address;
  }

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_TRADE_FLOOR_PROXY_KEY,
    generatedAddresses.tradeFloorProxy
  );

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
module.exports.tags = ['TradeFloor'];
