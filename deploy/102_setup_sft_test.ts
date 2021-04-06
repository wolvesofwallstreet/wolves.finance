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
const SFT_CONTRACT = 'WOWSERC1155';
const TRADE_FLOOR_CONTRACT = 'TradeFloor';

// Path to generated address registry file
const ADDRESS_REGISTRY = `${__dirname}/../src/config/generated-addresses.json`;

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

  // Load contract addresses
  const addressRegistry = JSON.parse(
    fs.readFileSync(ADDRESS_REGISTRY).toString()
  );

  const addresses = addressRegistry.hardhat;

  const SFT_INSTANCE = await hardhat_re.ethers.getContract(SFT_CONTRACT);
  const TRADE_FLOOR_INSTANCE = await hardhat_re.ethers.getContract(
    TRADE_FLOOR_CONTRACT
  );
  const TRADE_FLOOR_PROXY_ADDRESS = addresses.tradefloorProxy;

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for SFT
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for SFT testing');

  //
  // 1.) Call WowsERC1155.sol::grantRole(TRADEFLOOR_ROLE, TradeFloor.sol)
  //

  await execute(
    SFT_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'grantRole',
    await SFT_INSTANCE.TRADEFLOOR_ROLE(),
    addresses.tradeFloor
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
    addresses.stakingTest
  );
};

module.exports = func;
module.exports.tags = ['SFTTestSetup'];
module.exports.dependencies = ['SFTTest'];
