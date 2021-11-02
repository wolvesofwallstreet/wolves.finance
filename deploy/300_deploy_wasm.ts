/*
 * Copyright (C) 2020-2021 The Wolfpack
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
const FILESYSTEM_CONTRACT = 'Filesystem';

// Path to address files
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// Contract ABIs
//const FILESYSTEM_ABI = `${__dirname}/../src/abi/contracts/src/filesystem/Filesystem.sol/Filesystem.json`;

//////////////////////////////////////////////////////////////////////////////
// Functions
//////////////////////////////////////////////////////////////////////////////

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Steps to deploy the WOWS environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();

  // Load contract addresses
  const configNetworks = JSON.parse(
    fs.readFileSync(CONFIG_ADDRESSES).toString()
  );
  let generatedNetworks = {};
  try {
    generatedNetworks = JSON.parse(
      fs.readFileSync(GENERATED_ADDRESSES).toString()
    );
  } catch (err) {
    // File hasn't been created yet, start with an empty object
  }

  const configAddresses = (!IGNORE_ADDRESSES && configNetworks[chainId]) || {};
  const generatedAddresses = generatedNetworks[chainId] || {};

  console.log('Deployer: ', deployer);

  // Load ABIs
  //const filesystemAbi = JSON.parse(fs.readFileSync(FILESYSTEM_ABI));

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy filesystem
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.filesystem) {
    log_step(`Using deployed filesystem: ${configAddresses.filesystem}`);
    generatedAddresses.filesystem = configAddresses.filesystem;
  } else {
    log_step('Deploying filesystem');

    const filesystemReceipt = await deploy(FILESYSTEM_CONTRACT, {
      from: deployer,
      log: true,
      args: [],
      deterministicDeployment: true,
    });

    generatedAddresses.filesystem = filesystemReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Generate address registry file
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
module.exports.tags = ['DeployWASM'];
