/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */

const ethers = require('ethers');

require('hardhat-deploy');
require('hardhat-deploy-ethers');

// TODO: Fully qualified contract names
const WETH_CONTRACT = 'WETH9';
const UNI_V2_FACTORY_CONTRACT = 'UniswapV2Factory';
const UNI_V2_ROUTER_CONTRACT = 'UniswapV2Router02';
const ADDRESS_REGISTRY_CONTRACT = 'AddressRegistry';
const ADDRESS_BOOK_CONTRACT = 'AddressBook';
const TOKEN_CONTRACT = 'WowsToken';
const CONTROLLER_CONTRACT = 'Controller';
const UNIV2_STAKE_FARM_CONTRACT = 'UniV2StakeFarm';
const BOOSTER_CONTRACT = 'Booster';
const PRESALE_CONTRACT = 'Crowdsale';

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
  // Address book
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying address book');

  await deploy(ADDRESS_BOOK_CONTRACT, {
    from: deployer,
    log: true,
    deterministicDeployment: true,
  });

  const ADDRESS_BOOK_INSTANCE = await hardhat_re.ethers.getContract(
    ADDRESS_BOOK_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Register addresses for wallets and Uniswap router
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting addresses in address registry');

  const MARKETING_WALLET_KEY = await ADDRESS_BOOK_INSTANCE.MARKETING_WALLET();
  const TEAM_WALLET_KEY = await ADDRESS_BOOK_INSTANCE.TEAM_WALLET();
  const UNISWAP_ROUTER_KEY = await ADDRESS_BOOK_INSTANCE.UNISWAP_V2_ROUTER02();

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    MARKETING_WALLET_KEY,
    marketingWallet
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    TEAM_WALLET_KEY,
    teamWallet
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    UNISWAP_ROUTER_KEY,
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
  // Deploy controller
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying controller');

  // Reward handler - right now it's Token.sol
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

  const STAKE_FARM_KEY = await ADDRESS_BOOK_INSTANCE.WETH_WOWS_STAKE_FARM();

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    STAKE_FARM_KEY,
    UNIV2_STAKE_FARM_ADDRESS
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy booster
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Deploying booster');

  await deploy(BOOSTER_CONTRACT, {
    from: deployer,
    log: true,
    args: [deployer],
    deterministicDeployment: true,
  });

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

  await deploy(PRESALE_CONTRACT, {
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

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls
  //
  //////////////////////////////////////////////////////////////////////////////

  //
  // 1.) Call Token.sol::grantRole(token.sol.REWARD_ROLE(), controller)
  //     This is to allow controller to call into Token.sol to distribute
  //     rewards.
  //
  // 2.) Call Controller.sol::registerFarm()
  //     Parameters:
  //       * farmAddress         The UniV2StakeFarm address
  //       * rewardCap           15,000 * 1e18 Wei
  //       * rewardsPerDuration  (5000 * 2 / 52) * 1e18 Wei - we have 2 week duration!
  //       * rewardProvided      0 Wei
  //       * rewardFee           2 * 1e4 (0.02 == 2%)
  //
  // 3.) Call Token.sol::setBooster()
  //     Parameters:
  //       * booster  The address of Booster.sol
  //
  // 4.) Call Token.sol::grantRole(token.sol.MINTER_ROLE(), Crowdsale.sol)
  //     !!! ONLY DURING PRESALE !!!
  //
  // 5.) Call Controller.sol::setWorker(teamwallet)
  //     Until we haven't an automatic process for maintanance
  //     the current tem wallet is the "worker" (see next)
  //
  // 6.) Call Controller.sol::refuelfarms < 1 day before duration ends
  //     Until we haven't an automatic process for maintanance
  //     this has to be done every 2 weeks
  //
};

module.exports = func;
