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
const CFOLIOITEM_BRIDGE_PROXY_CONTRACT = 'CFolioItemBridgeProxy';
const SFT_HOLDER_CONTRACT = 'WOWSERC1155';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';
const REWARD_HANDLER_CONTRACT = 'RewardHandler';
const BOOSTER_CONTRACT = 'Booster';
const SFT_EVALUATOR_CONTRACT = 'SFTEvaluator';
const SFT_EVALUATOR_PROXY_CONTRACT = 'SFTEvaluatorProxy';

// keccak-256("eip1967.proxy.implementation") - 1
const UPGRADE_PROXY_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

// Path to configured addresses file
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
// Path to generated addresses file
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
 * Steps to deploy the WOWS SFT environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { catchUnknownSigner, execute } = deployments;
  const { marketingWallet } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();

  // Load contract addresses
  const generatedNetworks = JSON.parse(
    fs.readFileSync(GENERATED_ADDRESSES).toString()
  );
  const configNetworks = JSON.parse(
    fs.readFileSync(CONFIG_ADDRESSES).toString()
  );

  const generatedAddresses = generatedNetworks[chainId] || {};
  const configAddresses = (!IGNORE_ADDRESSES && configNetworks[chainId]) || {};

  // Load deployed contract instances
  const REWARD_HANDLER_INSTANCE = await hardhat_re.ethers.getContract(
    REWARD_HANDLER_CONTRACT
  );
  const SFT_HOLDER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_HOLDER_CONTRACT
  );
  const SFT_MINTER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_MINTER_CONTRACT
  );
  // Booster on Booster_PROXY address
  const boosterInstance = await hardhat_re.ethers.getContractAt(
    BOOSTER_CONTRACT,
    generatedAddresses.boosterProxy
  );
  // SFTEvaluator on SFTEvaluator proxy address
  const SFT_EVALUATOR_INSTANCE = await hardhat_re.ethers.getContractAt(
    SFT_EVALUATOR_CONTRACT,
    generatedAddresses.sftEvaluatorProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for SFT
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for SFT');

  //
  // 1.) WowsToken:: revokeRole (REWARD_ROLE, WOWSSftMinterUpdate)
  //

  if (
    configAddresses.sftMinterUpdate &&
    configAddresses.sftMinterUpdate !== generatedAddresses.sftMinter &&
    (await REWARD_HANDLER_INSTANCE.hasRole(
      await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
      configAddresses.sftMinterUpdate
    ))
  ) {
    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'revokeRole',
        await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
        configAddresses.sftMinterUpdate
      )
    );
  }

  //
  // 2.) WowsToken:: grantRole (REWARD_ROLE, WOWSSftMinter.sol)
  //

  if (
    !(await REWARD_HANDLER_INSTANCE.hasRole(
      await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
      generatedAddresses.sftMinter
    ))
  ) {
    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'grantRole',
        await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
        generatedAddresses.sftMinter
      )
    );
  }

  //
  // 3.) Call WOWSSftMinter.sol::setPrices()
  //

  if ((await SFT_MINTER_INSTANCE._pricePerLevel(0)).isZero()) {
    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setPrices',
        ['0', '1', '4', '5'],
        [
          '2500000000000000000',
          '4500000000000000000',
          '2500000000000000000',
          '4500000000000000000',
        ]
      )
    );
  }

  //
  // 4.) Call WowsSFTMinter.sol::setRewardHandler(rewardHandler)
  //

  if (
    (await SFT_MINTER_INSTANCE.rewardHandler()) !==
    generatedAddresses.rewardHandler
  ) {
    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setRewardHandler',
        generatedAddresses.rewardHandler
      )
    );
  }

  //
  // 5.) Call WowsERC1155.sol::revokeRole(MINTER_ROLE, WOWSSftMinterUpdate)
  //

  if (
    configAddresses.sftMinterUpdate &&
    configAddresses.sftMinterUpdate !== generatedAddresses.sftMinter &&
    (await SFT_HOLDER_INSTANCE.hasRole(
      await SFT_HOLDER_INSTANCE.MINTER_ROLE(),
      configAddresses.sftMinterUpdate
    ))
  ) {
    await catchUnknownSigner(
      execute(
        SFT_HOLDER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'revokeRole',
        await SFT_HOLDER_INSTANCE.MINTER_ROLE(),
        configAddresses.sftMinterUpdate
      )
    );
  }

  //
  // 6.) Call WowsERC1155.sol::grantRole(MINTER_ROLE, WOWSSftMinter.sol)
  //

  if (
    !(await SFT_HOLDER_INSTANCE.hasRole(
      await SFT_HOLDER_INSTANCE.MINTER_ROLE(),
      generatedAddresses.sftMinter
    ))
  ) {
    await catchUnknownSigner(
      execute(
        SFT_HOLDER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'grantRole',
        await SFT_HOLDER_INSTANCE.MINTER_ROLE(),
        generatedAddresses.sftMinter
      )
    );
  }

  //
  // 6.) Call WowsERC1155.sol::grantRole(TRADEFLOOR_ROLE, CFolioItemBridgeProxy)
  //

  if (
    !(await SFT_HOLDER_INSTANCE.hasRole(
      await SFT_HOLDER_INSTANCE.TRADEFLOOR_ROLE(),
      generatedAddresses.cfiBridgeProxy
    ))
  ) {
    await catchUnknownSigner(
      execute(
        SFT_HOLDER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'grantRole',
        await SFT_HOLDER_INSTANCE.TRADEFLOOR_ROLE(),
        generatedAddresses.cfiBridgeProxy
      )
    );
  }

  //
  // 7.) Check if we have to upgrade the cfiBridge implementation
  //
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.cfiBridgeProxy
    )) !== generatedAddresses.cfiBridge
  ) {
    await catchUnknownSigner(
      execute(
        CFOLIOITEM_BRIDGE_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.cfiBridge
      )
    );
  }

  const BOOSTER_CONTROLLER_ROLE = await boosterInstance.CONTROLLER_ROLE();

  //
  // 8.) Revoke CONTROLLER role in Booster for sftMinterUpdate)
  //
  if (
    configAddresses.sftMinter &&
    configAddresses.sftMinter !== generatedAddresses.sftMinter &&
    (await boosterInstance.hasRole(
      BOOSTER_CONTROLLER_ROLE,
      configAddresses.sftMinterUpdate
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
        generatedAddresses.sftMinterUpdate
      )
    );
  }

  //
  // 9.) Grant CONTROLLER_ROLE for new controller
  //
  if (
    !(await boosterInstance.hasRole(
      BOOSTER_CONTROLLER_ROLE,
      generatedAddresses.sftMinter
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
        generatedAddresses.sftMinter
      )
    );
  }

  //
  // 10.) Set sftHolder address in Booster
  //
  if ((await boosterInstance.sftHolder()) !== generatedAddresses.sftHolder) {
    await catchUnknownSigner(
      execute(
        BOOSTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.boosterProxy,
          log: true,
        },
        'setSftHolder',
        generatedAddresses.sftHolder
      )
    );
  }

  //
  // 10.) Call WowsSFTMinter.sol::setSFTEvaluator(sftEvaluatorProxy)
  //

  if (
    (await SFT_MINTER_INSTANCE.sftEvaluator()) !==
    generatedAddresses.sftEvaluatorProxy
  ) {
    console.log('Setting SFT evaluator in WOWSSftMinter');

    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setSFTEvaluator',
        generatedAddresses.sftEvaluatorProxy
      )
    );
  } else {
    console.log('SFT evaluator already set in WOWSSftMinter');
  }

  //
  // 11.) Check if we have to upgrade the sftEvaluator implementation
  //
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.sftEvaluatorProxy
    )) !== generatedAddresses.sftEvaluator
  ) {
    console.log('Upgrading SFT evaluator');

    await catchUnknownSigner(
      execute(
        SFT_EVALUATOR_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.sftEvaluator
      )
    );
  } else {
    console.log('Not upgrading SFT evaluator');
  }

  //
  // 12.) Set the SFTMinter in SFTE contract if required
  //
  try {
    if (
      (await SFT_EVALUATOR_INSTANCE.sftMinter()) !==
      generatedAddresses.sftMinter
    )
      throw new Error('Needs update');
    console.log('SFT minter already set in SFTEvaluator');
  } catch (e) {
    console.log('Set SFT minter in SFTE Proxy');

    await catchUnknownSigner(
      execute(
        SFT_EVALUATOR_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.sftEvaluatorProxy,
          log: true,
        },
        'setMinter',
        generatedAddresses.sftMinter
      )
    );
  }
};

module.exports = func;
module.exports.tags = ['SFTSetup'];
