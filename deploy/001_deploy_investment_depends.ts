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

// Contract artifacts
const CurveTokenV1Artifact = require('../contracts/bytecode/curve-contracts/CurveTokenV1.json');
const DepositYArtifact = require('../contracts/bytecode/curve-contracts/DepositY.json');
const StableSwapYArtifact = require('../contracts/bytecode/curve-contracts/StableSwapY.json');
const Erc20CrvArtifact = require('../contracts/bytecode/curve-dao-contracts/ERC20CRV.json');
const GaugeControllerArtifact = require('../contracts/bytecode/curve-dao-contracts/GaugeController.json');
const LiquidityGaugeArtifact = require('../contracts/bytecode/curve-dao-contracts/LiquidityGauge.json');
const MinterArtifact = require('../contracts/bytecode/curve-dao-contracts/Minter.json');
const VotingEscrowArtifact = require('../contracts/bytecode/curve-dao-contracts/VotingEscrow.json');

// TODO: Fully qualified contract names
const DAI_TOKEN_CONTRACT = 'DAI';
const TUSD_TOKEN_CONTRACT = 'TrueUSD';
const USDC_TOKEN_CONTRACT = 'USDC';
const USDT_TOKEN_CONTRACT = 'TetherToken';
const YEARN_CONTROLLER_CONTRACT = 'YearnController';
const YEARN_STRATEGY_CONTRACT = 'StrategyHODL';
const YEARN_VAULT_CONTRACT = 'yVault';

// Deployed contract aliases
const CRV_CONTROLLER_CONTRACT = 'CRVController';
const CRV_MINTER_CONTRACT = 'CRVMinter';
const CRV_TOKEN_CONTRACT = 'CRV';
const CRV_VOTING_CONTRACT = 'CRVVoting';
const CURVE_Y_GAUGE_CONTRACT = 'CurveYGauge';
const CURVE_Y_DEPOSIT_CONTRACT = 'CurveYDeposit';
const CURVE_Y_SWAP_CONTRACT = 'CurveYSwap';
const CURVE_Y_TOKEN_CONTRACT = 'CurveYToken';
const YDAI_STRATEGY_CONTRACT = 'YDAIStratey';
const YDAI_VAULT_CONTRACT = 'YDAI';
const YTUSD_STRATEGY_CONTRACT = 'YTUSDStratey';
const YTUSD_VAULT_CONTRACT = 'YTUSD';
const YUSDC_STRATEGY_CONTRACT = 'YUSDCStratey';
const YUSDC_VAULT_CONTRACT = 'YUSDC';
const YUSDT_STRATEGY_CONTRACT = 'YUSDTStratey';
const YUSDT_VAULT_CONTRACT = 'YUSDT';

