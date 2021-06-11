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
const SFT_MINTER_UPDATE_CONTRACT = 'WOWSSftMinterUpdate';
const CFOLIO_ITEM_HANDLER_LP_CONTRACT = 'CFolioItemHandlerLP';
const CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT = 'CFolioItemHandlerLPProxy';
const CFOLIO_ITEM_HANDLER_SC_CONTRACT = 'CFolioItemHandlerSC';
const CFOLIO_ITEM_HANDLER_SC_PROXY_CONTRACT = 'CFolioItemHandlerSCProxy';
const CONTROLLER_CONTRACT = 'Controller';
const SFT_EVALUATOR_PROXY_CONTRACT = 'SFTEvaluatorProxy';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

// Deployed aliases
const CFOLIO_FARM_LP_CONTRACT = 'CFolioFarmLP';
const CFOLIO_FARM_SC_CONTRACT = 'CFolioFarmSC';

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

async function getProxyImplementation(hre, contractAddress) {
  const data = await hre.ethers.provider.getStorageAt(
    contractAddress,
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
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
  // CFOLIO_ITEM_HANDLER_LP on CFOLIO_ITEM_HANDLER_LP_PROXY address
  const CFOLIO_ITEM_HANDLER_LP_INSTANCE = await hardhat_re.ethers.getContractAt(
    CFOLIO_ITEM_HANDLER_LP_CONTRACT,
    generatedAddresses.cfolioItemHandlerLPProxy
  );
  // CFOLIO_ITEM_HANDLER_SC on CFOLIO_ITEM_HANDLER_SC_PROXY address
  const CFOLIO_ITEM_HANDLER_SC_INSTANCE = await hardhat_re.ethers.getContractAt(
    CFOLIO_ITEM_HANDLER_SC_CONTRACT,
    generatedAddresses.cfolioItemHandlerSCProxy
  );

  // Load ABIs
  const cfolioFarmAbi = JSON.parse(fs.readFileSync(CFOLIO_FARM_ABI).toString());

  // Contract instances
  const CFOLIO_FARM_LP_INSTANCE = new hardhat_re.ethers.Contract(
    generatedAddresses.cfolioFarmLP,
    cfolioFarmAbi,
    SFT_HOLDER_INSTANCE.signer.provider.getSigner(marketingWallet)
  );
  const CFOLIO_FARM_SC_INSTANCE = new hardhat_re.ethers.Contract(
    generatedAddresses.cfolioFarmSC,
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
  // 4.) TradeFloor::grantRole(TRADEFLOOR_ROLE, CFIHLP)
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
    (await CFOLIO_FARM_LP_INSTANCE.owner()).toLowerCase() !==
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
  // 6.) TradeFloor::grantRole(TRADEFLOOR_ROLE, CFIHSC)
  //

  if (
    !(await SFT_HOLDER_INSTANCE.hasRole(
      await SFT_HOLDER_INSTANCE.TRADEFLOOR_ROLE(),
      generatedAddresses.cfolioItemHandlerSCProxy
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
        generatedAddresses.cfolioItemHandlerSCProxy
      )
    );
  }

  //
  // 7.) CFolioFarm.sol::transferOwnership(CFolioItemHandlerSC)
  //

  if (
    (await CFOLIO_FARM_SC_INSTANCE.owner()).toLowerCase() !==
    generatedAddresses.cfolioItemHandlerSCProxy.toLowerCase()
  ) {
    await catchUnknownSigner(
      execute(
        CFOLIO_FARM_SC_CONTRACT,
        {
          from: deployer,
          log: true,
        },
        'transferOwnership',
        generatedAddresses.cfolioItemHandlerSCProxy
      )
    );
  }

  //
  // 8.) Controller.sol::registerFarm()
  //
  //   Parameters:
  //     * farmAddress         The CFolioFarmLP address
  //     * rewardCap           15,000 * 1e18 Wei
  //     * rewardsPerDuration  (5000 * 2 / 52) * 1e18 Wei - we have 2 week duration!
  //     * rewardProvided      0 Wei
  //     * rewardFee           2 * 1e4 (0.02 == 2%)
  //

  if (
    (await CFOLIO_FARM_LP_INSTANCE.controller()) ===
      CONTROLLER_INSTANCE.address &&
    (
      await CONTROLLER_INSTANCE.farms(generatedAddresses.cfolioFarmLP)
    ).farmStartedAtBlock.isZero()
  ) {
    const REWARD_CAP = hardhat_re.ethers.BigNumber.from(
      '15000000000000000000000'
    );
    const REWARD_PER_DURATION = hardhat_re.ethers.BigNumber.from(
      '192307692300000000000'
    );
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
        generatedAddresses.cfolioFarmLP,
        REWARD_CAP,
        REWARD_PER_DURATION,
        REWARD_PROVIDED,
        REWARD_FEE
      )
    );
  }

  //
  // 9.) Controller.sol::registerFarm()
  //
  //   Parameters:
  //     * farmAddress         The CFolioFarmSC address
  //     * rewardCap           15,000 * 1e18 Wei
  //     * rewardsPerDuration  (5000 * 2 / 52) * 1e18 Wei - we have 2 week duration!
  //     * rewardProvided      0 Wei
  //     * rewardFee           2 * 1e4 (0.02 == 2%)
  //

  if (
    (await CFOLIO_FARM_SC_INSTANCE.controller()) ===
      CONTROLLER_INSTANCE.address &&
    (
      await CONTROLLER_INSTANCE.farms(generatedAddresses.cfolioFarmSC)
    ).farmStartedAtBlock.isZero()
  ) {
    const REWARD_CAP = hardhat_re.ethers.BigNumber.from(
      '15000000000000000000000'
    );
    const REWARD_PER_DURATION = hardhat_re.ethers.BigNumber.from(
      '192307692300000000000'
    );
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
        generatedAddresses.cfolioFarmSC,
        REWARD_CAP,
        REWARD_PER_DURATION,
        REWARD_PROVIDED,
        REWARD_FEE
      )
    );
  }

  //
  // 10.) Call WOWSSftMinter.sol::setCFolioSpec(types, handlers, maxMint, prices)
  //

  const cfolioSpec = await SFT_MINTER_INSTANCE.getCFolioSpec([0, 16]);
  if (
    cfolioSpec.maxMintable[0].isZero() ||
    cfolioSpec.maxMintable[1].isZero()
  ) {
    // We initialize 8 different investment SFT cards
    const CFI_TYPES = [
      '0x00',
      '0x01',
      '0x02',
      '0x03',
      '0x10',
      '0x11',
      '0x12',
      '0x13',
    ];
    const CFI_HANDLERS = new Array(8)
      .fill(generatedAddresses.cfolioItemHandlerLPProxy, 0, 4)
      .fill(generatedAddresses.cfolioItemHandlerSCProxy, 4, 8);
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
  // 11.) Call WowsSFTMinter.sol::setSFTEvaluator(sftEvaluatorProxy)
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
  // 11.) Check if we have to upgrade the sftEvaluator implementation
  //
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.sftEvaluatorProxy
    )) !== generatedAddresses.sftEvaluator
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
  // 12.) Set the SFTMinter in CFIHLPP contract if required
  //
  if (
    (await CFOLIO_ITEM_HANDLER_LP_INSTANCE.sftMinter()) !==
    generatedAddresses.sftMinter
  ) {
    await catchUnknownSigner(
      execute(
        CFOLIO_ITEM_HANDLER_LP_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.cfolioItemHandlerLPProxy,
          log: true,
        },
        'setMinter',
        generatedAddresses.sftMinter
      )
    );
  }

  //
  // 13.) Check if we have to upgrade the cfolioItemHandlerLP implementation
  //
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.cfolioItemHandlerLPProxy
    )) !== generatedAddresses.cfolioItemHandlerLP
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

  //
  // 14.) Set the SFTMinter in CFIHSCP contract if required
  //
  if (
    (await CFOLIO_ITEM_HANDLER_SC_INSTANCE.sftMinter()) !==
    generatedAddresses.sftMinter
  ) {
    await catchUnknownSigner(
      execute(
        CFOLIO_ITEM_HANDLER_SC_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.cfolioItemHandlerSCProxy,
          log: true,
        },
        'setMinter',
        generatedAddresses.sftMinter
      )
    );
  }

  //
  // 15.) Check if we have to upgrade the cfolioItemHandlerSC implementation
  //
  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.cfolioItemHandlerSCProxy
    )) !== generatedAddresses.cfolioItemHandlerSC
  ) {
    await catchUnknownSigner(
      execute(
        CFOLIO_ITEM_HANDLER_SC_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.cfolioItemHandlerSC
      )
    );
  }
};

module.exports = func;
module.exports.tags = ['RewardFarmSetup'];
