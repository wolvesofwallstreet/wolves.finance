/*
 * Copyright (C) 2020 The Wolfpack
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
const TOKEN_CONTRACT = 'WowsToken';
const REWARD_HANDLER_CONTRACT = 'RewardHandler';
const CONTROLLER_CONTRACT = 'Controller';
const UNIV2_STAKE_FARM_CONTRACT = 'UniV2StakeFarm';
const SFT_HOLDER_CONTRACT = 'WOWSERC1155';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';
const SFT_EVALUATOR_PROXY_CONTRACT = 'SFTEvaluatorProxy';
const TRADE_FLOOR_CONTRACT = 'TradeFloor';
const CFOLIO_ITEM_HANDLER_LP_CONTRACT = 'CFolioItemHandlerLP';
const CFOLIO_ITEM_HANDLER_SC3_CONTRACT = 'CFolioItemHandlerSC3';
const CFOLIO_ITEM_HANDLER_SC4_CONTRACT = 'CFolioItemHandlerSC4';
const POLYGON_ROOT_TUNNEL_CONTRACT = 'WOWSERC1155RootTunnel';
const POLYGON_CHILD_TUNNEL_CONTRACT = 'WOWSERC1155ChildTunnel';
const MIGRATE_V2_CONTRACT = 'MigrateToV2';

// Deployed contract aliases
const BOOSTER_PROXY_CONTRACT = 'BoosterProxy';
const SFT_HOLDER_PROXY_CONTRACT = 'WOWSERC1155Proxy';
const SFT_MINTER_PROXY_CONTRACT = 'WOWSSftMinterProxy';
const TRADE_FLOOR_PROXY_CONTRACT = 'TradeFloorProxy';
const CFOLIO_FARM_LP_CONTRACT = 'CFolioFarmLP';
const CFOLIO_FARM_SC_CONTRACT = 'CFolioFarmSC';
const CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT = 'CFolioItemHandlerLPProxy';
const CFOLIO_ITEM_HANDLER_SC_PROXY_CONTRACT = 'CFolioItemHandlerSCProxy';
const POLYGON_ROOT_TUNNEL_PROXY_CONTRACT = 'PolygonRootTunnelProxy';
const POLYGON_CHILD_TUNNEL_PROXY_CONTRACT = 'PolygonChildTunnelProxy';
const MIGRATE_V2_PROXY_CONTRACT = 'MigrateToV2Proxy';

// Useful constants
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
const BIGNUMBER_MAX = ethers.BigNumber.from(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
);

// Path to generated addresses file
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// keccak-256("eip1967.proxy.implementation") - 1
const UPGRADE_PROXY_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

//////////////////////////////////////////////////////////////////////////////
// Functions
//////////////////////////////////////////////////////////////////////////////

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

async function getProxyImplementation(hre, contractAddress) {
  const data = await hre.ethers.provider.getStorageAt(
    contractAddress,
    UPGRADE_PROXY_IMPLEMENTATION_SLOT
  );
  let hex = hre.ethers.BigNumber.from(data).toHexString();
  hex = '0x' + hex.substr(2).padStart(40, '0');
  return hre.ethers.utils.getAddress(hex);
}

/**
 * Steps to deploy the WOWS environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { catchUnknownSigner, execute } = deployments;
  const { marketingWallet } = await getNamedAccounts();

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

  // Load deployed contract instances
  const rewardHandlerInstance = await hardhat_re.ethers.getContract(
    REWARD_HANDLER_CONTRACT
  );
  const sftHolderInstance = await hardhat_re.ethers.getContractAt(
    SFT_HOLDER_CONTRACT,
    generatedAddresses.sftHolderProxy
  );
  const sftMinterInstance = await hardhat_re.ethers.getContractAt(
    SFT_MINTER_CONTRACT,
    generatedAddresses.sftMinterProxy
  );
  const controllerInstance = await hardhat_re.ethers.getContract(
    CONTROLLER_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // MultiSig marketing wallet calls for token
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Marketing wallet calls');

  const REWARD_HANDLER_REWARD_ROLE = await rewardHandlerInstance.REWARD_ROLE();

  const tokenInstance = await hardhat_re.ethers.getContract(TOKEN_CONTRACT);

  if (!hardhat_re.network.tags.sidechain || hardhat_re.network.tags.test) {
    const TOKEN_MINTER_ROLE = await tokenInstance.MINTER_ROLE();

    //
    // Call WOWSErc20.sol::grantRole(WOWSErc20.sol.MINTER_ROLE(), rewardHandler)
    // This is to allow rewardhandler to call into WOWSErc20.sol to distribute
    // rewards.
    //

    if (
      !(await tokenInstance.hasRole(
        TOKEN_MINTER_ROLE,
        generatedAddresses.rewardHandler
      ))
    ) {
      console.log('Grant minter role to reward handler');

      await catchUnknownSigner(
        execute(
          TOKEN_CONTRACT,
          {
            from: marketingWallet,
            log: true,
          },
          'grantRole',
          TOKEN_MINTER_ROLE,
          generatedAddresses.rewardHandler
        )
      );
    } else {
      console.log('Minter role already granted to reward handler');
    }

    //
    // Call WOWSErc20.sol::grantRole(WOWSErc20.sol.MINTER_ROLE(), Crowdsale.sol)
    //

    if (
      !(await tokenInstance.hasRole(
        TOKEN_MINTER_ROLE,
        generatedAddresses.presale
      ))
    ) {
      console.log('Grant minter role to crowdsale');

      await catchUnknownSigner(
        execute(
          TOKEN_CONTRACT,
          {
            from: marketingWallet,
            log: true,
          },
          'grantRole',
          TOKEN_MINTER_ROLE,
          generatedAddresses.presale
        )
      );
    } else {
      console.log('Minter role already granted to crowdsale');
    }

    //
    // Revoke old rewardHandler MINTER_ROLE
    //

    if (
      configAddresses.rewardHandlerUpdate &&
      configAddresses.rewardHandlerUpdate !==
        generatedAddresses.rewardHandler &&
      (await tokenInstance.hasRole(
        TOKEN_MINTER_ROLE,
        configAddresses.rewardHandlerUpdate
      ))
    ) {
      console.log('Revoke minter role from old reward handler');

      await catchUnknownSigner(
        execute(
          TOKEN_CONTRACT,
          {
            from: marketingWallet,
            log: true,
          },
          'revokeRole',
          TOKEN_MINTER_ROLE,
          configAddresses.rewardHandlerUpdate
        )
      );
    } else {
      console.log('Minter role not set for old reward handler');
    }
  } else {
    // Sidechain

    //
    // Let rewardhandler transfer token on sidechain (instead mint)
    //

    if (
      configAddresses.rewardHandlerUpdate &&
      configAddresses.rewardHandlerUpdate !==
        generatedAddresses.rewardHandler &&
      (
        await tokenInstance.allowance(
          marketingWallet,
          configAddresses.rewardHandlerUpdate
        )
      ).gt(0)
    ) {
      await catchUnknownSigner(
        execute(
          TOKEN_CONTRACT,
          {
            from: marketingWallet,
            log: false,
          },
          'approve',
          configAddresses.rewardHandlerUpdate,
          0
        )
      );
    }

    //
    // Let rewardhandler transfer token on sidechain (instead mint)
    //

    if (
      (
        await tokenInstance.allowance(
          marketingWallet,
          generatedAddresses.rewardHandler
        )
      ).eq(0)
    ) {
      await catchUnknownSigner(
        execute(
          TOKEN_CONTRACT,
          {
            from: marketingWallet,
            log: false,
          },
          'approve',
          generatedAddresses.rewardHandler,
          BIGNUMBER_MAX
        )
      );
    }
  }

  //
  //  Terminate old rewardHandler
  //

  if (
    configAddresses.rewardHandlerUpdate &&
    configAddresses.rewardHandlerUpdate !== generatedAddresses.rewardHandler
  ) {
    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          to: configAddresses.rewardHandlerUpdate,
          log: true,
        },
        'terminate',
        generatedAddresses.rewardHandler,
        false // Should be set to true if verified
      )
    );
  }

  //
  // Call RewardHandler.sol::revokeRole(RewardHandler.REWARD_ROLE(), controllerUpdate)
  //

  if (
    configAddresses.controllerUpdate &&
    configAddresses.controllerUpdate !== generatedAddresses.controller &&
    (await rewardHandlerInstance.hasRole(
      REWARD_HANDLER_REWARD_ROLE,
      configAddresses.controllerUpdate
    ))
  ) {
    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          log: false,
        },
        'revokeRole',
        REWARD_HANDLER_REWARD_ROLE,
        configAddresses.controllerUpdate
      )
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // BOOSTER
  //////////////////////////////////////////////////////////////////////////////

  const BOOSTER_CONTRACT = hardhat_re.network.tags.sidechain
    ? 'Booster'
    : 'BoosterMain';

  // Booster on Booster_PROXY address
  const boosterInstance = await hardhat_re.ethers.getContractAt(
    BOOSTER_CONTRACT,
    generatedAddresses.boosterProxy
  );

  //
  // Check if we have to upgrade the booster implementation
  //

  if (
    (await getProxyImplementation(
      hardhat_re,
      generatedAddresses.boosterProxy
    )) !== generatedAddresses.booster
  ) {
    await catchUnknownSigner(
      execute(
        BOOSTER_PROXY_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'upgradeTo',
        generatedAddresses.booster
      )
    );
  }

  //
  // Call RewardHandler.sol::grantRole(RewardHandler.sol.REWARD_ROLE(), boosterProxy)
  // This is to allow booster to call into RewardHandler.sol to distribute
  // rewards.
  //

  if (
    !(await rewardHandlerInstance.hasRole(
      REWARD_HANDLER_REWARD_ROLE,
      generatedAddresses.boosterProxy
    ))
  ) {
    console.log('Grant reward role to booster proxy');

    await catchUnknownSigner(
      execute(
        REWARD_HANDLER_CONTRACT,
        {
          from: marketingWallet,
          log: false,
        },
        'grantRole',
        REWARD_HANDLER_REWARD_ROLE,
        generatedAddresses.boosterProxy
      )
    );
  } else {
    console.log('Reward role already granted to booster proxy');
  }

  //
  // Check if we have to set the rewardHandler
  //

  if (
    (await boosterInstance.rewardHandler()) !== generatedAddresses.rewardHandler
  ) {
    await catchUnknownSigner(
      execute(
        BOOSTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.boosterProxy,
          log: true,
        },
        'setRewardHandler',
        generatedAddresses.rewardHandler
      )
    );
  }

  const BOOSTER_CONTROLLER_ROLE = await boosterInstance.CONTROLLER_ROLE();
  const BOOSTER_MIGRATOR_ROLE = await boosterInstance.MIGRATOR_ROLE();

  //
  // Revoke CONTROLLER role in Booster for controller)
  //

  if (
    configAddresses.controllerUpdate &&
    configAddresses.controllerUpdate !== generatedAddresses.controller &&
    (await boosterInstance.hasRole(
      BOOSTER_CONTROLLER_ROLE,
      configAddresses.controllerUpdate
    ))
  ) {
    await catchUnknownSigner(
      execute(
        BOOSTER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.boosterProxy,
          log: false,
        },
        'revokeRole',
        BOOSTER_CONTROLLER_ROLE,
        configAddresses.controllerUpdate
      )
    );
  }

  //
  // Grant CONTROLLER_ROLE in Booster for new controller
  //

  if (
    !(await boosterInstance.hasRole(
      BOOSTER_CONTROLLER_ROLE,
      generatedAddresses.controller
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
        generatedAddresses.controller
      )
    );
  }

  //
  // Grant CONTROLLER_ROLE for sftMinterProxy
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
  // Set sftHolderProxy address in Booster
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

  //
  // Destruct old Booster implementation
  //

  if (
    configAddresses.boosterUpdate &&
    configAddresses.boosterUpdate !== generatedAddresses.booster
  ) {
    console.log('Destruct old Booster implementation');

    await catchUnknownSigner(
      execute(
        BOOSTER_CONTRACT,
        {
          from: marketingWallet,
          to: configAddresses.boosterUpdate,
          log: true,
        },
        'destructContract',
        generatedAddresses.boosterProxy
      )
    );
  } else {
    console.log('Booster contract not selfdestructed');
  }

  //////////////////////////////////////////////////////////////////////////////
  // CONTROLLER
  //////////////////////////////////////////////////////////////////////////////

  //
  // If we have a Controller Upgrade, call OldController::transferAllFarms(newController)
  // !! In deployments a ControllerUpdate.json file is expected with the old Controller
  //

  if (
    configAddresses.controllerUpdate &&
    configAddresses.controllerUpdate !== generatedAddresses.controller
  ) {
    console.log('Transfer farms');

    await catchUnknownSigner(
      execute(
        CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          to: configAddresses.controllerUpdate,
          log: true,
        },
        'transferAllFarms',
        generatedAddresses.controller
      )
    );
  } else {
    console.log('No need to transfer farms');
  }

  //////////////////////////////////////////////////////////////////////////////
  // STAKE_FARM
  //////////////////////////////////////////////////////////////////////////////

  if (
    (hardhat_re.network.tags.stakeFarm && !hardhat_re.network.tags.sidechain) ||
    hardhat_re.network.tags.test
  ) {
    const uniV2StakeFarmInstance = await hardhat_re.ethers.getContract(
      UNIV2_STAKE_FARM_CONTRACT
    );

    //
    //  Call Controller.sol::registerFarm()
    //    Parameters:
    //      * farmAddress         The UniV2StakeFarm address
    //      * rewardCap           15,000 * 1e18 Wei
    //      * rewardsPerDuration  (5000 * 2 / 52) * 1e18 Wei - we have 2 week duration!
    //      * rewardProvided      0 Wei
    //      * rewardFee           2 * 1e4 (0.02 == 2%)
    //      * farmEndedAtBlock    0
    //      * paused              false
    //
    // We can only register the farm into matching Contoller

    const FARM_ADDRESS = generatedAddresses.stakeFarm;
    const REWARD_CAP = ethers.BigNumber.from('15000000000000000000000');
    const REWARD_PER_DURATION = ethers.BigNumber.from('192307692300000000000');
    const REWARD_PROVIDED = 0;
    const REWARD_FEE = 2 * 1e4;
    const FARM_END = 0;

    if (
      (await uniV2StakeFarmInstance.controller()) ===
        controllerInstance.address &&
      (await controllerInstance.farms(FARM_ADDRESS)).farmStartedAtBlock.isZero()
    ) {
      console.log('Register farm with controller');

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
          REWARD_FEE,
          FARM_END,
          false
        )
      );
    } else {
      console.log('Farm already registered with controller');
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // SFT
  //////////////////////////////////////////////////////////////////////////////

  //
  // Check if we have to upgrade the sftHolder implementation
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
  // Destruct old SFTHolder implementation
  //

  try {
    if (
      configAddresses.sftHolderUpdate &&
      configAddresses.sftHolderUpdate !== generatedAddresses.sftHolder
    ) {
      console.log('Destruct old SFTHolder');

      // Old contracts don't have destructContract
      await catchUnknownSigner(
        execute(
          SFT_HOLDER_CONTRACT,
          {
            from: marketingWallet,
            to: configAddresses.sftHolderUpdate,
            log: true,
          },
          'destructContract'
        )
      );
    } else {
      console.log('Not destructing old SFTHolder');
    }
  } catch (e) {
    console.log(e);
  }

  //
  // Check if we have to upgrade the sftMinter implementation
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
  // WowsToken:: grantRole (REWARD_ROLE, WOWSSftMinter.sol)
  //

  if (
    !(await rewardHandlerInstance.hasRole(
      REWARD_HANDLER_REWARD_ROLE,
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
        REWARD_HANDLER_REWARD_ROLE,
        generatedAddresses.sftMinterProxy
      )
    );
  }

  //
  // Call WOWSSftMinter.sol::setPrices()
  //

  if (!hardhat_re.network.tags.sidechain || hardhat_re.network.tags.test) {
    if ((await sftMinterInstance.getBaseSpec([0], [0])).prices[0].isZero()) {
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
          ],
          configAddresses.sftHolderOld || ADDRESS_ZERO
        )
      );
    }
  }

  //
  // Call WowsSFTMinter.sol::setRewardHandler(rewardHandler)
  //

  if (
    (await sftMinterInstance.rewardHandler()) !==
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
  // Call WowsERC1155.sol::grantRole(MINTER_ROLE, WOWSSftMinter.sol)
  //

  const SFT_HOLDER_MINTER_ROLE = await sftHolderInstance.MINTER_ROLE();

  if (
    !(await sftHolderInstance.hasRole(
      SFT_HOLDER_MINTER_ROLE,
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
        SFT_HOLDER_MINTER_ROLE,
        generatedAddresses.sftMinterProxy
      )
    );
  }

  //
  // Destruct old WOWSSFTMinter implementation
  //

  if (
    configAddresses.sftMinterUpdate &&
    configAddresses.sftMinterUpdate !== generatedAddresses.sftMinter
  ) {
    console.log('Destruct old WOWSSftMinter');

    // Old contracts don't have destructContract
    await catchUnknownSigner(
      execute(
        SFT_MINTER_CONTRACT,
        {
          from: marketingWallet,
          to: configAddresses.sftMinterUpdate,
          log: true,
        },
        'destructContract'
      )
    );
  } else {
    console.log('Not destructing old WOWSSftMinter');
  }

  //
  // Call WowsSFTMinter.sol::setSFTEvaluator(sftEvaluatorProxy)
  //
  if (
    (await sftMinterInstance.sftEvaluator()) !==
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
  // Check if we have to upgrade the sftEvaluator implementation
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
  // Call WowsERC1155.sol::setCryptofolio
  //

  if (
    (await sftHolderInstance.cryptofolio()) !==
    generatedAddresses.sftCryptofolio
  ) {
    await catchUnknownSigner(
      execute(
        SFT_HOLDER_CONTRACT,
        {
          from: marketingWallet,
          to: generatedAddresses.sftHolderProxy,
          log: true,
        },
        'setCryptofolio',
        generatedAddresses.sftCryptofolio
      )
    );
  }

  //
  // Call WOWSSftMinter.sol::setTradeFloor(TradeFloorProxy)
  //

  if (
    (await sftMinterInstance.tradeFloor()) !==
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

  //////////////////////////////////////////////////////////////////////////////
  // TRADEFLOOR
  //////////////////////////////////////////////////////////////////////////////

  //
  // Check if we have to upgrade the tradeFloor implementation
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

  //
  // Destruct implementation
  //

  if (
    configAddresses.tradeFloorUpdate &&
    configAddresses.tradeFloorUpdate !== generatedAddresses.tradeFloor
  ) {
    console.log('Destruct old TradeFloor implementation');

    await catchUnknownSigner(
      execute(
        TRADE_FLOOR_CONTRACT,
        {
          from: marketingWallet,
          to: configAddresses.tradeFloorUpdate,
          log: true,
        },
        'destructContract',
        generatedAddresses.tradeFloorProxy
      )
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // REWARD_FARMS
  //////////////////////////////////////////////////////////////////////////////

  if (hardhat_re.network.tags.sidechain) {
    const cFolioFarmLPInstance = await hardhat_re.ethers.getContract(
      CFOLIO_FARM_LP_CONTRACT
    );
    const cFolioFarmSCInstance = await hardhat_re.ethers.getContract(
      CFOLIO_FARM_SC_CONTRACT
    );

    //
    // CFolioFarm.sol::transferOwnership(CFolioItemHandlerLP)
    //

    if (
      (await cFolioFarmLPInstance.owner()) !==
      generatedAddresses.cfolioItemHandlerLPProxy
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
    // CFolioFarm.sol::transferOwnership(CFolioItemHandlerSC)
    //

    if (
      (await cFolioFarmSCInstance.owner()) !==
      generatedAddresses.cfolioItemHandlerSCProxy
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
    //  Controller.sol::registerFarm()
    //
    //  Parameters:
    //    * farmAddress         The CFolioFarmLP address
    //    * rewardCap           15,000 * 1e18 Wei
    //    * rewardsPerDuration  (3000 * 2 / 52) * 1e18 Wei - we have 2 week duration!
    //    * rewardProvided      0 Wei
    //    * rewardFee           2 * 1e4 (0.02 == 2%)
    //    * farmEndedAtBlock    0
    //    * paused              false
    //

    if (
      (await cFolioFarmLPInstance.controller()) ===
        generatedAddresses.controller &&
      (
        await controllerInstance.farms(generatedAddresses.cfolioFarmLP)
      ).farmStartedAtBlock.isZero()
    ) {
      console.log('Registering CFolioFarmLP with controller');

      const REWARD_CAP = hardhat_re.ethers.BigNumber.from(
        '15000000000000000000000'
      );
      const REWARD_PER_DURATION = hardhat_re.ethers.BigNumber.from(
        '115384615384615400000'
      );
      const REWARD_PROVIDED = 0;
      const REWARD_FEE = 2 * 1e4;
      const FARM_END = 0;
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
          REWARD_FEE,
          FARM_END,
          false
        )
      );
    } else {
      console.log('CFolioFarmLP already registered with controller');
    }

    //
    //  Controller.sol::registerFarm()
    //
    //  Parameters:
    //    * farmAddress         The CFolioFarmSC address
    //    * rewardCap           15,000 * 1e18 Wei
    //    * rewardsPerDuration  (1500 * 2 / 52) * 1e18 Wei - we have 2 week duration!
    //    * rewardProvided      0 Wei
    //    * rewardFee           2 * 1e4 (0.02 == 2%)
    //    * farmEndedAtBlock    0
    //    * paused              false
    //

    if (
      (await cFolioFarmSCInstance.controller()) ===
        generatedAddresses.controller &&
      (
        await controllerInstance.farms(generatedAddresses.cfolioFarmSC)
      ).farmStartedAtBlock.isZero()
    ) {
      console.log('Registering CFolioFarmSC with controller');

      const REWARD_CAP = hardhat_re.ethers.BigNumber.from(
        '15000000000000000000000'
      );
      const REWARD_PER_DURATION = hardhat_re.ethers.BigNumber.from(
        '57692307692307690000'
      );
      const REWARD_PROVIDED = 0;
      const REWARD_FEE = 2 * 1e4;
      const FARM_END = 0;
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
          REWARD_FEE,
          FARM_END,
          false
        )
      );
    } else {
      console.log('CFolioFarmLP already registered with controller');
    }

    //
    // Call WOWSSftMinter.sol::setCFolioSpec(types, handlers, maxMint, prices)
    //

    const cfolioSpec = await sftMinterInstance.getCFolioSpec([0, 16]);
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
    // Check if we have to upgrade the cfolioItemHandlerLP implementation
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
    // Check if we have to upgrade the cfolioItemHandlerSC implementation
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
          hardhat_re.network.tags.curve3pool
            ? CFOLIO_ITEM_HANDLER_SC3_CONTRACT
            : CFOLIO_ITEM_HANDLER_SC4_CONTRACT,
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
  }

  //////////////////////////////////////////////////////////////////////////////
  // POLYGON
  //////////////////////////////////////////////////////////////////////////////

  if (hardhat_re.network.tags.sidechain && !hardhat_re.network.tags.test) {
    //
    // Check if we have to upgrade the polygonChildTunnel implementation
    //

    if (
      (await getProxyImplementation(
        hardhat_re,
        generatedAddresses.polygonChildTunnelProxy
      )) !== generatedAddresses.polygonChildTunnel
    ) {
      await catchUnknownSigner(
        execute(
          POLYGON_CHILD_TUNNEL_PROXY_CONTRACT,
          {
            from: marketingWallet,
            log: true,
          },
          'upgradeTo',
          generatedAddresses.polygonChildTunnel
        )
      );
    }

    //
    // Allow polygonChildTunnel to mint SFT
    //

    if (
      !(await sftHolderInstance.hasRole(
        SFT_HOLDER_MINTER_ROLE,
        generatedAddresses.polygonChildTunnelProxy
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
          SFT_HOLDER_MINTER_ROLE,
          generatedAddresses.polygonChildTunnelProxy
        )
      );
    }

    //
    // Set rewardHandler in ChildTunnel
    //

    const polygonChildTunnelInstance = await hardhat_re.ethers.getContractAt(
      POLYGON_CHILD_TUNNEL_CONTRACT,
      generatedAddresses.polygonChildTunnelProxy
    );
    if (
      (await polygonChildTunnelInstance.rewardHandler()) !==
      generatedAddresses.rewardHandler
    ) {
      await catchUnknownSigner(
        execute(
          POLYGON_CHILD_TUNNEL_CONTRACT,
          {
            from: marketingWallet,
            to: generatedAddresses.polygonChildTunnelProxy,
            log: true,
          },
          'setRewardHandler',
          generatedAddresses.rewardHandler
        )
      );
    }

    //
    // Set ChildTunnel in WOWSMinter
    //

    if (
      (await sftMinterInstance.childTunnel()) !==
      generatedAddresses.polygonChildTunnelProxy
    ) {
      await catchUnknownSigner(
        execute(
          SFT_MINTER_CONTRACT,
          {
            from: marketingWallet,
            to: generatedAddresses.sftMinterProxy,
            log: true,
          },
          'setChildTunnel',
          generatedAddresses.polygonChildTunnelProxy
        )
      );
    }

    //
    // Grand MIGRATOR_ROLE in BOOSTER
    //

    if (
      !(await boosterInstance.hasRole(
        BOOSTER_MIGRATOR_ROLE,
        generatedAddresses.polygonChildTunnelProxy
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
          BOOSTER_MIGRATOR_ROLE,
          generatedAddresses.polygonChildTunnelProxy
        )
      );
    }

    //
    // Destruct implementation
    //

    if (
      configAddresses.polygonChildTunnelUpdate &&
      configAddresses.polygonChildTunnelUpdate !==
        generatedAddresses.polygonChildTunnel
    ) {
      console.log('Destruct old PolygonChildTunnel implementation');

      await catchUnknownSigner(
        execute(
          POLYGON_CHILD_TUNNEL_CONTRACT,
          {
            from: marketingWallet,
            to: configAddresses.polygonChildTunnelUpdate,
            log: true,
          },
          'destructContract'
        )
      );
    }

    //
    // Set ChildTunnel in RewardHandler
    //

    if (
      (await rewardHandlerInstance.childTunnel()) !==
      generatedAddresses.polygonChildTunnelProxy
    ) {
      await catchUnknownSigner(
        execute(
          REWARD_HANDLER_CONTRACT,
          {
            from: marketingWallet,
            log: true,
          },
          'setChildTunnel',
          generatedAddresses.polygonChildTunnelProxy
        )
      );
    }
  } else if (hardhat_re.network.tags.rootchain) {
    //
    // Check if we have to upgrade the polygonRootTunnel implementation
    //

    if (
      (await getProxyImplementation(
        hardhat_re,
        generatedAddresses.polygonRootTunnelProxy
      )) !== generatedAddresses.polygonRootTunnel
    ) {
      await catchUnknownSigner(
        execute(
          POLYGON_ROOT_TUNNEL_PROXY_CONTRACT,
          {
            from: marketingWallet,
            log: true,
          },
          'upgradeTo',
          generatedAddresses.polygonRootTunnel
        )
      );
    }

    //
    // Check if we have to upgrade the migratorV2 implementation
    //

    if (
      (await getProxyImplementation(
        hardhat_re,
        generatedAddresses.migratorV2Proxy
      )) !== generatedAddresses.migratorV2
    ) {
      await catchUnknownSigner(
        execute(
          MIGRATE_V2_PROXY_CONTRACT,
          {
            from: marketingWallet,
            log: true,
          },
          'upgradeTo',
          generatedAddresses.migratorV2
        )
      );
    }

    //
    // Allow MigratorV2 to mint SFT
    //

    if (
      !(await sftHolderInstance.hasRole(
        SFT_HOLDER_MINTER_ROLE,
        generatedAddresses.migratorV2Proxy
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
          SFT_HOLDER_MINTER_ROLE,
          generatedAddresses.migratorV2Proxy
        )
      );
    }

    // MigratorV2 needs MIGRATOR role in old Booster
    const oldBoosterInstance = await hardhat_re.ethers.getContractAt(
      BOOSTER_CONTRACT,
      configAddresses.boosterProxyOld
    );
    if (
      !(await oldBoosterInstance.hasRole(
        BOOSTER_MIGRATOR_ROLE,
        generatedAddresses.migratorV2Proxy
      ))
    ) {
      await catchUnknownSigner(
        execute(
          BOOSTER_CONTRACT,
          {
            from: marketingWallet,
            to: configAddresses.boosterProxyOld,
            log: true,
          },
          'grantRole',
          BOOSTER_MIGRATOR_ROLE,
          generatedAddresses.migratorV2Proxy
        )
      );
    }

    //
    // Set MigratorV2 rootTunnel
    //

    const migratorV2Instance = await hardhat_re.ethers.getContractAt(
      MIGRATE_V2_CONTRACT,
      generatedAddresses.migratorV2Proxy
    );
    if (
      (await migratorV2Instance.rootTunnel()) !==
      generatedAddresses.polygonRootTunnelProxy
    ) {
      await catchUnknownSigner(
        execute(
          MIGRATE_V2_CONTRACT,
          {
            from: marketingWallet,
            to: generatedAddresses.migratorV2Proxy,
            log: true,
          },
          'setRootTunnel',
          generatedAddresses.polygonRootTunnelProxy
        )
      );
    }

    //
    // Set rewardHandler in RootTunnel
    //

    const polygonRootTunnelInstance = await hardhat_re.ethers.getContractAt(
      POLYGON_ROOT_TUNNEL_CONTRACT,
      generatedAddresses.polygonRootTunnelProxy
    );
    if (
      (await polygonRootTunnelInstance.rewardHandler()) !==
      generatedAddresses.rewardHandler
    ) {
      await catchUnknownSigner(
        execute(
          POLYGON_ROOT_TUNNEL_CONTRACT,
          {
            from: marketingWallet,
            to: generatedAddresses.polygonRootTunnelProxy,
            log: true,
          },
          'setRewardHandler',
          generatedAddresses.rewardHandler
        )
      );
    }

    //
    // Grant reward Role in RewardHandler
    //

    if (
      !(await rewardHandlerInstance.hasRole(
        REWARD_HANDLER_REWARD_ROLE,
        generatedAddresses.polygonRootTunnelProxy
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
          REWARD_HANDLER_REWARD_ROLE,
          generatedAddresses.polygonRootTunnelProxy
        )
      );
    }

    //
    // Destruct rootTunnel implementation
    //

    if (
      configAddresses.polygonRootTunnelUpdate &&
      configAddresses.polygonRootTunnelUpdate !==
        generatedAddresses.polygonRootTunnel
    ) {
      console.log('Destruct old PolygonRootTunnel implementation');

      await catchUnknownSigner(
        execute(
          POLYGON_ROOT_TUNNEL_CONTRACT,
          {
            from: marketingWallet,
            to: configAddresses.polygonRootTunnelUpdate,
            log: true,
          },
          'destructContract'
        )
      );
    }

    //
    // Destruct migratorV2 implementation
    //

    if (
      configAddresses.migratorV2Update &&
      configAddresses.migratorV2Update !== generatedAddresses.migratorV2
    ) {
      console.log('Destruct old MigratorV2 implementation');

      await catchUnknownSigner(
        execute(
          MIGRATE_V2_CONTRACT,
          {
            from: marketingWallet,
            to: configAddresses.migratorV2Update,
            log: true,
          },
          'destructContract'
        )
      );
    }
  }
}; // func

module.exports = func;
module.exports.tags = ['Setup'];
