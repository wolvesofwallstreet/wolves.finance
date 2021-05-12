/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */

const fs = require('fs');

require('hardhat-deploy');
require('hardhat-deploy-ethers');

// TODO: Fully qualified contract names
const SFT_HOLDER_CONTRACT = 'WOWSERC1155';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';

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

  // Load contract instances
  const SFT_HOLDER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_HOLDER_CONTRACT
  );
  const SFT_MINTER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_MINTER_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for Trade Floor setup
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for SFT testing');

  //
  // 1.) Call WowsERC1155.sol::grantRole(TRADEFLOOR_ROLE, TradeFloorProxy)
  //

  if (
    !(await SFT_HOLDER_INSTANCE.hasRole(
      await SFT_HOLDER_INSTANCE.TRADEFLOOR_ROLE(),
      generatedAddresses.tradeFloorProxy
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
        generatedAddresses.tradeFloorProxy
      )
    );
  }

  //
  // 2.) Call WOWSSftMinter.sol::setTradeFloor(TradeFloorProxy)
  //

  if (
    (await SFT_MINTER_INSTANCE.tradeFloor()) !==
    generatedAddresses.tradeFloorProxy
  ) {
    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setTradeFloor',
        generatedAddresses.tradeFloorProxy
      )
    );
  }
};

module.exports = func;
module.exports.tags = ['TradeFloorSetup'];
