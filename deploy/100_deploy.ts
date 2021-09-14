/*
 * Copyright (C) 2020-2021 The Wolfpack
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
const ADDRESS_REGISTRY_CONTRACT = 'AddressRegistry';
const CONTROLLER_CONTRACT = 'Controller';
const TOKEN_CONTRACT = 'WowsToken';
const REWARD_HANDLER_CONTRACT = 'RewardHandler';
const UNIV2_STAKE_FARM_CONTRACT = 'UniV2StakeFarm';
const PRESALE_CONTRACT = 'Crowdsale';
const UPGRADE_PROXY_CONTRACT = 'UpgradeProxy';
const SFT_HOLDER_CONTRACT = 'WOWSERC1155';
const SFT_CRYPTOFOLIO = 'WOWSCryptofolio';
const SFT_MINTER_CONTRACT = 'WOWSSftMinter';
const SFT_EVALUATOR_CONTRACT = 'SFTEvaluator';
const SFT_EVALUATOR_PROXY_CONTRACT = 'SFTEvaluatorProxy';
const TRADE_FLOOR_CONTRACT = 'TradeFloor';
const CFOLIO_FARM_CONTRACT = 'CFolioFarm';
const CFOLIO_ITEM_HANDLER_LP_CONTRACT = 'CFolioItemHandlerLP';
const CFOLIO_ITEM_HANDLER_SC_CONTRACT = 'CFolioItemHandlerSC';
const POLYGON_ROOT_TUNNEL_CONTRACT = 'WOWSERC1155RootTunnel';
const POLYGON_CHILD_TUNNEL_CONTRACT = 'WOWSERC1155ChildTunnel';
const MIGRATE_V2_CONTRACT = 'MigrateV2';

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

// Path to address files
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// Addressbook constants
const ADDRESS_BOOK_TEAM_WALLET_KEY =
  ethers.utils.formatBytes32String('TEAM_WALLET');
const ADDRESS_BOOK_MARKETING_WALLET_KEY =
  ethers.utils.formatBytes32String('MARKETING_WALLET');
const ADDRESS_BOOK_ADMIN_ACCOUNT_KEY =
  ethers.utils.formatBytes32String('ADMIN_ACCOUNT');
const ADDRESS_BOOK_DEPLOYER_KEY = ethers.utils.formatBytes32String('DEPLOYER');

const ADDRESS_BOOK_UNISWAP_V2_ROUTER02_KEY = ethers.utils.formatBytes32String(
  'UNISWAP_V2_ROUTER02'
);
const ADDRESS_BOOK_CURVE_Y_TOKEN_KEY =
  ethers.utils.formatBytes32String('CURVE_Y_TOKEN');
const ADDRESS_BOOK_CURVE_Y_DEPOSIT_KEY =
  ethers.utils.formatBytes32String('CURVE_Y_DEPOSIT');

const ADDRESS_BOOK_WOWS_TOKEN_KEY =
  ethers.utils.formatBytes32String('WOWS_TOKEN');
const ADDRESS_BOOK_REWARD_HANDLER_KEY =
  ethers.utils.formatBytes32String('REWARD_HANDLER');
const ADDRESS_BOOK_STAKE_FARM_KEY = ethers.utils.formatBytes32String(
  'WETH_WOWS_STAKE_FARM'
);
const ADDRESS_BOOK_UNIV2_PAIR_KEY =
  ethers.utils.formatBytes32String('UNISWAP_V2_PAIR');
const ADDRESS_BOOK_WOWS_BOOSTER_PROXY_KEY =
  ethers.utils.formatBytes32String('WOWS_BOOSTER_PROXY');
const ADDRESS_BOOK_SFT_EVALUATOR_PROXY_KEY = ethers.utils.formatBytes32String(
  'SFT_EVALUATOR_PROXY'
);
const ADDRESS_BOOK_SFT_HOLDER_PROXY_KEY =
  ethers.utils.formatBytes32String('SFT_HOLDER_PROXY');
const ADDRESS_BOOK_SFT_MINTER_PROXY_KEY =
  ethers.utils.formatBytes32String('SFT_MINTER_PROXY');
const ADDRESS_BOOK_TRADE_FLOOR_PROXY_KEY =
  ethers.utils.formatBytes32String('TRADE_FLOOR_PROXY');
const BOIS_REWARDS_KEY = ethers.utils.formatBytes32String('BOIS_REWARDS');
const WOLVES_REWARDS_KEY = ethers.utils.formatBytes32String('WOLVES_REWARDS');

// Contract ABIs
const BOOSTER_ABI = `${__dirname}/../src/abi/contracts/src/booster/Booster.sol/Booster.json`;
const SFT_HOLDER_ABI = `${__dirname}/../src/abi/contracts/src/token/WOWSERC1155.sol/WOWSERC1155.json`;
const SFT_MINTER_ABI = `${__dirname}/../src/abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json`;
const TRADE_FLOOR_ABI = `${__dirname}/../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json`;
const CFOLIO_ITEM_HANDLER_SC_ABI = `${__dirname}/../src/abi/contracts/src/cfolio/CFolioItemHandlerSC.sol/CFolioItemHandlerSC.json`;
const POLYGON_ROOT_TUNNEL_ABI = `${__dirname}/../src/abi/contracts/src/polygon/WOWSERC1155RootTunnel.sol/WOWSERC1155RootTunnel.json`;
const POLYGON_CHILD_TUNNEL_ABI = `${__dirname}/../src/abi/contracts/src/polygon/WOWSERC1155ChildTunnel.sol/WOWSERC1155ChildTunnel.json`;
// Useful constants
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

//////////////////////////////////////////////////////////////////////////////
// Functions
//////////////////////////////////////////////////////////////////////////////

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Utility function to register contract addresses in the address registry
 *
 * @param deployer The account used to deploy contracts
 * @param execute The contract execution function from the hardhat-deploy plugin
 * @param registryInstance The instance of the deployed address registry contract
 * @param key The name of the contract
 * @param value The address of the contract
 */
