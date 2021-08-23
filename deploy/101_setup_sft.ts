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
const SFT_HOLDER_PROXY_CONTRACT = 'WOWSERC1155Proxy';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';
const SFT_MINTER_PROXY_CONTRACT = 'WOWSSftMinterProxy';
const SFT_MINTER_UPDATE_CONTRACT = 'WOWSSftMinterUpdate';
const REWARD_HANDLER_CONTRACT = 'RewardHandler';
const BOOSTER_CONTRACT = 'Booster';

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
  const SFT_HOLDER_INSTANCE = await hardhat_re.ethers.getContractAt(
    SFT_HOLDER_CONTRACT,
    generatedAddresses.sftHolderProxy
  );
  const SFT_MINTER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_MINTER_CONTRACT,
    generatedAddresses.sftMinterProxy
  );
  // Booster on Booster_PROXY address
  const boosterInstance = await hardhat_re.ethers.getContractAt(
    BOOSTER_CONTRACT,
    generatedAddresses.boosterProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for SFT
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for SFT');

  //
  // 1.) Check if we have to upgrade the sftHolder implementation
  //
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.sftHolderProxy
    )) !== generatedAddresses.sftHolder
  ) {
    await catchUnknownSigner(
      execute(
        SFT_HOLDER_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.sftHolder
      )
    );
  }

  //
  // 2.) Check if we have to upgrade the sftMinter implementation
  //
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.sftMinterProxy
    )) !== generatedAddresses.sftMinter
  ) {
    await catchUnknownSigner(
      execute(
        SFT_MINTER_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.sftMinter
      )
    );
  }

  //
  // 3.) WowsToken:: grantRole (REWARD_ROLE, WOWSSftMinter.sol)
  //

  if (
    !(await REWARD_HANDLER_INSTANCE.hasRole(
      await REWARD_HANDLER_INSTANCE.REWARD_ROLE(),
      generatedAddresses.sftMinterProxy
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
        generatedAddresses.sftMinterProxy
      )
    );
  }

  //
  // 4.) Call WOWSSftMinter.sol::setPrices()
  //

  if ((await SFT_MINTER_INSTANCE.getBaseSpec([0], [0])).prices[0].isZero()) {
    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.sftMinterProxy,
          log: true,
        },
        'setBaseSpec',
        ['0', '1', '4', '5'],
        ['40', '40', '40', '40'],
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
  // 5.) Call WowsSFTMinter.sol::setRewardHandler(rewardHandler)
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
          to: generatedAddresses.sftMinterProxy,
          log: true,
        },
        'setRewardHandler',
        generatedAddresses.rewardHandler
      )
    );
  }

  //
  // 6.) Call WowsERC1155.sol::grantRole(MINTER_ROLE, WOWSSftMinter.sol)
  //

  if (
    !(await SFT_HOLDER_INSTANCE.hasRole(
      await SFT_HOLDER_INSTANCE.MINTER_ROLE(),
      generatedAddresses.sftMinterProxy
    ))
  ) {
    await catchUnknownSigner(
      execute(
        SFT_HOLDER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.sftHolderProxy,
          log: true,
        },
        'grantRole',
        await SFT_HOLDER_INSTANCE.MINTER_ROLE(),
        generatedAddresses.sftMinterProxy
      )
    );
  }

  //
  // 7.) Destruct old WOWSSFTMinter implementation
  //

  if (
    configAddresses.sftMinterUpdate &&
    configAddresses.sftMinterUpdate !== generatedAddresses.sftMinter
  ) {
    console.log('Destruct old WOWSSftMinter');

    // Old contracts don't have destructContract
    await catchUnknownSigner(
      execute(
        SFT_MINTER_UPDATE_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'destructContract'
      )
    );
  } else {
    console.log('Not destructing old WOWSSftMinter');
  }

  const BOOSTER_CONTROLLER_ROLE = await boosterInstance.CONTROLLER_ROLE();

  //
  // 8.) Grant CONTROLLER_ROLE for sftMinterProxy
  //

  if (
    !(await boosterInstance.hasRole(
      BOOSTER_CONTROLLER_ROLE,
      generatedAddresses.sftMinterProxy
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
        generatedAddresses.sftMinterProxy
      )
    );
  }

  //
  // 10.) Set sftHolderProxy address in Booster
  //
  if (
    (await boosterInstance.sftHolder()) !== generatedAddresses.sftHolderProxy
  ) {
    await catchUnknownSigner(
      execute(
        BOOSTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.boosterProxy,
          log: true,
        },
        'setSftHolder',
        generatedAddresses.sftHolderProxy
      )
    );
  }
};

module.exports = func;
module.exports.tags = ['SFTSetup'];
