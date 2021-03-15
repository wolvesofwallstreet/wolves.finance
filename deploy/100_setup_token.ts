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
const TOKEN_CONTRACT = 'WowsToken';
const CONTROLLER_CONTRACT = 'Controller';

// Path to generated addresses file
const ADDRESS_REGISTRY = `${__dirname}/../src/config/generated-addresses.json`;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Steps to deploy the WOWS environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { execute } = deployments;
  const { marketingWallet } = await getNamedAccounts();

  // Load contract addresses
  const addressRegistry = JSON.parse(
    fs.readFileSync(ADDRESS_REGISTRY).toString()
  );

  const TOKEN_INSTANCE = await hardhat_re.ethers.getContract(TOKEN_CONTRACT);

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for token
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls');

  //
  // 1.) Call WOWSErc20.sol::grantRole(WOWSErc20.sol.REWARD_ROLE(), controller)
  //     This is to allow controller to call into WOWSErc20.sol to distribute
  //     rewards.
  //

  await execute(
    TOKEN_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'grantRole',
    await TOKEN_INSTANCE.MINTER_ROLE(),
    addressRegistry.hardhat.controller
  );

  //
  // 2.) Call Controller.sol::registerFarm()
  //     Parameters:
  //       * farmAddress         The UniV2StakeFarm address
  //       * rewardCap           15,000 * 1e18 Wei
  //       * rewardsPerDuration  (5000 * 2 / 52) * 1e18 Wei - we have 2 week duration!
  //       * rewardProvided      0 Wei
  //       * rewardFee           2 * 1e4 (0.02 == 2%)
  //

  const FARM_ADDRESS = addressRegistry.hardhat.stakeFarm;
  const REWARD_CAP = ethers.BigNumber.from('15000000000000000000000');
  const REWARD_PER_DURATION = ethers.BigNumber.from('192307692300000000000');
  const REWARD_PROVIDED = 0;
  const REWARD_FEE = 2 * 1e4;

  await execute(
    CONTROLLER_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'registerFarm',
    FARM_ADDRESS,
    REWARD_CAP,
    REWARD_PER_DURATION,
    REWARD_PROVIDED,
    REWARD_FEE
  );

  //
  // 3.) Call WOWSErc20.sol::setBooster()
  //     Parameters:
  //       * booster  The address of Booster.sol
  //

  await execute(
    TOKEN_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'setBooster',
    addressRegistry.hardhat.booster
  );

  //
  // 4.) Call WOWSErc20.sol::grantRole(WOWSErc20.sol.MINTER_ROLE(), Crowdsale.sol)
  //     !!! ONLY DURING PRESALE !!!
  //

  await execute(
    TOKEN_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'grantRole',
    await TOKEN_INSTANCE.MINTER_ROLE(),
    addressRegistry.hardhat.presale
  );

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
module.exports.tags = ['TokenSetup'];
module.exports.dependencies = ['Token'];
