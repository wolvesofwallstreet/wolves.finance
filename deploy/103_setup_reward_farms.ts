/*
 * Copyright (C) 2021 The Wolfpack
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
const SFT_HOLDER_CONTRACT = 'WOWSERC1155';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';
const CONTROLLER_CONTRACT = 'Controller';

// Deployed aliases
const CFOLIO_FARM_LP_CONTRACT = 'CFolioFarmLP';

// Contract ABI paths
const CFOLIO_FARM_ABI = `${__dirname}/../src/abi/contracts/src/investment/CFolioFarm.sol/CFolioFarm.json`;

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
  const { deployer, marketingWallet } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();

  // Load contract addresses
  const generatedNetworks = JSON.parse(
    fs.readFileSync(GENERATED_ADDRESSES).toString()
  );
  const generatedAddresses = generatedNetworks[chainId] || {};

  // Deployment instances
  const SFT_HOLDER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_HOLDER_CONTRACT
  );

  // Load ABIs
  const cfolioFarmAbi = JSON.parse(fs.readFileSync(CFOLIO_FARM_ABI).toString());

  // Contract instances
  const CFOLIO_FARM_LP_INSTANCE = new ethers.Contract(
    generatedAddresses.cfolioFarmLP,
    cfolioFarmAbi,
    SFT_HOLDER_INSTANCE.signer.provider.getSigner(marketingWallet)
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for reward farm setup
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls for reward farms');

  //
  // 4.) TradeFloor::grantRole(MINTER_ROLE, TradeClientFloorLP)
  //

  await execute(
    SFT_HOLDER_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'grantRole',
    await SFT_HOLDER_INSTANCE.TRADEFLOOR_ROLE(),
    generatedAddresses.cfolioItemHandlerLP
  );

  //
  // 5.) CFolioFarm.sol::transferOwnership(TradeClientFloorLP)
  //

  const cfolioLpOwner = await CFOLIO_FARM_LP_INSTANCE.owner();
  if (
    cfolioLpOwner.toLowerCase() !==
    generatedAddresses.tradeFloorClientLP.toLowerCase()
  ) {
    await execute(
      CFOLIO_FARM_LP_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'transferOwnership',
      generatedAddresses.tradeFloorClientLP
    );
  }

  //
  // 6.) Controller.sol::registerFarm()
  //
  //   Parameters:
  //     * farmAddress         The CFolioFarmLP address
  //     * rewardCap           15,000 * 1e18 Wei
  //     * rewardsPerDuration  (5000 * 2 / 52) * 1e18 Wei - we have 2 week duration!
  //     * rewardProvided      0 Wei
  //     * rewardFee           2 * 1e4 (0.02 == 2%)
  //

  const FARM_ADDRESS = generatedAddresses.cfolioFarmLP;
  const REWARD_CAP = ethers.BigNumber.from('15000000000000000000000');
  const REWARD_PER_DURATION = ethers.BigNumber.from('192307692300000000000');
  const REWARD_PROVIDED = 0;
  const REWARD_FEE = 2 * 1e4;

  await execute(
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
  );

  //
  // 7.) Call WOWSSftMinter.sol::setCFolioSpec(types, handlers, maxMint, prices)
  //

  // We initialize 8 different LP cards
  const CFI_TYPES = ['0', '1', '2', '3', '4', '5', '6', '7'];
  const CFI_HANDLERS = new Array(8).fill(generatedAddresses.cfolioFarmLP);
  const CFI_MAXMINT = new Array(8).fill('100');
  const CFI_PRICES = new Array(8).fill('500000000000000000');

  await execute(
    SFT_MINTER_CONTRACT,
    {
      from: marketingWallet,
      log: true,
    },
    'setCFolioSpec',
    CFI_TYPES,
    CFI_HANDLERS,
    CFI_MAXMINT,
    CFI_PRICES
  );
};

module.exports = func;
module.exports.tags = ['RewardFarmSetup'];