// Path to address files
const CONFIG_ADDRESSES = `${__dirname}/../src/config/addresses.json`;
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;
const IGNORE_ADDRESSES = process.env.IGNORE_ADDRESSES !== undefined;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Steps to deploy the WOWS environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { deploy } = deployments;
  const { deployer, marketingWallet } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();
  console.log(`Hardhat: Deploying to chain ID ${chainId}`);

  // Load contract addresses
  const configNetworks = JSON.parse(
    fs.readFileSync(CONFIG_ADDRESSES).toString()
  );
  const configAddresses = (!IGNORE_ADDRESSES && configNetworks[chainId]) || {};
  let generatedNetworks = {};
  try {
    generatedNetworks = JSON.parse(
      fs.readFileSync(GENERATED_ADDRESSES).toString()
    );
  } catch (err) {
    // File hasn't been created yet, start with an empty object
  }
  const generatedAddresses = generatedNetworks[chainId] || {};

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy underlying tokens
  //
  //////////////////////////////////////////////////////////////////////////////

  // DAI
  if (configAddresses?.daiToken) {
    log_step(`Using deployed DAI contract: ${configAddresses.daiToken}`);
    generatedAddresses.daiToken = configAddresses.daiToken;
  } else {
    log_step('Deploying DAI contract');

    const daiReceipt = await deploy(DAI_TOKEN_CONTRACT, {
      from: deployer,
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.daiToken = daiReceipt.address;
  }

  const DAI_TOKEN_ADDRESS = generatedAddresses.daiToken;

  // TUSD
  if (configAddresses?.tusdToken) {
    log_step(`Using deployed TUSD contract: ${configAddresses.tusdToken}`);
    generatedAddresses.tusdToken = configAddresses.tusdToken;
  } else {
    log_step('Deploying TUSD contract');

    const tusdReceipt = await deploy(TUSD_TOKEN_CONTRACT, {
      from: deployer,
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.tusdToken = tusdReceipt.address;
  }

  const TUSD_TOKEN_ADDRESS = generatedAddresses.tusdToken;

  // USDC
  if (configAddresses?.usdcToken) {
    log_step(`Using deployed USDC contract: ${configAddresses.usdcToken}`);
    generatedAddresses.usdcToken = configAddresses.usdcToken;
  } else {
    log_step('Deploying USDC contract');

    const usdcReceipt = await deploy(USDC_TOKEN_CONTRACT, {
      from: deployer,
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.usdcToken = usdcReceipt.address;
  }

  const USDC_TOKEN_ADDRESS = generatedAddresses.usdcToken;

  // USDT
  if (configAddresses?.usdtToken) {
    log_step(`Using deployed USDT contract: ${configAddresses.usdtToken}`);
    generatedAddresses.usdtToken = configAddresses.usdtToken;
  } else {
    log_step('Deploying USDT contract');

    const usdtReceipt = await deploy(USDT_TOKEN_CONTRACT, {
      from: deployer,
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.usdtToken = usdtReceipt.address;
  }

  const USDT_TOKEN_ADDRESS = generatedAddresses.usdtToken;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Yearn controller
  //
  //////////////////////////////////////////////////////////////////////////////

  if (configAddresses?.yearnController) {
    log_step(
      `Using deployed yearn controller contract: ${configAddresses.yearnController}`
    );
    generatedAddresses.yearnController = configAddresses.yearnController;
  } else {
    log_step('Deploying yearn controller contract');

    const yearnControllerReceipt = await deploy(YEARN_CONTROLLER_CONTRACT, {
      from: deployer,
      args: [marketingWallet, marketingWallet, marketingWallet],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.yearnController = yearnControllerReceipt.address;
  }

  const YEARN_CONTROLLER_ADDRESS = generatedAddresses.yearnController;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Yearn vaults
  //
  //////////////////////////////////////////////////////////////////////////////

  // yDAI
  if (configAddresses?.ydaiVault) {
    log_step(
      `Using deployed yDAI vault contract: ${configAddresses.ydaiVault}`
    );
    generatedAddresses.ydaiVault = configAddresses.ydaiVault;
  } else {
    log_step('Deploying yDAI vault contract');

    const ydaiVaultReceipt = await deploy(YDAI_VAULT_CONTRACT, {
      from: deployer,
      contract: YEARN_VAULT_CONTRACT,
      args: [
        DAI_TOKEN_ADDRESS, // token
        YEARN_CONTROLLER_ADDRESS, // controller
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.ydaiVault = ydaiVaultReceipt.address;
  }

  const YDAI_VAULT_ADDRESS = generatedAddresses.ydaiVault;

  // yTUSD
  if (configAddresses?.ytusdVault) {
    log_step(
      `Using deployed yTUSD vault contract: ${configAddresses.ytusdVault}`
    );
    generatedAddresses.ytusdVault = configAddresses.ytusdVault;
  } else {
    log_step('Deploying yTUSD vault contract');

    const ytusdVaultReceipt = await deploy(YTUSD_VAULT_CONTRACT, {
      from: deployer,
      contract: YEARN_VAULT_CONTRACT,
      args: [
        TUSD_TOKEN_ADDRESS, // token
        YEARN_CONTROLLER_ADDRESS, // controller
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.ytusdVault = ytusdVaultReceipt.address;
  }

  const YTUSD_VAULT_ADDRESS = generatedAddresses.ytusdVault;

  // yUSDC
  if (configAddresses?.yusdcVault) {
    log_step(
      `Using deployed yUSDC vault contract: ${configAddresses.yusdcVault}`
    );
    generatedAddresses.yusdcVault = configAddresses.yusdcVault;
  } else {
    log_step('Deploying yUSDC vault contract');

    const yusdcVaultReceipt = await deploy(YUSDC_VAULT_CONTRACT, {
      from: deployer,
      contract: YEARN_VAULT_CONTRACT,
      args: [
        USDC_TOKEN_ADDRESS, // token
        YEARN_CONTROLLER_ADDRESS, // controller
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.yusdcVault = yusdcVaultReceipt.address;
  }

  const YUSDC_VAULT_ADDRESS = generatedAddresses.yusdcVault;

  // yUSDT
  if (configAddresses?.yusdtVault) {
    log_step(
      `Using deployed yUSDT vault contract: ${configAddresses.yusdtVault}`
    );
    generatedAddresses.yusdtVault = configAddresses.yusdtVault;
  } else {
    log_step('Deploying yUSDT vault contract');

    const yusdtVaultReceipt = await deploy(YUSDT_VAULT_CONTRACT, {
      from: deployer,
      contract: YEARN_VAULT_CONTRACT,
      args: [
        USDT_TOKEN_ADDRESS, // token
        YEARN_CONTROLLER_ADDRESS, // controller
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.yusdtVault = yusdtVaultReceipt.address;
  }

  const YUSDT_VAULT_ADDRESS = generatedAddresses.yusdtVault;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Yearn strategies
  //
  //////////////////////////////////////////////////////////////////////////////

  // yDAI
  if (configAddresses?.ydaiStrategy) {
    log_step(
      `Using deployed yDAI strategy contract: ${configAddresses.ydaiStrategy}`
    );
    generatedAddresses.ydaiStrategy = configAddresses.ydaiStrategy;
  } else {
    log_step('Deploying yDAI vault contract');

    const ydaiStrategyReceipt = await deploy(YDAI_STRATEGY_CONTRACT, {
      from: deployer,
      contract: YEARN_STRATEGY_CONTRACT,
      args: [
        YEARN_CONTROLLER_ADDRESS, // controller
        DAI_TOKEN_ADDRESS, // want
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.ydaiStrategy = ydaiStrategyReceipt.address;
  }

  // yTUSD
  if (configAddresses?.ytusdStrategy) {
    log_step(
      `Using deployed yTUSD vault contract: ${configAddresses.ytusdStrategy}`
    );
    generatedAddresses.ytusdStrategy = configAddresses.ytusdStrategy;
  } else {
    log_step('Deploying yTUSD vault contract');

    const ytusdStrategyReceipt = await deploy(YTUSD_STRATEGY_CONTRACT, {
      from: deployer,
      contract: YEARN_STRATEGY_CONTRACT,
      args: [
        YEARN_CONTROLLER_ADDRESS, // controller
        TUSD_TOKEN_ADDRESS, // want
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.ytusdStrategy = ytusdStrategyReceipt.address;
  }

  // yUSDC
  if (configAddresses?.yusdcStrategy) {
    log_step(
      `Using deployed yUSDC vault contract: ${configAddresses.yusdcStrategy}`
    );
    generatedAddresses.yusdcStrategy = configAddresses.yusdcStrategy;
  } else {
    log_step('Deploying yUSDC vault contract');

    const yusdcStrategyReceipt = await deploy(YUSDC_STRATEGY_CONTRACT, {
      from: deployer,
      contract: YEARN_STRATEGY_CONTRACT,
      args: [
        YEARN_CONTROLLER_ADDRESS, // controller
        USDC_TOKEN_ADDRESS, // want
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.yusdcStrategy = yusdcStrategyReceipt.address;
  }

  // yUSDT
  if (configAddresses?.yusdtStrategy) {
    log_step(
      `Using deployed yUSDT vault contract: ${configAddresses.yusdtStrategy}`
    );
    generatedAddresses.yusdtStrategy = configAddresses.yusdtStrategy;
  } else {
    log_step('Deploying yUSDT vault contract');

    const yusdtStrategyReceipt = await deploy(YUSDT_STRATEGY_CONTRACT, {
      from: deployer,
      contract: YEARN_STRATEGY_CONTRACT,
      args: [
        YEARN_CONTROLLER_ADDRESS, // controller
        USDT_TOKEN_ADDRESS, // want
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.yusdtStrategy = yusdtStrategyReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve DAO contracts
  //
  //////////////////////////////////////////////////////////////////////////////

  // Mainnet address: 0xD533a949740bb3306d119CC777fa900bA034cd52
  if (configAddresses?.crvToken) {
    log_step(`Using deployed CRV token contract: ${configAddresses.crvToken}`);
    generatedAddresses.crvToken = configAddresses.crvToken;
  } else {
    log_step('Deploying CRV token contract');

    const crvTokenReceipt = await deploy(CRV_TOKEN_CONTRACT, {
      from: deployer,
      contract: {
        abi: Erc20CrvArtifact['abi'],
        bytecode: Erc20CrvArtifact['bytecode'],
      },
      args: [
        'Curve DAO Token', // name
        'CRV', // symbol
        18, // decimals
        marketingWallet, // admin
        marketingWallet, // initial holder
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.crvToken = crvTokenReceipt.address;
  }

  const CRV_TOKEN_ADDRESS = generatedAddresses.crvToken;

  // Mainnet address: 0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2
  if (configAddresses?.crvVoting) {
    log_step(
      `Using deployed CRV voting contract: ${configAddresses.crvVoting}`
    );
    generatedAddresses.crvVoting = configAddresses.crvVoting;
  } else {
    log_step('Deploying CRV voting contract');

    const crvVotingReceipt = await deploy(CRV_VOTING_CONTRACT, {
      from: deployer,
      contract: {
        abi: VotingEscrowArtifact['abi'],
        bytecode: VotingEscrowArtifact['bytecode'],
      },
      args: [
        CRV_TOKEN_ADDRESS, // token
        'Vote-escrowed CRV', // name
        'veCRV', // symbol
        'veCRV_1.0.0', // version
        marketingWallet, // admin
        marketingWallet, // controller
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.crvVoting = crvVotingReceipt.address;
  }

  const CRV_VOTING_ADDRESS = generatedAddresses.crvVoting;

  // Mainnet address: 0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB
  if (configAddresses?.crvController) {
    log_step(
      `Using deployed CRV controller contract: ${configAddresses.crvController}`
    );
    generatedAddresses.crvController = configAddresses.crvController;
  } else {
    log_step('Deploying CRV controller contract');

    const crvControllerReceipt = await deploy(CRV_CONTROLLER_CONTRACT, {
      from: deployer,
      contract: {
        abi: GaugeControllerArtifact['abi'],
        bytecode: GaugeControllerArtifact['bytecode'],
      },
      args: [
        CRV_TOKEN_ADDRESS, // token
        CRV_VOTING_ADDRESS, // voting escrow
        marketingWallet, // admin
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.crvController = crvControllerReceipt.address;
  }

  const CRV_CONTROLLER_ADDRESS = generatedAddresses.crvController;

  // Mainnet address: 0xd061D61a4d941c39E5453435B6345Dc261C2fcE0
  if (configAddresses?.crvMinter) {
    log_step(
      `Using deployed CRV minter contract: ${configAddresses.crvMinter}`
    );
    generatedAddresses.crvMinter = configAddresses.crvMinter;
  } else {
    log_step('Deploying CRV minter contract');

    const crvMinterReceipt = await deploy(CRV_MINTER_CONTRACT, {
      from: deployer,
      contract: {
        abi: MinterArtifact['abi'],
        bytecode: MinterArtifact['bytecode'],
      },
      args: [
        CRV_TOKEN_ADDRESS, // token
        CRV_CONTROLLER_ADDRESS, // controller
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.crvMinter = crvMinterReceipt.address;
  }

  const CRV_MINTER_ADDRESS = generatedAddresses.crvMinter;

  //////////////////////////////////////////////////////////////////////////////
  //
  // Deploy Curve Y pool contracts
  //
  //////////////////////////////////////////////////////////////////////////////

  // Mainnet address: 0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8
  if (configAddresses?.curveYToken) {
    log_step(
      `Using deployed Curve token contract: ${configAddresses.curveYToken}`
    );
    generatedAddresses.curveYToken = configAddresses.curveYToken;
  } else {
    log_step('Deploying Curve token contract');

    const curveYTokenReceipt = await deploy(CURVE_Y_TOKEN_CONTRACT, {
      from: deployer,
      contract: {
        abi: CurveTokenV1Artifact['abi'],
        bytecode: CurveTokenV1Artifact['bytecode'],
      },
      args: [
        'Curve.fi yDAI/yUSDC/yUSDT/yTUSD', // name
        'yDAI+yUSDC+yUSDT+yTUSD', // symbol
        18, // decimals
        0, // supply
        marketingWallet, // minter
        marketingWallet, // initial token holder
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.curveYToken = curveYTokenReceipt.address;
  }

  const CURVE_Y_TOKEN_ADDRESS = generatedAddresses.curveYToken;

  // Mainnet address: 0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51
  if (configAddresses?.curveYSwap) {
    log_step(
      `Using deployed Curve swap contract: ${configAddresses.curveYSwap}`
    );
    generatedAddresses.curveYSwap = configAddresses.curveYSwap;
  } else {
    log_step('Deploying Curve swap contract');

    const curveYSwapReceipt = await deploy(CURVE_Y_SWAP_CONTRACT, {
      from: deployer,
      contract: {
        abi: StableSwapYArtifact['abi'],
        bytecode: StableSwapYArtifact['bytecode'],
      },
      args: [
        [
          YDAI_VAULT_ADDRESS,
          YUSDC_VAULT_ADDRESS,
          YUSDT_VAULT_ADDRESS,
          YTUSD_VAULT_ADDRESS,
        ], // coins
        [
          DAI_TOKEN_ADDRESS,
          USDC_TOKEN_ADDRESS,
          USDT_TOKEN_ADDRESS,
          TUSD_TOKEN_ADDRESS,
        ], // underlying coins
        CURVE_Y_TOKEN_ADDRESS, // pool token
        1800, // A
        4000000, // fee
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.curveYSwap = curveYSwapReceipt.address;
  }

  const CURVE_Y_SWAP_ADDRESS = generatedAddresses.curveYSwap;

  // Mainnet address: 0xbbc81d23ea2c3ec7e56d39296f0cbb648873a5d3
  if (configAddresses?.curveYDeposit) {
    log_step(
      `Using deployed Curve deposit contract: ${configAddresses.curveYDeposit}`
    );
    generatedAddresses.curveYDeposit = configAddresses.curveYDeposit;
  } else {
    log_step('Deploying Curve deposit contract');

    const curveYDepositReceipt = await deploy(CURVE_Y_DEPOSIT_CONTRACT, {
      from: deployer,
      contract: {
        abi: DepositYArtifact['abi'],
        bytecode: DepositYArtifact['bytecode'],
      },
      args: [
        [
          YDAI_VAULT_ADDRESS,
          YUSDC_VAULT_ADDRESS,
          YUSDT_VAULT_ADDRESS,
          YTUSD_VAULT_ADDRESS,
        ], // coins
        [
          DAI_TOKEN_ADDRESS,
          USDC_TOKEN_ADDRESS,
          USDT_TOKEN_ADDRESS,
          TUSD_TOKEN_ADDRESS,
        ], // underlying coins
        CURVE_Y_SWAP_ADDRESS, // curve
        CURVE_Y_TOKEN_ADDRESS, // token
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.curveYDeposit = curveYDepositReceipt.address;
  }

  // Mainnet address: 0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1
  if (configAddresses?.curveYGauge) {
    log_step(
      `Using deployed Curve gauge contract: ${configAddresses.curveYGauge}`
    );
    generatedAddresses.curveYGauge = configAddresses.curveYGauge;
  } else {
    log_step('Deploying Curve gauge contract');

    const curveYGaugeReceipt = await deploy(CURVE_Y_GAUGE_CONTRACT, {
      from: deployer,
      contract: {
        abi: LiquidityGaugeArtifact['abi'],
        bytecode: LiquidityGaugeArtifact['bytecode'],
      },
      args: [
        CURVE_Y_TOKEN_ADDRESS, // LP address
        CRV_MINTER_ADDRESS, // minter
        marketingWallet, // admin
      ],
      log: true,
      deterministicDeployment: true,
    });

    generatedAddresses.curveYGauge = curveYGaugeReceipt.address;
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Update address registry file
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
module.exports.tags = ['InvestmentDepends'];
