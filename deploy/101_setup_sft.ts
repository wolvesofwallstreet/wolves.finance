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
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';
const REWARD_HANDLER_CONTRACT = 'RewardHandler';

// Path to generated addresses file
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
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
  //     For test: ["0", "1", "2", "3"], ["500000000000000000", "1000000000000000000", "2000000000000000000", "4000000000000000000"]
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
          '1000000000000000000',
          '3000000000000000000',
          '1000000000000000000',
          '3000000000000000000',
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
};

module.exports = func;
module.exports.tags = ['SFTSetup'];
