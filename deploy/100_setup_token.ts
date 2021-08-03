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
const CONTROLLER_UPDATE_CONTRACT = 'ControllerUpdate';
const REWARD_HANDLER_CONTRACT = 'RewardHandler';
const UNIV2_STAKE_FARM_CONTRACT = 'UniV2StakeFarm';

// Path to generated addresses file
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
  const { deployments, getNamedAccounts } = hardhat_re;

  const { catchUnknownSigner, execute } = deployments;
  const { marketingWallet } = await getNamedAccounts();

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

  // Load deployed contract instances
  const CONTROLLER_INSTANCE = await hardhat_re.ethers.getContract(
    CONTROLLER_CONTRACT
  );
  const TOKEN_INSTANCE = await hardhat_re.ethers.getContract(TOKEN_CONTRACT);
  const REWARD_HANDLER_INSTANCE = await hardhat_re.ethers.getContract(
    REWARD_HANDLER_CONTRACT
  );
  const UNIV2_STAKE_FARM_INSTANCE = await hardhat_re.ethers.getContract(
    UNIV2_STAKE_FARM_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for token
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls');

  //
  // 1.) Call RewardHandler.sol::revokeRole(RewardHandler.REWARD_ROLE(), controllerUpdate)
  //

  if (
    configAddresses.controllerUpdate &&
    configAddresses.controllerUpdate !== generatedAddresses.controller &&
    (await REWARD_HANDLER_INSTANCE.hasRole(
      await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
      configAddresses.controllerUpdate
    ))
  ) {
    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          log: false,
        },
        'revokeRole',
        await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
        generatedAddresses.controllerUpdate
      )
    );
  }

  //
  // 2.) Call RewardHandler.sol::grantRole(RewardHandler.sol.REWARD_ROLE(), controller)
  //     This is to allow controller to call into RewardHandler.sol to distribute
  //     rewards.
  //

  if (
    !(await REWARD_HANDLER_INSTANCE.hasRole(
      await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
      generatedAddresses.controller
    ))
  ) {
    console.log('Grant reward role to controller');

    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          log: false,
        },
        'grantRole',
        await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
        generatedAddresses.controller
      )
    );
  } else {
    console.log('Reward role already granted to controller');
  }

  //
  // 3.) Call WOWSErc20.sol::grantRole(WOWSErc20.sol.MINTER_ROLE(), controller)
  //     This is to allow controller to call into WOWSErc20.sol to distribute
  //     rewards.
  //

  if (
    !(await TOKEN_INSTANCE.hasRole(
      await TOKEN_INSTANCE.MINTER_ROLE(),
      generatedAddresses.rewardHandler
    ))
  ) {
    console.log('Grant minter role to reward handler');

    await catchUnknownSigner(
      execute(
        TOKEN_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'grantRole',
        await TOKEN_INSTANCE.MINTER_ROLE(),
        generatedAddresses.rewardHandler
      )
    );
  } else {
    console.log('Minter role already granted to reward handler');
  }

  //
  // 4.) Call Controller.sol::registerFarm()
  //     Parameters:
  //       * farmAddress         The UniV2StakeFarm address
  //       * rewardCap           15,000 * 1e18 Wei
  //       * rewardsPerDuration  (5000 * 2 / 52) * 1e18 Wei - we have 2 week duration!
  //       * rewardProvided      0 Wei
  //       * rewardFee           2 * 1e4 (0.02 == 2%)
  //
  // We can only register the farm into matching Contoller

  const FARM_ADDRESS = generatedAddresses.stakeFarm;
  const REWARD_CAP = ethers.BigNumber.from('15000000000000000000000');
  const REWARD_PER_DURATION = ethers.BigNumber.from('192307692300000000000');
  const REWARD_PROVIDED = 0;
  const REWARD_FEE = 2 * 1e4;

  if (
    (await UNIV2_STAKE_FARM_INSTANCE.controller()) ===
      CONTROLLER_INSTANCE.address &&
    (await CONTROLLER_INSTANCE.farms(FARM_ADDRESS)).farmStartedAtBlock.isZero()
  ) {
    console.log('Register farm with controller');

    await catchUnknownSigner(
      execute(
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
      )
    );
  } else {
    console.log('Farm already registered with controller');
  }

  //
  // 5.) If we have a Controller Upgrade, call OldController::transferAllFarms(newController)
  // !! In deployments a ControllerUpdate.json file is expected with the old Controller
  //
  if (
    configAddresses.controllerUpdate &&
    configAddresses.controllerUpdate !== generatedAddresses.controller
  ) {
    console.log('Transfer farms');

    await catchUnknownSigner(
      execute(
        CONTROLLER_UPDATE_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'transferAllFarms',
        generatedAddresses.controller
      )
    );
  } else {
    console.log('No need to transfer farms');
  }

  //
  // 6.) Call WOWSErc20.sol::grantRole(WOWSErc20.sol.MINTER_ROLE(), Crowdsale.sol)
  //     !!! ONLY DURING PRESALE !!!
  //

  if (
    !(await TOKEN_INSTANCE.hasRole(
      await TOKEN_INSTANCE.MINTER_ROLE(),
      generatedAddresses.presale
    ))
  ) {
    console.log('Grant minter role to crowdsale');

    await catchUnknownSigner(
      execute(
        TOKEN_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'grantRole',
        await TOKEN_INSTANCE.MINTER_ROLE(),
        generatedAddresses.presale
      )
    );
  } else {
    console.log('Minter role already granted to crowdsale');
  }

  //
  // 7.) Call Controller.sol::setWorker(teamwallet)
  //     Until we haven't an automatic process for maintanance
  //     the current tem wallet is the "worker" (see next)
  //
  // 8.) Call Controller.sol::refuelfarms < 1 day before duration ends
  //     Until we haven't an automatic process for maintanance
  //     this has to be done every 2 weeks
  //
};

module.exports = func;
module.exports.tags = ['TokenSetup'];
