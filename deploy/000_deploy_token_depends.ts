/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */

const fs = require('fs');

require('hardhat-deploy');
require('hardhat-deploy-ethers');

// TODO: Fully qualified contract names
const WETH_CONTRACT = 'WETH9';
const UNI_V2_FACTORY_CONTRACT = 'UniswapV2Factory';
const UNI_V2_ROUTER_CONTRACT = 'UniswapV2Router02';

// Path to address files
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Steps to deploy the WOWS environment
 */
const func = async function (hardhat_re) {
  // Check tags
  if (!hardhat_re.network.tags.needUniswap) return;

  const { deployments, getNamedAccounts } = hardhat_re;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();
  console.log(`Hardhat: Deploying to chain ID ${chainId}`);

  // Load contract addresses
  const configNetworks = JSON.parse(
    fs.readFileSync(CONFIG_ADDRESSES).toString()
  );
  const configAddresses = (!IGNORE_ADDRESSES && configNetworks[chainId]) || {};
  let generatedNetworks = {};
  try {
    generatedNetworks = JSON.parse(
      fs.readFileSync(GENERATED_ADDRESSES).toString()
    );
  } catch (err) {
    // File hasn't been created yet, start with an empty object
  }
  const generatedAddresses = generatedNetworks[chainId] || {};

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy W-ETH
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses?.weth) {
    log_step(`Using deployed W-ETH contract: ${configAddresses.weth}`);
    generatedAddresses.weth = configAddresses.weth;
  } else {
    log_step('Deploying W-ETH contract');

    const wethReceipt = await deploy(WETH_CONTRACT, {
      from: deployer,
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.weth = wethReceipt.address;
  }

  const WETH_ADDRESS = generatedAddresses.weth;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy UNI-V2 factory
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses?.uniV2Factory) {
    log_step(`Using deployed UNI-V2 factory: ${configAddresses?.uniV2Factory}`);
    generatedAddresses.uniV2Factory = configAddresses.uniV2Factory;
  } else {
    log_step('Deploying UNI-V2 factory');

    const univ2FactoryReceipt = await deploy(UNI_V2_FACTORY_CONTRACT, {
      from: deployer,
      args: [deployer],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.uniV2Factory = univ2FactoryReceipt.address;
  }

  const UNI_V2_FACTORY_ADDRESS = generatedAddresses.uniV2Factory;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy UNI-V2 router
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses?.uniV2Router) {
    log_step(`Using deployed UNI-V2 router: ${configAddresses?.uniV2Router}`);
    generatedAddresses.uniV2Router = configAddresses.uniV2Router;
  } else {
    log_step('Deploying UNI-V2 router');

    const univ2RouterReceipt = await deploy(UNI_V2_ROUTER_CONTRACT, {
      from: deployer,
      args: [UNI_V2_FACTORY_ADDRESS, WETH_ADDRESS],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.uniV2Router = univ2RouterReceipt.address;
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
module.exports.tags = ['TokenDepends'];
