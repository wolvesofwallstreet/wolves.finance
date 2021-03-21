/*
 * Copyright (C) 2020 The Wolfpack
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
const WETH_CONTRACT = 'WETH9';
const UNI_V2_FACTORY_CONTRACT = 'UniswapV2Factory';
const UNI_V2_ROUTER_CONTRACT = 'UniswapV2Router02';
const ADDRESS_REGISTRY_CONTRACT = 'AddressRegistry';
const TOKEN_CONTRACT = 'WowsToken';
const CONTROLLER_CONTRACT = 'Controller';
const UNIV2_STAKE_FARM_CONTRACT = 'UniV2StakeFarm';
const BOOSTER_CONTRACT = 'Booster';
const REWARD_HANDLER_CONTRACT = 'RewardHandler';
const PRESALE_CONTRACT = 'Crowdsale';

// Path to generated addresses file
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;

// Addressbook constants
const ADDRESS_BOOK_TEAM_WALLET_KEY = ethers.utils.formatBytes32String(
  'TEAM_WALLET'
);
const ADDRESS_BOOK_MARKETING_WALLET_KEY = ethers.utils.formatBytes32String(
  'MARKETING_WALLET'
);
const ADDRESS_BOOK_UNISWAP_V2_ROUTER02_KEY = ethers.utils.formatBytes32String(
  'UNISWAP_V2_ROUTER02'
);
const ADDRESS_BOOK_STAKE_FARM_KEY = ethers.utils.formatBytes32String(
  'WETH_WOWS_STAKE_FARM'
);
const ADDRESS_BOOK_WOWS_TOKEN_KEY = ethers.utils.formatBytes32String(
  'WOWS_TOKEN'
);
const ADDRESS_BOOK_WOWS_BOOSTER_KEY = ethers.utils.formatBytes32String(
  'WOWS_BOOSTER'
);
const ADDRESS_BOOK_REWARD_HANDLER_KEY = ethers.utils.formatBytes32String(
  'REWARD_HANDLER'
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
 * Steps to deploy the WOWS environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { deploy, execute } = deployments;
  const { deployer, marketingWallet, teamWallet } = await getNamedAccounts();

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy dependencies
  //
  // TODO: Use existing contracts on public testnets
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying W-ETH contract');

  const wethReceipt = await deploy(WETH_CONTRACT, {
    from: deployer,
    log: true,
    deterministicDeployment: true,
  });

  const WETH_ADDRESS = wethReceipt.address;

  log_step('Deploying UNI-V2 factory');

  const univ2FactoryReceipt = await deploy(UNI_V2_FACTORY_CONTRACT, {
    from: deployer,
    args: [deployer],
    log: true,
    deterministicDeployment: true,
  });

  const UNI_V2_FACTORY_ADDRESS = univ2FactoryReceipt.address;

  log_step('Deploying UNI-V2 router');

  const univ2RouterReceipt = await deploy(UNI_V2_ROUTER_CONTRACT, {
    from: deployer,
    args: [UNI_V2_FACTORY_ADDRESS, WETH_ADDRESS],
    log: true,
    deterministicDeployment: true,
  });

  const UNI_V2_ROUTER_ADDRESS = univ2RouterReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Address registry
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying address registry');

  const addressRegistryReceipt = await deploy(ADDRESS_REGISTRY_CONTRACT, {
    from: deployer,
    args: [deployer],
    log: true,
    deterministicDeployment: true,

    /* TODO: Diamond upgradeability support
    owner: deployer,

    facets: [ADDRESS_REGISTRY_CONTRACT],

    // Has to be a non-zero 32bytes string (in hex format)
    // TODO
    deterministicSalt:
      '0x0000000000000000000000000000000000000000000000000000000000000001',

    execute: {
      methodName: 'postUpgrade',
      args: [],
    },
    */
  });

  const ADDRESS_REGISTRY_ADDRESS = addressRegistryReceipt.address;
  const ADDRESS_REGISTRY_INSTANCE = await hardhat_re.ethers.getContract(
    ADDRESS_REGISTRY_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Register addresses for wallets and Uniswap router
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting addresses in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_MARKETING_WALLET_KEY,
    marketingWallet
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_TEAM_WALLET_KEY,
    teamWallet
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_UNISWAP_V2_ROUTER02_KEY,
    UNI_V2_ROUTER_ADDRESS
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy token
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying token');

  const tokenReceipt = await deploy(TOKEN_CONTRACT, {
    from: deployer,
    args: [ADDRESS_REGISTRY_ADDRESS],
    log: true,
    deterministicDeployment: true,
  });

  const TOKEN_ADDRESS = tokenReceipt.address;
  const TOKEN_INSTANCE = await hardhat_re.ethers.getContract(TOKEN_CONTRACT);

  //////////////////////////////////////////////////////////////////////////////
  //
  // Registry address for token
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting WOWS token in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_WOWS_TOKEN_KEY,
    TOKEN_ADDRESS
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy controller
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying controller');

  // Reward handler - right now it's WOWSErc20.sol
  const REWARD_HANDLER = TOKEN_ADDRESS;
  // Previous controller: 0 address / only for later updates
  const PREVIOUS_CONTROLLER = '0x0000000000000000000000000000000000000000';

  const controllerReceipt = await deploy(CONTROLLER_CONTRACT, {
    from: deployer,
    args: [ADDRESS_REGISTRY_ADDRESS, REWARD_HANDLER, PREVIOUS_CONTROLLER],
    log: true,
    deterministicDeployment: true,
  });

  const CONTROLLER_ADDRESS = controllerReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy UniV2StakeFarm.sol
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying stake farm');

  const STAKE_FARM_NAME = 'WETH/WOWS LP Farm';
  const STAKING_TOKEN = await TOKEN_INSTANCE.uniV2Pair();
  const REWARD_TOKEN = TOKEN_ADDRESS;
  // Address of UniV2 WETH/USDT pool, can be 0 for test
  const ROUTE = '0x0000000000000000000000000000000000000000';

  const univ2StakeFarmReceipt = await deploy(UNIV2_STAKE_FARM_CONTRACT, {
    from: deployer,
    args: [
      deployer,
      STAKE_FARM_NAME,
      STAKING_TOKEN,
      REWARD_TOKEN,
      CONTROLLER_ADDRESS,
      ROUTE,
    ],
    log: true,
    deterministicDeployment: true,
  });

  const UNIV2_STAKE_FARM_ADDRESS = univ2StakeFarmReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Registry address for stake farm
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting stake farm in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_STAKE_FARM_KEY,
    UNIV2_STAKE_FARM_ADDRESS
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy booster
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying booster');

  const boosterReceipt = await deploy(BOOSTER_CONTRACT, {
    from: deployer,
    log: true,
    args: [deployer],
    deterministicDeployment: true,
  });

  const BOOSTER_ADDRESS = boosterReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Registry address for Booster
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting booster in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_WOWS_BOOSTER_KEY,
    BOOSTER_ADDRESS
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy RewardHandler
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying RewardHandler');

  const rewardHandlerReceipt = await deploy(REWARD_HANDLER_CONTRACT, {
    from: deployer,
    log: true,
    args: [ADDRESS_REGISTRY_ADDRESS],
    deterministicDeployment: true,
  });

  const REWARD_HANDLER_ADDRESS = rewardHandlerReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Registry address for RewardHandler
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting RewardHander in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_REWARD_HANDLER_KEY,
    REWARD_HANDLER_ADDRESS
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy presale
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying presale');

  const RATE = 80; // Token units per Wei
  const CAP = ethers.BigNumber.from('75000000000000000000'); // 75 * 1e18 Wei
  const INVEST_MIN = ethers.BigNumber.from('200000000000000000'); // 2 * 1e17 Wei (0.2 ETH)
  const WALLET_CAP = ethers.BigNumber.from('3000000000000000000'); // 3 * 1e18 Wei (3 ETH)
  const LP_ETH = 3750; // Token units
  const LP_TOKEN = 240_000; // Token units
  const OPENING_TIME = Math.round(Date.now() / 1000) + 300; // Now + 5 min
  const CLOSING_TIME = Math.round(Date.now() / 1000) + 600; // Now + 10 min

  const presaleReceipt = await deploy(PRESALE_CONTRACT, {
    from: deployer,
    args: [
      ADDRESS_REGISTRY_ADDRESS,
      RATE,
      TOKEN_ADDRESS,
      CAP,
      INVEST_MIN,
      WALLET_CAP,
      LP_ETH,
      LP_TOKEN,
      OPENING_TIME,
      CLOSING_TIME,
    ],
    log: true,
    deterministicDeployment: true,
  });

  const PRESALE_ADDRESS = presaleReceipt.address;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Generate address registry file
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step(`Writing ${GENERATED_ADDRESSES}`);

  const addresses = {
    hardhat: {
      addressRegistry: ADDRESS_REGISTRY_ADDRESS,
      token: TOKEN_ADDRESS,
      controller: CONTROLLER_ADDRESS,
      stakeFarm: UNIV2_STAKE_FARM_ADDRESS,
      booster: BOOSTER_ADDRESS,
      presale: PRESALE_ADDRESS,
      rewardHandler: REWARD_HANDLER_ADDRESS,
    },
  };

  fs.writeFileSync(GENERATED_ADDRESSES, JSON.stringify(addresses, null, '  '));
};

module.exports = func;
module.exports.tags = ['Token'];
