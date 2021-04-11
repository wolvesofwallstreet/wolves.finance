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
const TRADE_FLOOR_CONTRACT = 'TradeFloor';

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

  const { execute } = deployments;
  const { marketingWallet } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();

  // Load contract addresses
  const generatedNetworks = JSON.parse(
    fs.readFileSync(GENERATED_ADDRESSES).toString()
  );
  const generatedAddresses = generatedNetworks[chainId] || {};

  // Load contract instances
  const SFT_HOLDER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_HOLDER_CONTRACT
  );
  const TRADE_FLOOR_INSTANCE = await hardhat_re.ethers.getContract(
    TRADE_FLOOR_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for Trade Floor setup
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for SFT testing');

  const TRADE_FLOOR_PROXY_ADDRESS = generatedAddresses.tradeFloorProxy;
  const STAKING_TEST_ADDRESS = generatedAddresses.stakingTest;

  //
  // 1.) Call WowsERC1155.sol::grantRole(TRADEFLOOR_ROLE, TradeFloorProxy.sol)
  //

  await execute(
    SFT_HOLDER_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'grantRole',
    await SFT_HOLDER_INSTANCE.TRADEFLOOR_ROLE(),
    TRADE_FLOOR_PROXY_ADDRESS
  );

  //
  // 2.) Call TradeFloor.sol::grantRole(MINTER_ROLE, TestStakingContract.sol)
  //

  await execute(
    TRADE_FLOOR_CONTRACT,
    {
      from: marketingWallet,
      to: TRADE_FLOOR_PROXY_ADDRESS,
      log: true,
    },
    'grantRole',
    await TRADE_FLOOR_INSTANCE.MINTER_ROLE(),
    STAKING_TEST_ADDRESS
  );
};

module.exports = func;
module.exports.tags = ['TradeFloorSetup'];
