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
const TRADE_FLOOR_PROXY_CONTRACT = 'UpgradeProxy';
const TRADEFLOOR_CLIENTLP_CONTRACT = 'TradeFloorClientLP';

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
 * Steps to deploy the WOWS SFT environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { get, deploy } = deployments;
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
  // Get Address Registry
  //
  //////////////////////////////////////////////////////////////////////////////

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

  const tradefloorInterface = new ethers.utils.Interface(tradeFloorAbi);
  const proxyCallData = tradefloorInterface.encodeFunctionData('initialize', [
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
        from: deployer,
        args: [ADDRESS_REGISTRY_ADDRESS, TRADE_FLOOR_ADDRESS, proxyCallData],
        log: true,
        deterministicDeployment: true,
      });
    }

    generatedAddresses.tradeFloorProxy = tradeFloorProxyReceipt.address;
  }

  const TRADE_FLOOR_PROXY_ADDRESS = generatedAddresses.tradeFloorProxy;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy TradeFloorClientLP
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.tradeFloorClientLP) {
    log_step(
      `Using tradeFloorClientLP contract: ${configAddresses.tradeFloorClientLP}`
    );
    generatedAddresses.tradeFloorClientLP = configAddresses.tradeFloorClientLP;
  } else {
    log_step('Deploying tradeFloorClientLP contract');

    const tradeFloorClientLPContractReceipt = await deploy(
      TRADEFLOOR_CLIENTLP_CONTRACT,
      {
        from: deployer,
        args: [
          ADDRESS_REGISTRY_ADDRESS,
          TRADE_FLOOR_PROXY_ADDRESS,
          ethers.BigNumber.from('0x10000000000000000'),
          8,
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
module.exports.tags = ['TradeFloor'];
