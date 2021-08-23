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
const CFOLIO_ITEM_HANDLER_LP_CONTRACT = 'CFolioItemHandlerLP';
const CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT = 'CFolioItemHandlerLPProxy';
const CFOLIO_ITEM_HANDLER_SC_CONTRACT = 'CFolioItemHandlerSC';
const CFOLIO_ITEM_HANDLER_SC_PROXY_CONTRACT = 'CFolioItemHandlerSCProxy';
const CONTROLLER_CONTRACT = 'Controller';
const SFT_EVALUATOR_CONTRACT = 'SFTEvaluator';
const SFT_EVALUATOR_PROXY_CONTRACT = 'SFTEvaluatorProxy';

// Deployed aliases
const CFOLIO_FARM_LP_CONTRACT = 'CFolioFarmLP';
const CFOLIO_FARM_SC_CONTRACT = 'CFolioFarmSC';

// keccak-256("eip1967.proxy.implementation") - 1
const UPGRADE_PROXY_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

// Contract ABI paths
const CFOLIO_FARM_ABI = `${__dirname}/../src/abi/contracts/src/investment/CFolioFarm.sol/CFolioFarm.json`;

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

  // Deployment instances
  const SFT_HOLDER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_HOLDER_CONTRACT
  );
  const SFT_MINTER_INSTANCE = await hardhat_re.ethers.getContract(
    SFT_MINTER_CONTRACT,
    generatedAddresses.sftMinterProxy
  );
  // SFTEvaluator on SFTEvaluator proxy address
  const SFT_EVALUATOR_INSTANCE = await hardhat_re.ethers.getContractAt(
    SFT_EVALUATOR_CONTRACT,
    generatedAddresses.sftEvaluatorProxy
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
  // 1.) CFolioFarm.sol::transferOwnership(CFolioItemHandlerLP)
  //

  if (
    (await CFOLIO_FARM_LP_INSTANCE.owner()).toLowerCase() !==
    generatedAddresses.cfolioItemHandlerLPProxy.toLowerCase()
  ) {
    console.log('Transfering ownership of CFolioFarmLP to CFIHLP');

    await catchUnknownSigner(
      execute(
        CFOLIO_FARM_LP_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'transferOwnership',
        generatedAddresses.cfolioItemHandlerLPProxy
      )
    );
  } else {
    console.log('CFolioFarmLP already owned by CFIHLP');
  }

  //
  // 2.) CFolioFarm.sol::transferOwnership(CFolioItemHandlerSC)
  //

  if (
    (await CFOLIO_FARM_SC_INSTANCE.owner()).toLowerCase() !==
    generatedAddresses.cfolioItemHandlerSCProxy.toLowerCase()
  ) {
    console.log('Transfering ownership of CFolioFarmSC to CFIHSC');

    await catchUnknownSigner(
      execute(
        CFOLIO_FARM_SC_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'transferOwnership',
        generatedAddresses.cfolioItemHandlerSCProxy
      )
    );
  } else {
    console.log('CFolioFarmLP already owned by CFIHLP');
  }

  //
  // 3.) Controller.sol::registerFarm()
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
    console.log('Registering CFolioFarmLP with controller');

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
  } else {
    console.log('CFolioFarmLP already registered with controller');
  }

  //
  // 4.) Controller.sol::registerFarm()
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
    console.log('Registering CFolioFarmSC with controller');

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
  } else {
    console.log('CFolioFarmLP already registered with controller');
  }

  //
  // 5.) Call WOWSSftMinter.sol::setCFolioSpec(types, handlers, maxMint, prices)
  //

  const cfolioSpec = await SFT_MINTER_INSTANCE.getCFolioSpec([0, 16]);
  if (
    cfolioSpec.maxMintable[0].isZero() ||
    cfolioSpec.maxMintable[1].isZero()
  ) {
    console.log('Setting c-folio specs for WOWSSftMinter');

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
    const CFI_MAXMINT = new Array(8).fill('1000');
    const CFI_PRICES = new Array(8).fill('500000000000000000'); // 0.5 WOWS
    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.sftMinterProxy,
          log: true,
        },
        'setCFolioSpec',
        CFI_TYPES,
        CFI_HANDLERS,
        CFI_MAXMINT,
        CFI_PRICES
      )
    );
  } else {
    console.log('C-folio specs already set for WOWSSftMinter');
  }

  //
  // 6.) Call WowsSFTMinter.sol::setSFTEvaluator(sftEvaluatorProxy)
  //

  if (
    (await SFT_MINTER_INSTANCE.sftEvaluator()) !==
    generatedAddresses.sftEvaluatorProxy
  ) {
    console.log('Setting SFT evaluator in WOWSSftMinter');

    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.sftMinterProxy,
          log: true,
        },
        'setSFTEvaluator',
        generatedAddresses.sftEvaluatorProxy
      )
    );
  } else {
    console.log('SFT evaluator already set in WOWSSftMinter');
  }

  //
  // 8.) Check if we have to upgrade the sftEvaluator implementation
  //

  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.sftEvaluatorProxy
    )) !== generatedAddresses.sftEvaluator
  ) {
    console.log('Upgrading SFT evaluator');

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
  } else {
    console.log('Not upgrading SFT evaluator');
  }

  //
  // 9.) Check if we have to upgrade the cfolioItemHandlerLP implementation
  //

  let oldImplAddress;
  if (
    (oldImplAddress = await getProxyImplementation(
      hardhat_re,
      generatedAddresses.cfolioItemHandlerLPProxy
    )) !== generatedAddresses.cfolioItemHandlerLP
  ) {
    console.log('Upgrading CFIHLP');

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

    // destruct the old implemenation contract
    await catchUnknownSigner(
      execute(
        CFOLIO_ITEM_HANDLER_LP_CONTRACT,
        {
          from: marketingWallet,
          to: oldImplAddress,
          log: true,
        },
        'selfDestruct'
      )
    );
  } else {
    console.log('Not upgrading CFIHLP');
  }

  //
  // 9.) Check if we have to upgrade the cfolioItemHandlerSC implementation
  //
  if (
    (oldImplAddress = await getProxyImplementation(
      hardhat_re,
      generatedAddresses.cfolioItemHandlerSCProxy
    )) !== generatedAddresses.cfolioItemHandlerSC
  ) {
    console.log('Upgrading CFIHSC');

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

    // destruct the old implemenation contract
    await catchUnknownSigner(
      execute(
        CFOLIO_ITEM_HANDLER_SC_CONTRACT,
        {
          from: marketingWallet,
          to: oldImplAddress,
          log: true,
        },
        'selfDestruct'
      )
    );
  } else {
    console.log('Not upgrading CFIHSC');
  }

  //
  // 14.) Set the SFTMinter in SFTE contract if required
  //
  try {
    if (
      (await SFT_EVALUATOR_INSTANCE.sftMinter()) !==
      generatedAddresses.sftMinter
    )
      throw new Error('Needs update');
    console.log('SFT minter already set in SFTEvaluator');
  } catch (e) {
    console.log('Set SFT minter in SFTE Proxy');

    await catchUnknownSigner(
      execute(
        SFT_EVALUATOR_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.sftEvaluatorProxy,
          log: true,
        },
        'setMinter',
        generatedAddresses.sftMinter
      )
    );
  }
};

module.exports = func;
module.exports.tags = ['RewardFarmsSetup'];