async function setRegistryKey(deployer, execute, registryInstance, key, value) {
  // Check existing value
  try {
    const existingValue = await registryInstance.getRegistryEntry(key);
    if (existingValue === value) {
      console.log(`Registry value for ${key} already set`);
      return;
    }
  } catch (err) {
    console.log(`No registry value for ${key}`);
  }

  console.log(`Setting registry value for ${key}`);

  // Assign new value
  await execute(
    ADDRESS_REGISTRY_CONTRACT,
    {
      from: deployer,
      log: true,
    },
    'setRegistryEntry',
    key,
    value
  );
}

/**
 * Steps to deploy the WOWS environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { deploy, execute } = deployments;
  const { deployer, marketingWallet, teamWallet } = await getNamedAccounts();

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

  console.log('Deployer: ', deployer);
  console.log('MarketingWallet: ', marketingWallet);
  console.log('TeamWallet: ', teamWallet);

  // Load ABIs
  const boosterAbi = JSON.parse(fs.readFileSync(BOOSTER_ABI));
  const sftHolderAbi = JSON.parse(fs.readFileSync(SFT_HOLDER_ABI));
  const sftMinterAbi = JSON.parse(fs.readFileSync(SFT_MINTER_ABI));

  //////////////////////////////////////////////////////////////////////////////
  //
  // Address registry
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.addressRegistry) {
    log_step(
      `Using deployed address registry: ${configAddresses.addressRegistry}`
    );
    generatedAddresses.addressRegistry = configAddresses.addressRegistry;
  } else {
    log_step('Deploying address registry');

    const addressRegistryReceipt = await deploy(ADDRESS_REGISTRY_CONTRACT, {
      from: deployer,
      args: [deployer],
      log: true,
      deterministicDeployment: '0x0000000000000000000000000000000000000020',
    });

    generatedAddresses.addressRegistry = addressRegistryReceipt.address;
  }

  const ADDRESS_REGISTRY_ADDRESS = generatedAddresses.addressRegistry;
  const ADDRESS_REGISTRY_INSTANCE = await hardhat_re.ethers.getContract(
    ADDRESS_REGISTRY_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Register addresses for wallets and Uniswap router
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting addresses in address registry');

  // Transfer predefined dependency addresses
  if (!generatedAddresses.uniV2Router)
    generatedAddresses.uniV2Router = configAddresses.uniV2Router;
  if (!generatedAddresses.curveYToken)
    generatedAddresses.curveYToken = configAddresses.curveYToken;
  if (!generatedAddresses.curveYDeposit)
    generatedAddresses.curveYDeposit = configAddresses.curveYDeposit;

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_DEPLOYER_KEY,
    deployer
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_MARKETING_WALLET_KEY,
    marketingWallet
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_TEAM_WALLET_KEY,
    teamWallet
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_ADMIN_ACCOUNT_KEY,
    marketingWallet
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_UNISWAP_V2_ROUTER02_KEY,
    generatedAddresses.uniV2Router
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_CURVE_Y_TOKEN_KEY,
    generatedAddresses.curveYToken
  );
  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_CURVE_Y_DEPOSIT_KEY,
    generatedAddresses.curveYDeposit
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy token
  //
  //////////////////////////////////////////////////////////////////////////////

  if (hardhat_re.network.tags.sidechain && !hardhat_re.network.tags.test) {
    // Bridge ERC20 contracts should be already deployed
    if (!configAddresses.token || !configAddresses.uniV2Pair)
      throw new Error('ERC20 contracts not set');

    generatedAddresses.token = configAddresses.token;
    generatedAddresses.uniV2Pair = configAddresses.uniV2Pair;
  } else {
    // Deploy the real token
    if (configAddresses.token) {
      log_step(`Using deployed token: ${configAddresses.token}`);
      generatedAddresses.token = configAddresses.token;
    } else {
      log_step('Deploying token');

      const tokenReceipt = await deploy(TOKEN_CONTRACT, {
        from: deployer,
        args: [ADDRESS_REGISTRY_ADDRESS],
        log: true,
        deterministicDeployment: true,
      });

      generatedAddresses.token = tokenReceipt.address;
    }

    const TOKEN_INSTANCE = await hardhat_re.ethers.getContract(TOKEN_CONTRACT);
    generatedAddresses.uniV2Pair = await TOKEN_INSTANCE.uniV2Pair();
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Register address for token
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting WOWS token in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_WOWS_TOKEN_KEY,
    generatedAddresses.token
  );

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_UNIV2_PAIR_KEY,
    generatedAddresses.uniV2Pair
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy RewardHandler
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.rewardHandler) {
    log_step(`Using deployed RewardHandler: ${configAddresses.rewardHandler}`);
    generatedAddresses.rewardHandler = configAddresses.rewardHandler;
  } else {
    log_step('Deploying RewardHandler');

    const rewardHandlerReceipt = await deploy(REWARD_HANDLER_CONTRACT, {
      from: deployer,
      log: true,
      args: [ADDRESS_REGISTRY_ADDRESS],
      deterministicDeployment: true,
    });

    generatedAddresses.rewardHandler = rewardHandlerReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Register address for RewardHandler
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting RewardHander in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_REWARD_HANDLER_KEY,
    generatedAddresses.rewardHandler
  );

  //////////////////////////////////////////////////////////////////////////////
  // Booster
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy booster
  //
  //////////////////////////////////////////////////////////////////////////////

  const BOOSTER_CONTRACT = hardhat_re.network.tags.sidechain
    ? 'Booster'
    : 'BoosterMain';

  if (configAddresses.booster) {
    log_step(`Using deployed booster: ${configAddresses.booster}`);
    generatedAddresses.booster = configAddresses.booster;
  } else {
    log_step('Deploying booster');

    const boosterReceipt = await deploy(BOOSTER_CONTRACT, {
      from: deployer,
      log: true,
      args: [marketingWallet],
      deterministicDeployment: true,
    });

    generatedAddresses.booster = boosterReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Booster proxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.boosterProxy) {
    log_step(`Using Booster proxy: ${configAddresses.boosterProxy}`);
    generatedAddresses.boosterProxy = configAddresses.boosterProxy;
  } else {
    log_step('Deploying Booster proxy');

    const boosterInterface = new ethers.utils.Interface(boosterAbi);
    const proxyCallData = boosterInterface.encodeFunctionData('initialize', [
      marketingWallet,
      generatedAddresses.rewardHandler,
    ]);

    const boosterProxyReceipt = await deploy(BOOSTER_PROXY_CONTRACT, {
      contract: UPGRADE_PROXY_CONTRACT,
      from: deployer,
      args: [
        generatedAddresses.addressRegistry,
        generatedAddresses.booster,
        proxyCallData,
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.boosterProxy = boosterProxyReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Register address for Booster Proxy
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Setting booster proxy in address registry');

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_WOWS_BOOSTER_PROXY_KEY,
    generatedAddresses.boosterProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy controller
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.controller) {
    log_step(`Using deployed controller: ${configAddresses.controller}`);
    generatedAddresses.controller = configAddresses.controller;
  } else {
    log_step('Deploying controller');

    // Previous controller: 0 address / only for later updates
    const PREVIOUS_CONTROLLER =
      configAddresses.controllerUpdate || ADDRESS_ZERO;

    const controllerReceipt = await deploy(CONTROLLER_CONTRACT, {
      from: deployer,
      args: [generatedAddresses.addressRegistry, PREVIOUS_CONTROLLER],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.controller = controllerReceipt.address;
  }

  if (
    (hardhat_re.network.tags.stakeFarm && !hardhat_re.network.tags.sidechain) ||
    hardhat_re.network.tags.test
  ) {
    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy UniV2StakeFarm.sol
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.stakeFarm) {
      log_step(
        `Using deployed Uni-V2 stake farm: ${configAddresses.stakeFarm}`
      );
      generatedAddresses.stakeFarm = configAddresses.stakeFarm;
    } else {
      log_step('Deploying stake farm');

      const STAKE_FARM_NAME = 'WETH/WOWS LP Farm';
      const REWARD_TOKEN = generatedAddresses.token;
      // Address of UniV2 WETH/USDT pool, can be 0 for test
      const ROUTE = ADDRESS_ZERO;

      const univ2StakeFarmReceipt = await deploy(UNIV2_STAKE_FARM_CONTRACT, {
        from: deployer,
        args: [
          deployer,
          STAKE_FARM_NAME,
          generatedAddresses.uniV2Pair,
          REWARD_TOKEN,
          generatedAddresses.controller,
          ROUTE,
        ],
        log: true,
        deterministicDeployment: true,
      });

      generatedAddresses.stakeFarm = univ2StakeFarmReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Register address for stake farm
    //
    //////////////////////////////////////////////////////////////////////////////

    log_step('Setting stake farm in address registry');

    await setRegistryKey(
      deployer,
      execute,
      ADDRESS_REGISTRY_INSTANCE,
      ADDRESS_BOOK_STAKE_FARM_KEY,
      generatedAddresses.stakeFarm
    );
  }

  if (!hardhat_re.network.tags.sidechain || hardhat_re.network.tags.test) {
    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy presale
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.presale) {
      log_step(`Using deployed RewardHandler: ${configAddresses.presale}`);
      generatedAddresses.presale = configAddresses.presale;
    } else {
      log_step('Deploying presale');

      const RATE = 80; // Token units per Wei
      const CAP = ethers.BigNumber.from('75000000000000000000'); // 75 * 1e18 Wei
      const INVEST_MIN = ethers.BigNumber.from('200000000000000000'); // 2 * 1e17 Wei (0.2 ETH)
      const WALLET_CAP = ethers.BigNumber.from('3000000000000000000'); // 3 * 1e18 Wei (3 ETH)
      const LP_ETH = 3750; // Token units
      const LP_TOKEN = 240_000; // Token units

      const presaleReceipt = await deploy(PRESALE_CONTRACT, {
        from: deployer,
        args: [
          ADDRESS_REGISTRY_ADDRESS,
          RATE,
          generatedAddresses.token,
          CAP,
          INVEST_MIN,
          WALLET_CAP,
          LP_ETH,
          LP_TOKEN,
        ],
        log: true,
        deterministicDeployment: true,
      });

      generatedAddresses.presale = presaleReceipt.address;
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // SFT
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT holder contract
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftHolder) {
    log_step(`Using SFT holder contract: ${configAddresses.sftHolder}`);
    generatedAddresses.sftHolder = configAddresses.sftHolder;
  } else {
    log_step('Deploying SFT holder contract');

    const sftHolderReceipt = await deploy(SFT_HOLDER_CONTRACT, {
      from: deployer,
      args: [marketingWallet],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sftHolder = sftHolderReceipt.address;
  }

  const SFT_HOLDER_ADDRESS = generatedAddresses.sftHolder;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFTHolder proxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftHolderProxy) {
    log_step(`Using SFTHolder proxy: ${configAddresses.sftHolderProxy}`);
    generatedAddresses.sftHolderProxy = configAddresses.sftHolderProxy;
  } else {
    log_step('Deploying SFTHolder proxy');

    const sftHolderInterface = new ethers.utils.Interface(sftHolderAbi);
    const proxyCallData = sftHolderInterface.encodeFunctionData('initialize', [
      marketingWallet,
    ]);

    const sftHolderProxyReceipt = await deploy(SFT_HOLDER_PROXY_CONTRACT, {
      contract: UPGRADE_PROXY_CONTRACT,
      from: deployer,
      args: [ADDRESS_REGISTRY_ADDRESS, SFT_HOLDER_ADDRESS, proxyCallData],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sftHolderProxy = sftHolderProxyReceipt.address;
  }

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_SFT_HOLDER_PROXY_KEY,
    generatedAddresses.sftHolderProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT cryptofolio
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftCryptofolio) {
    log_step(`Using SFT cryptofolio: ${configAddresses.sftCryptofolio}`);
    generatedAddresses.sftCryptofolio = configAddresses.sftCryptofolio;
  } else {
    log_step('Deploying SFT cryptofolio');

    const sftCryptofolioReceipt = await deploy(SFT_CRYPTOFOLIO, {
      from: deployer,
      args: [generatedAddresses.sftHolderProxy],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sftCryptofolio = sftCryptofolioReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT minter
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftMinter) {
    log_step(`Using SFT minter: ${configAddresses.sftMinter}`);
    generatedAddresses.sftMinter = configAddresses.sftMinter;
  } else {
    log_step('Deploying SFT minter');

    const sftMinterReceipt = await deploy(SFT_MINTER_CONTRACT, {
      from: deployer,
      args: [ADDRESS_REGISTRY_ADDRESS],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sftMinter = sftMinterReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFTMinter proxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftMinterProxy) {
    log_step(`Using SFTMinter proxy: ${configAddresses.sftMinterProxy}`);
    generatedAddresses.sftMinterProxy = configAddresses.sftMinterProxy;
  } else {
    log_step('Deploying SFTMinter proxy');

    const sftMinterInterface = new ethers.utils.Interface(sftMinterAbi);
    const proxyCallData = sftMinterInterface.encodeFunctionData('initialize', [
      ADDRESS_REGISTRY_ADDRESS,
    ]);

    const sftMinterProxyReceipt = await deploy(SFT_MINTER_PROXY_CONTRACT, {
      contract: UPGRADE_PROXY_CONTRACT,
      from: deployer,
      args: [
        ADDRESS_REGISTRY_ADDRESS,
        generatedAddresses.sftMinter,
        proxyCallData,
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.sftMinterProxy = sftMinterProxyReceipt.address;
  }

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_SFT_MINTER_PROXY_KEY,
    generatedAddresses.sftMinterProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT evaluator
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftEvaluator) {
    log_step(`Using SFT evaluator: ${configAddresses.sftEvaluator}`);
    generatedAddresses.sftEvaluator = configAddresses.sftEvaluator;
  } else {
    log_step('Deploying SFT evaluator');

    const sftEvaluatorReceipt = await deploy(SFT_EVALUATOR_CONTRACT, {
      from: deployer,
      args: [ADDRESS_REGISTRY_ADDRESS],
      log: true,
      deterministicDeployment: false,
    });

    generatedAddresses.sftEvaluator = sftEvaluatorReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy SFT evaluator proxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.sftEvaluatorProxy) {
    log_step(`Using SFT evaluator proxy: ${configAddresses.sftEvaluatorProxy}`);
    generatedAddresses.sftEvaluatorProxy = configAddresses.sftEvaluatorProxy;
  } else {
    log_step('Deploying SFT evaluator proxy');

    const sftEvaluatorProxyReceipt = await deploy(
      SFT_EVALUATOR_PROXY_CONTRACT,
      {
        contract: UPGRADE_PROXY_CONTRACT,
        from: deployer,
        args: [ADDRESS_REGISTRY_ADDRESS, generatedAddresses.sftEvaluator, []],
        log: true,
        deterministicDeployment: true,
      }
    );

    generatedAddresses.sftEvaluatorProxy = sftEvaluatorProxyReceipt.address;
  }

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_SFT_EVALUATOR_PROXY_KEY,
    generatedAddresses.sftEvaluatorProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  // TRADEFLOOR
  //////////////////////////////////////////////////////////////////////////////

  // TODO: Trade floor will use {id} mechamism eventually
  const METADATA_URI = `https://meta.wows.finance/wolves_assets/tradefloor/${hardhat_re.network.name}/metadata/`;
  const CONTRACT_METADATA_URI = `https://meta.wows.finance/wolves_assets/tradefloor/${hardhat_re.network.name}/metadata/contract.json`;

  // Load ABIs
  const tradeFloorAbi = JSON.parse(fs.readFileSync(TRADE_FLOOR_ABI));

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Trade Floor
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.tradeFloor) {
    log_step(`Using Trade Floor: ${configAddresses.tradeFloor}`);
    generatedAddresses.tradeFloor = configAddresses.tradeFloor;
  } else {
    log_step('Deploying Trade Floor');

    const tradeFloorReceipt = await deploy(TRADE_FLOOR_CONTRACT, {
      from: deployer,
      args: [
        ADDRESS_REGISTRY_ADDRESS,
        configAddresses.openSeaProxyRegistry ||
          '0x0000000000000000000000000000000000000000',
        configAddresses.sftHolderOld || ADDRESS_ZERO,
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.tradeFloor = tradeFloorReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Trade Floor proxy
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses.tradeFloorProxy) {
    log_step(`Using Trade Floor proxy: ${configAddresses.tradeFloorProxy}`);
    generatedAddresses.tradeFloorProxy = configAddresses.tradeFloorProxy;
  } else {
    log_step('Deploying Trade Floor proxy');

    const tradeFloorInterface = new ethers.utils.Interface(tradeFloorAbi);
    const proxyCallData = tradeFloorInterface.encodeFunctionData('initialize', [
      ADDRESS_REGISTRY_ADDRESS,
      METADATA_URI,
      CONTRACT_METADATA_URI,
    ]);

    const tradeFloorProxyReceipt = await deploy(TRADE_FLOOR_PROXY_CONTRACT, {
      contract: UPGRADE_PROXY_CONTRACT,
      from: deployer,
      args: [
        ADDRESS_REGISTRY_ADDRESS,
        generatedAddresses.tradeFloor,
        proxyCallData,
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.tradeFloorProxy = tradeFloorProxyReceipt.address;
  }

  await setRegistryKey(
    deployer,
    execute,
    ADDRESS_REGISTRY_INSTANCE,
    ADDRESS_BOOK_TRADE_FLOOR_PROXY_KEY,
    generatedAddresses.tradeFloorProxy
  );

  //////////////////////////////////////////////////////////////////////////////
  // FARMS
  //////////////////////////////////////////////////////////////////////////////

  if (hardhat_re.network.tags.sidechain) {
    // Load ABIs
    const cfolioItemHandlerSCAbi = JSON.parse(
      fs.readFileSync(CFOLIO_ITEM_HANDLER_SC_ABI)
    );

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy CFolioFarm.sol (for LP)
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.cfolioFarmLP) {
      log_step(`Using CFolioFarmLP: ${configAddresses.cfolioFarmLP}`);
      generatedAddresses.cfolioFarmLP = configAddresses.cfolioFarmLP;
    } else {
      log_step('Deploying CFolioFarmLP');

      const CFOLIO_FARM_LP_NAME = 'CFolio Farm LP';

      const cfolioFarmLPReceipt = await deploy(CFOLIO_FARM_LP_CONTRACT, {
        contract: CFOLIO_FARM_CONTRACT,
        from: deployer,
        args: [
          marketingWallet,
          CFOLIO_FARM_LP_NAME,
          generatedAddresses.controller,
        ],
        log: true,
        deterministicDeployment: true,
      });

      generatedAddresses.cfolioFarmLP = cfolioFarmLPReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Register addresses for CFolioFarmLP
    //
    //////////////////////////////////////////////////////////////////////////////

    log_step('Setting CFolioFarmLP address in address registry');

    await setRegistryKey(
      deployer,
      execute,
      ADDRESS_REGISTRY_INSTANCE,
      WOLVES_REWARDS_KEY,
      generatedAddresses.cfolioFarmLP
    );

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy CFolioItemHandlerLP
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.cfolioItemHandlerLP) {
      log_step(
        `Using CFolioItemHandlerLP contract: ${configAddresses.cfolioItemHandlerLP}`
      );
      generatedAddresses.cfolioItemHandlerLP =
        configAddresses.cfolioItemHandlerLP;
    } else {
      log_step('Deploying CFolioItemHandlerLP contract');

      const cfolioItemHandlerLPContractReceipt = await deploy(
        CFOLIO_ITEM_HANDLER_LP_CONTRACT,
        {
          from: deployer,
          args: [ADDRESS_REGISTRY_ADDRESS],
          log: true,
          deterministicDeployment: true,
        }
      );

      generatedAddresses.cfolioItemHandlerLP =
        cfolioItemHandlerLPContractReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy CFolioItemHandlerLPProxy
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.cfolioItemHandlerLPProxy) {
      log_step(
        `Using CFolioItemHandlerLP proxy: ${configAddresses.cfolioItemHandlerLPProxy}`
      );
      generatedAddresses.cfolioItemHandlerLPProxy =
        configAddresses.cfolioItemHandlerLPProxy;
    } else {
      log_step('Deploying CFolioItemHandlerLP proxy');

      const cfolioItemHandlerLPProxyReceipt = await deploy(
        CFOLIO_ITEM_HANDLER_LP_PROXY_CONTRACT,
        {
          contract: UPGRADE_PROXY_CONTRACT,
          from: deployer,
          args: [
            ADDRESS_REGISTRY_ADDRESS,
            generatedAddresses.cfolioItemHandlerLP,
            [],
          ],
          log: true,
          deterministicDeployment: true,
        }
      );

      generatedAddresses.cfolioItemHandlerLPProxy =
        cfolioItemHandlerLPProxyReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy CFolioFarm.sol (for SC)
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.cfolioFarmSC) {
      log_step(`Using CFolioFarmSC: ${configAddresses.cfolioFarmSC}`);
      generatedAddresses.cfolioFarmSC = configAddresses.cfolioFarmSC;
    } else {
      log_step('Deploying CFolioFarmSC');

      const CFOLIO_FARM_SC_NAME = 'CFolio Farm SC';

      const cfolioFarmSCReceipt = await deploy(CFOLIO_FARM_SC_CONTRACT, {
        contract: CFOLIO_FARM_CONTRACT,
        from: deployer,
        args: [
          marketingWallet,
          CFOLIO_FARM_SC_NAME,
          generatedAddresses.controller,
        ],
        log: true,
        deterministicDeployment: true,
      });

      generatedAddresses.cfolioFarmSC = cfolioFarmSCReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Register addresses for CFolioFarmSC
    //
    //////////////////////////////////////////////////////////////////////////////

    log_step('Setting CFolioFarmSC address in address registry');

    await setRegistryKey(
      deployer,
      execute,
      ADDRESS_REGISTRY_INSTANCE,
      BOIS_REWARDS_KEY,
      generatedAddresses.cfolioFarmSC
    );

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy CFolioItemHandlerSC
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.cfolioItemHandlerSC) {
      log_step(
        `Using CFolioItemHandlerSC contract: ${configAddresses.cfolioItemHandlerSC}`
      );
      generatedAddresses.cfolioItemHandlerSC =
        configAddresses.cfolioItemHandlerSC;
    } else {
      log_step('Deploying CFolioItemHandlerSC contract');

      const cfolioItemHandlerSCContractReceipt = await deploy(
        CFOLIO_ITEM_HANDLER_SC_CONTRACT,
        {
          from: deployer,
          args: [ADDRESS_REGISTRY_ADDRESS],
          log: true,
          deterministicDeployment: true,
        }
      );

      generatedAddresses.cfolioItemHandlerSC =
        cfolioItemHandlerSCContractReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy CFolioItemHandlerSCProxy
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.cfolioItemHandlerSCProxy) {
      log_step(
        `Using CFolioItemHandlerSC proxy: ${configAddresses.cfolioItemHandlerSCProxy}`
      );
      generatedAddresses.cfolioItemHandlerSCProxy =
        configAddresses.cfolioItemHandlerSCProxy;
    } else {
      log_step('Deploying CFolioItemHandlerSC proxy');

      const cfolioItemHandlerSCInterface = new ethers.utils.Interface(
        cfolioItemHandlerSCAbi
      );
      const proxyCallData = cfolioItemHandlerSCInterface.encodeFunctionData(
        'initialize',
        []
      );

      const cfolioItemHandlerSCProxyReceipt = await deploy(
        CFOLIO_ITEM_HANDLER_SC_PROXY_CONTRACT,
        {
          contract: UPGRADE_PROXY_CONTRACT,
          from: deployer,
          args: [
            ADDRESS_REGISTRY_ADDRESS,
            generatedAddresses.cfolioItemHandlerSC,
            proxyCallData,
          ],
          log: true,
          deterministicDeployment: true,
        }
      );

      generatedAddresses.cfolioItemHandlerSCProxy =
        cfolioItemHandlerSCProxyReceipt.address;
    }
  }

  if (hardhat_re.network.tags.sidechain && !hardhat_re.network.tags.test) {
    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy PolygonChildTunnel
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.polygonChildTunnel) {
      log_step(
        `Using PolygonChildTunnel contract: ${configAddresses.polygonChildTunnel}`
      );
      generatedAddresses.polygonChildTunnel =
        configAddresses.polygonChildTunnel;
    } else {
      log_step('Deploying PolygonChildTunnel contract');

      const polygonChildTunnelContractReceipt = await deploy(
        POLYGON_CHILD_TUNNEL_CONTRACT,
        {
          from: deployer,
          args: [
            configAddresses.fxChild,
            generatedAddresses.sftHolderProxy,
            generatedAddresses.sftMinterProxy,
            generatedAddresses.boosterProxy,
            marketingWallet,
          ],
          log: true,
          deterministicDeployment: true,
        }
      );

      generatedAddresses.polygonChildTunnel =
        polygonChildTunnelContractReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy PolygonChildTunnelProxy
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.polygonChildTunnelProxy) {
      log_step(
        `Using PolygonChildTunnel proxy: ${configAddresses.polygonChildTunnelProxy}`
      );
      generatedAddresses.polygonChildTunnelProxy =
        configAddresses.polygonChildTunnelProxy;
    } else {
      log_step('Deploying PolygonChildTunnel proxy');

      const polygonChildTunnelAbi = JSON.parse(
        fs.readFileSync(POLYGON_CHILD_TUNNEL_ABI)
      );
      const polygonChildTunnelInterface = new ethers.utils.Interface(
        polygonChildTunnelAbi
      );
      const proxyCallData = polygonChildTunnelInterface.encodeFunctionData(
        'initialize',
        [generatedAddresses.rewardHandler]
      );

      const polygonChildTunnelProxyReceipt = await deploy(
        POLYGON_CHILD_TUNNEL_PROXY_CONTRACT,
        {
          contract: UPGRADE_PROXY_CONTRACT,
          from: deployer,
          args: [
            ADDRESS_REGISTRY_ADDRESS,
            generatedAddresses.polygonChildTunnel,
            proxyCallData,
          ],
          log: true,
          deterministicDeployment: true,
        }
      );

      generatedAddresses.polygonChildTunnelProxy =
        polygonChildTunnelProxyReceipt.address;
    }
  } else if (hardhat_re.network.tags.rootchain) {
    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy Migrator
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.migratorV2) {
      log_step(`Using MigratorV2 contract: ${configAddresses.migratorV2}`);
      generatedAddresses.migratorV2 = configAddresses.migratorV2;
    } else {
      log_step('Deploying MigratorV2 contract');

      const migratorV2ContractReceipt = await deploy(MIGRATE_V2_CONTRACT, {
        from: deployer,
        args: [configAddresses.addressRegistryOld, ADDRESS_REGISTRY_ADDRESS],
        log: true,
        deterministicDeployment: true,
      });

      generatedAddresses.migratorV2 = migratorV2ContractReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy PolygonRootTunnel
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.polygonRootTunnel) {
      log_step(
        `Using PolygonRootTunnel contract: ${configAddresses.polygonRootTunnel}`
      );
      generatedAddresses.polygonRootTunnel = configAddresses.polygonRootTunnel;
    } else {
      log_step('Deploying PolygonRootTunnel contract');

      const polygonRootTunnelContractReceipt = await deploy(
        POLYGON_ROOT_TUNNEL_CONTRACT,
        {
          from: deployer,
          args: [
            configAddresses.p_checkpointManager,
            configAddresses.p_fxRoot,
            generatedAddresses.sftHolderProxy,
            configAddresses.p_sftHolderProxy,
            generatedAddresses.migratorV2,
            marketingWallet,
          ],
          log: true,
          deterministicDeployment: true,
        }
      );

      generatedAddresses.polygonRootTunnel =
        polygonRootTunnelContractReceipt.address;
    }

    //////////////////////////////////////////////////////////////////////////////
    //
    // Deploy PolygonRootTunnelProxy
    //
    //////////////////////////////////////////////////////////////////////////////

    if (configAddresses.polygonRootTunnelProxy) {
      log_step(
        `Using PolygonRootTunnel proxy: ${configAddresses.polygonRootTunnelProxy}`
      );
      generatedAddresses.polygonRootTunnelProxy =
        configAddresses.polygonRootTunnelProxy;
    } else {
      log_step('Deploying PolygonRootTunnel proxy');

      const polygonRootTunnelAbi = JSON.parse(
        fs.readFileSync(POLYGON_ROOT_TUNNEL_ABI)
      );
      const polygonRootTunnelInterface = new ethers.utils.Interface(
        polygonRootTunnelAbi
      );
      const proxyCallData = polygonRootTunnelInterface.encodeFunctionData(
        'initialize',
        [generatedAddresses.rewardHandler]
      );

      const polygonRootTunnelProxyReceipt = await deploy(
        POLYGON_ROOT_TUNNEL_PROXY_CONTRACT,
        {
          contract: UPGRADE_PROXY_CONTRACT,
          from: deployer,
          args: [
            ADDRESS_REGISTRY_ADDRESS,
            generatedAddresses.polygonRootTunnel,
            proxyCallData,
          ],
          log: true,
          deterministicDeployment: true,
        }
      );

      generatedAddresses.polygonRootTunnelProxy =
        polygonRootTunnelProxyReceipt.address;
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Generate address registry file
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step(`Writing ${GENERATED_ADDRESSES}`);

  generatedNetworks[chainId] = generatedAddresses;

  fs.writeFileSync(
    GENERATED_ADDRESSES,
    JSON.stringify(generatedNetworks, null, '  ')
  );
};

module.exports = func;
module.exports.tags = ['Deploy'];
