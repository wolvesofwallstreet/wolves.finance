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
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';
const TRADE_FLOOR_PROXY_CONTRACT = 'TradeFloorProxy';

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

  const SFT_MINTER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_MINTER_CONTRACT,
    generatedAddresses.sftMinterProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for Trade Floor setup
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for SFT testing');

  //
  // 1.) Call WOWSSftMinter.sol::setTradeFloor(TradeFloorProxy)
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
          to: generatedAddresses.sftMinterProxy,
          log: true,
        },
        'setTradeFloor',
        generatedAddresses.tradeFloorProxy
      )
    );
  }

  //
  // 2.) Check if we have to upgrade the tradeFloor implementation
  //
  
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.tradeFloorProxy
    )) !== generatedAddresses.tradeFloor
  ) {
    await catchUnknownSigner(
      execute(
        TRADE_FLOOR_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.tradeFloor
      )
    );
  }
};

module.exports = func;
module.exports.tags = ['TradeFloorSetup'];
