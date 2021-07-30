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

// keccak-256("eip1967.proxy.implementation") - 1
const UPGRADE_PROXY_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

// Path to generated addresses file
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;

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
  const generatedAddresses = generatedNetworks[chainId] || {};

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

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for SFT
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for SFT');

  //
  // 1.) WowsToken:: grantRole (REWARD_ROLE, WOWSSftMinter.sol)
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
  // 2.) Call WOWSSftMinter.sol::setPrices()
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
  // 3.) Call WowsSFTMinter.sol::setRewardHandler(rewardHandler)
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
  // 4.) Call WowsERC1155.sol::grantRole(MINTER_ROLE, WOWSSftMinter.sol)
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
  // 5.) Call WowsERC1155.sol::grantRole(TRADEFLOOR_ROLE, CFolioItemBridgeProxy)
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
  // 6.) Check if we have to upgrade the cfiBridge implementation
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
};

module.exports = func;
module.exports.tags = ['SFTSetup'];
