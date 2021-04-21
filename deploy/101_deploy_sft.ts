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
const SFT_HOLDER_CONTRACT = 'WOWSERC1155';
const SFT_CRYPTOFOLIO = 'WOWSCryptofolio';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';
const SFT_EVALUATOR_CONTRACT = 'SFTEvaluator';
const SFT_EVALUATOR_PROXY_CONTRACT = 'SFTEvaluatorProxy';

const ADDRESS_BOOK_SFT_HOLDER_KEY = ethers.utils.formatBytes32String(
  'SFT_HOLDER'
);

const ADDRESS_BOOK_SFT_EVALUATOR_PROXY_KEY = ethers.utils.formatBytes32String(
  'SFT_EVALUATOR_PROXY'
);

// ERC-1155 metadata URI
const METADATA_URI = 'https://4travelers.de/wolves_assets/metadata/';

// Filename for contract metadata, will be prefixed with METADATA_URI
// TODO: replace mainnet_contract.json with something from config!!!
const CONTRACT_METADATA_NAME =
  'https://4travelers.de/wolves_assets/metadata/mainnet_contract.json';

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
const sft_func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { execute, deploy } = deployments;
  const { deployer, marketingWallet } = await getNamedAccounts();

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
  // Get Address Registry Instance
  //
  //////////////////////////////////////////////////////////////////////////////

  const ADDRESS_REGISTRY_INSTANCE = await hardhat_re.ethers.getContract(
    ADDRESS_REGISTRY_CONTRACT
  );
  const ADDRESS_REGISTRY_ADDRESS = generatedAddresses.addressRegistry;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT cryptofolio
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftCryptofolio) {
    log_step(`Using SFT cryptofolio: ${configAddresses.sftCryptofolio}`);
    generatedAddresses.sftCryptofolio = configAddresses.sftCryptofolio;
  } else {
    log_step('Deploying SFT cryptofolio');

    const sftCryptofolioReceipt = await deploy(SFT_CRYPTOFOLIO, {
      from: deployer,
      args: [],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sftCryptofolio = sftCryptofolioReceipt.address;
  }

  const SFT_CRYPTOFOLIO_ADDRESS = generatedAddresses.sftCryptofolio;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT holder contract
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftHolder) {
    log_step(`Using SFT holder contract: ${configAddresses.sftHolder}`);
    generatedAddresses.sftHolder = configAddresses.sftHolder;
  } else {
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

    generatedAddresses.sftHolder = sftHolderReceipt.address;
  }

  const SFT_HOLDER_ADDRESS = generatedAddresses.sftHolder;

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_SFT_HOLDER_KEY,
    SFT_HOLDER_ADDRESS
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT minter
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftMinter) {
    log_step(`Using SFT minter: ${configAddresses.sftMinter}`);
    generatedAddresses.sftMinter = configAddresses.sftMinter;
  } else {
    log_step('Deploying SFT minter');

    const sftMinterReceipt = await deploy(SFT_MINTER_CONTRACT, {
      from: deployer,
      args: [
        marketingWallet,
        generatedAddresses.token,
        generatedAddresses.rewardHandler,
        SFT_HOLDER_ADDRESS,
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sftMinter = sftMinterReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT evaluator
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftMinter) {
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
        from: deployer,
        args: [generatedAddresses.sftEvaluator],
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

module.exports = sft_func;
module.exports.tags = ['SFT'];
