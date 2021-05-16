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
const SFT_MINTER_UPDATE_CONTRACT = 'WOWSSftMinterUpdate';
const CFOLIO_ITEM_HANDLER_LP_CONTRACT = 'CFolioItemHandlerLP';
const CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT = 'CFolioItemHandlerLPProxy';
const CONTROLLER_CONTRACT = 'Controller';
const SFT_EVALUATOR_PROXY_CONTRACT = 'SFTEvaluatorProxy';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

// Deployed aliases
const CFOLIO_FARM_LP_CONTRACT = 'CFolioFarmLP';

// Contract ABI paths
const CFOLIO_FARM_ABI = `${__dirname}/../src/abi/contracts/src/investment/CFolioFarm.sol/CFolioFarm.json`;

// Path to generated addresses file
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Steps to deploy the WOWS SFT environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { catchUnknownSigner, execute, rawTx } = deployments;
  const { deployer, marketingWallet } = await getNamedAccounts();

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

  // Deployment instances
  const SFT_HOLDER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_HOLDER_CONTRACT
  );
  const SFT_MINTER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_MINTER_CONTRACT
  );
  const CFOLIO_ITEM_HANDLER_LP_INSTANCE = await hardhat_re.ethers.getContractAt(
    CFOLIO_ITEM_HANDLER_LP_CONTRACT,
    CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT
  );

  // Load ABIs
  const cfolioFarmAbi = JSON.parse(fs.readFileSync(CFOLIO_FARM_ABI).toString());

  // Contract instances
  const CFOLIO_FARM_LP_INSTANCE = new ethers.Contract(
    generatedAddresses.cfolioFarmLP,
    cfolioFarmAbi,
    SFT_HOLDER_INSTANCE.signer.provider.getSigner(marketingWallet)
  );

  const CONTROLLER_INSTANCE = await hardhat_re.ethers.getContract(
    CONTROLLER_CONTRACT
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

  if (
    !(await SFT_HOLDER_INSTANCE.hasRole(
      await SFT_HOLDER_INSTANCE.TRADEFLOOR_ROLE(),
      generatedAddresses.cfolioItemHandlerLPProxy
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
        generatedAddresses.cfolioItemHandlerLPProxy
      )
    );
  }

  //
  // 5.) CFolioFarm.sol::transferOwnership(CFolioItemHandlerLP)
  //

  if (
    (await CFOLIO_FARM_LP_INSTANCE).owner().toLowerCase() !==
    generatedAddresses.cfolioItemHandlerLPProxy.toLowerCase()
  ) {
    await catchUnknownSigner(
      execute(
        CFOLIO_FARM_LP_CONTRACT,
        {
          from: deployer,
          log: true,
        },
        'transferOwnership',
        generatedAddresses.cfolioItemHandlerLPProxy
      )
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

  if (
    (await CFOLIO_FARM_LP_INSTANCE.controller()) ===
      CONTROLLER_INSTANCE.address &&
    (await CONTROLLER_INSTANCE.farms(FARM_ADDRESS)).farmStartedAtBlock.isZero()
  ) {
    const REWARD_CAP = ethers.BigNumber.from('15000000000000000000000');
    const REWARD_PER_DURATION = ethers.BigNumber.from('192307692300000000000');
    const REWARD_PROVIDED = 0;
    const REWARD_FEE = 2 * 1e4;
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
  }

  //
  // 7.) Call WOWSSftMinter.sol::setCFolioSpec(types, handlers, maxMint, prices)
  //

  if ((await SFT_MINTER_INSTANCE.getCFolioSpec([0])).maxMintable[0].isZero()) {
    // We initialize 8 different LP cards
    const CFI_TYPES = ['0', '1', '2', '3', '4', '5', '6', '7'];
    const CFI_HANDLERS = new Array(8).fill(
      generatedAddresses.cfolioItemHandlerLPProxy
    );
    const CFI_MAXMINT = new Array(8).fill('100');
    const CFI_PRICES = new Array(8).fill('500000000000000000');
    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setCFolioSpec',
        CFI_TYPES,
        CFI_HANDLERS,
        CFI_MAXMINT,
        CFI_PRICES,
        configAddresses.sftMinterUpdate || NULL_ADDRESS
      )
    );
    // Assumption: SFTMinter is newly deployed, lets upgrade
    if (
      configAddresses.sftMinterUpdate &&
      configAddresses.sftMinterUpdate !== generatedAddresses.sftMinter
    ) {
      // old contracts don't have destructContract
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
    }
  }

  //
  // 8.) Call WowsSFTMinter.sol::setSFTEvaluator(sftEvaluatorProxy)
  //

  if (
    (await SFT_MINTER_INSTANCE.sftEvaluator()) !==
    generatedAddresses.sftEvaluatorProxy
  ) {
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
  }

  //
  // 9.) Check if we have to upgrade the sftEvaluator implementation
  //
  if (
    configAddresses.sftEvaluatorUpdate &&
    configAddresses.sftEvaluatorUpdate !== generatedAddresses.sftEvaluator
  ) {
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
  }

  //
  // 10.) Set the SFTMinter in CFIHLP contract if required
  //
  if (
    (await CFOLIO_ITEM_HANDLER_LP_INSTANCE.sftMinter()) !==
    generatedAddresses.sftMinter
  ) {
    // Call through Proxy, to is not supported by execute
    await catchUnknownSigner(
      rawTx({
        from: marketingWallet,
        to: CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT,
        log: true,
        data: CFOLIO_ITEM_HANDLER_LP_INSTANCE.interface.encodeFunctionData(
          'setMinter',
          [generatedAddresses.sftMinter]
        ),
      })
    );
  }

  //
  // 11.) Check if we have to upgrade the cfolioItemHandlerLP implementation
  //
  if (
    configAddresses.cfolioItemHandlerLPUpdate &&
    configAddresses.cfolioItemHandlerLPUpdate !==
      generatedAddresses.cfolioItemHandlerLP
  ) {
    await catchUnknownSigner(
      execute(
        CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.cfolioItemHandlerLP
      )
    );
  }
};

module.exports = func;
module.exports.tags = ['RewardFarmSetup'];
