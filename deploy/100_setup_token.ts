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
const REWARD_HANDLER_CONTRACT = 'RewardHandler';
const UNIV2_STAKE_FARM_CONTRACT = 'UniV2StakeFarm';
const BOOSTER_CONTRACT = 'Booster';
const BOOSTER_PROXY_CONTRACT = 'BoosterProxy';

// keccak-256("eip1967.proxy.implementation") - 1
const UPGRADE_PROXY_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

// Path to generated addresses file
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

async function getProxyImplementation(hre, contractAddress) {
  const data = await hre.ethers.provider.getStorageAt(
    contractAddress,
    UPGRADE_PROXY_IMPLEMENTATION_SLOT
  );
  return hre.ethers.utils.getAddress(
    hre.ethers.BigNumber.from(data).toHexString()
  );
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
  const controllerInstance = await hardhat_re.ethers.getContract(
    CONTROLLER_CONTRACT
  );
  const tokenInstance = await hardhat_re.ethers.getContract(TOKEN_CONTRACT);
  const rewardHandlerInstance = await hardhat_re.ethers.getContract(
    REWARD_HANDLER_CONTRACT
  );
  const uniV2StakeFarmInstance = await hardhat_re.ethers.getContract(
    UNIV2_STAKE_FARM_CONTRACT
  );
  // Booster on Booster_PROXY address
  const boosterInstance = await hardhat_re.ethers.getContractAt(
    BOOSTER_CONTRACT,
    generatedAddresses.boosterProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for token
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls');

  const REWARD_HANDLER_REWARD_ROLE = await rewardHandlerInstance.REWARD_ROLE();

  //
  // 1.) Call RewardHandler.sol::revokeRole(RewardHandler.REWARD_ROLE(), controllerUpdate)
  //

  if (
    configAddresses.controllerUpdate &&
    configAddresses.controllerUpdate !== generatedAddresses.controller &&
    (await rewardHandlerInstance.hasRole(
      REWARD_HANDLER_REWARD_ROLE,
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
        REWARD_HANDLER_REWARD_ROLE,
        configAddresses.controllerUpdate
      )
    );
  }

  //
  // 2.) Call RewardHandler.sol::grantRole(RewardHandler.sol.REWARD_ROLE(), boosterProxy)
  //     This is to allow booster proxy to call into RewardHandler.sol to distribute
  //     rewards.
  //

  if (
    !(await rewardHandlerInstance.hasRole(
      REWARD_HANDLER_REWARD_ROLE,
      generatedAddresses.boosterProxy
    ))
  ) {
    console.log('Grant reward role to booster proxy');

    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          log: false,
        },
        'grantRole',
        REWARD_HANDLER_REWARD_ROLE,
        generatedAddresses.boosterProxy
      )
    );
  } else {
    console.log('Reward role already granted to booster proxy');
  }

  const TOKEN_MINTER_ROLE = await tokenInstance.MINTER_ROLE();

  //
  // 3.) Call WOWSErc20.sol::grantRole(WOWSErc20.sol.MINTER_ROLE(), controller)
  //     This is to allow controller to call into WOWSErc20.sol to distribute
  //     rewards.
  //
  if (
    !(await tokenInstance.hasRole(
      TOKEN_MINTER_ROLE,
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
        TOKEN_MINTER_ROLE,
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
    (await uniV2StakeFarmInstance.controller()) ===
      controllerInstance.address &&
    (await controllerInstance.farms(FARM_ADDRESS)).farmStartedAtBlock.isZero()
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
        CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          to: configAddresses.controllerUpdate,
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
    !(await tokenInstance.hasRole(
      TOKEN_MINTER_ROLE,
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
        TOKEN_MINTER_ROLE,
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

  //
  // 9.) Check if we have to upgrade the tradeFloor implementation
  //
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.boosterProxy
    )) !== generatedAddresses.booster
  ) {
    await catchUnknownSigner(
      execute(
        BOOSTER_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.booster
      )
    );
  }

  //
  // 10.) Check if we have to set the rewardHandler
  //
  if (
    (await boosterInstance.rewardHandler()) !== generatedAddresses.rewardHandler
  ) {
    await catchUnknownSigner(
      execute(
        BOOSTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.boosterProxy,
          log: true,
        },
        'setRewardHandler',
        generatedAddresses.rewardHandler
      )
    );
  }

  const BOOSTER_CONTROLLER_ROLE = await boosterInstance.CONTROLLER_ROLE();

  //
  // 11.) Revoke CONTROLLER role in Booster for controller)
  //
  if (
    configAddresses.controllerUpdate &&
    configAddresses.controllerUpdate !== generatedAddresses.controller &&
    (await boosterInstance.hasRole(
      BOOSTER_CONTROLLER_ROLE,
      configAddresses.controllerUpdate
    ))
  ) {
    await catchUnknownSigner(
      execute(
        BOOSTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.boosterProxy,
          log: false,
        },
        'revokeRole',
        BOOSTER_CONTROLLER_ROLE,
        configAddresses.controllerUpdate
      )
    );
  }

  //
  // 12.) Grant CONTROLLER_ROLE for new controller
  //
  if (
    !(await boosterInstance.hasRole(
      BOOSTER_CONTROLLER_ROLE,
      generatedAddresses.controller
    ))
  ) {
    await catchUnknownSigner(
      execute(
        BOOSTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.boosterProxy,
          log: true,
        },
        'grantRole',
        BOOSTER_CONTROLLER_ROLE,
        generatedAddresses.controller
      )
    );
  }

  //
  // 13.) Terminate old rewardHandler
  //
  if (
    configAddresses.rewardHandlerUpdate &&
    configAddresses.rewardHandlerUpdate !== generatedAddresses.rewardHandler
  ) {
    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          to: configAddresses.rewardHandlerUpdate,
          log: true,
        },
        'terminate',
        generatedAddresses.rewardHandler,
        false // Should be set to true if verified
      )
    );
  }

  //
  // 14.) Revoke old rewardHandler MINTER_ROLE
  //
  if (
    configAddresses.rewardHandlerUpdate &&
    configAddresses.rewardHandlerUpdate !== generatedAddresses.rewardHandler &&
    (await tokenInstance.hasRole(
      TOKEN_MINTER_ROLE,
      configAddresses.rewardHandlerUpdate
    ))
  ) {
    console.log('Revoke minter role from old reward handler');

    await catchUnknownSigner(
      execute(
        TOKEN_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'revokeRole',
        TOKEN_MINTER_ROLE,
        configAddresses.rewardHandlerUpdate
      )
    );
  } else {
    console.log('Minter role not set for old reward handler');
  }
};

module.exports = func;
module.exports.tags = ['TokenSetup'];
