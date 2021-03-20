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
const SFT_HOLDER_CONTRACT = 'WOWSERC1155';
const SFT_CRYPTOFOLIO = 'WOWSCryptofolio';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';

// ERC-1155 metadata URI
const METADATA_URI =
  'https://raw.githubusercontent.com/wolvesofwallstreet/wolves.assets.low/main/metadata/';

// Filename for contract metadata, will be prefixed with METADATA_URI
const CONTRACT_METADATA_NAME = 'mainnet_contract.json';

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
  // Deploy SFT cryptofolio
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying SFT cryptofolio');

  const sftCryptofolioReceipt = await deploy(SFT_CRYPTOFOLIO, {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true,
  });

  const SFT_CRYPTOFOLIO_ADDRESS = sftCryptofolioReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT holder contract
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying SFT holder contract');

  const sftHolderReceipt = await deploy(SFT_HOLDER_CONTRACT, {
    from: deployer,
    args: [
      marketingWallet,
      SFT_CRYPTOFOLIO_ADDRESS,
      METADATA_URI,
      CONTRACT_METADATA_NAME,
    ],
    log: true,
    deterministicDeployment: true,
  });

  const SFT_HOLDER_ADDRESS = sftHolderReceipt.address;

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
      SFT_HOLDER_ADDRESS,
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

  addressRegistry.hardhat.sftHolder = SFT_HOLDER_ADDRESS;
  addressRegistry.hardhat.sftMinter = SFT_MINTER_ADDRESS;

  fs.writeFileSync(
    ADDRESS_REGISTRY,
    JSON.stringify(addressRegistry, null, '  ')
  );
};

module.exports = sft_func;
module.exports.tags = ['SFT'];
module.exports.dependencies = ['Token'];
