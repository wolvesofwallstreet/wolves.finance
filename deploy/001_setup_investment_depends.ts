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
const DAI_TOKEN_CONTRACT = 'DAI';
const TUSD_TOKEN_CONTRACT = 'TrueUSD';
const USDC_TOKEN_CONTRACT = 'USDC';
const USDT_TOKEN_CONTRACT = 'TetherToken';
const YEARN_CONTROLLER_CONTRACT = 'YearnController';

// Deployed contract aliases
const CURVE_Y_DEPOSIT_CONTRACT = 'CurveYDeposit';
const CURVE_Y_TOKEN_CONTRACT = 'CurveYToken';

// Y pool deployment parameters
const INITIAL_Y_POOL_DAI = ethers.BigNumber.from('1000000000000000000000'); // 1000 DAI
const INITIAL_Y_POOL_TUSD = ethers.BigNumber.from('1000000000000000000000'); // 1000 TUSD
const INITIAL_Y_POOL_USDC = ethers.BigNumber.from('1000000000'); // 1000 USDC
const INITIAL_Y_POOL_USDT = ethers.BigNumber.from('1000000000'); // 1000 USDT
const INITIAL_Y_POOL_TOKENS = 4000; // Sum of Y pool stablecoins above

// Path to generated addresses file
const GENERATED_ADDRESSES = `${__dirname}/../src/config/generated-addresses.json`;

// Helper function
function log_step(step_string) {
  console.log(`\n==> ${step_string}\n`);
}

/**
 * Steps to deploy the WOWS environment
 */
const func = async function (hardhat_re) {
  const { deployments, getNamedAccounts } = hardhat_re;

  const { catchUnknownSigner, execute } = deployments;
  const { deployer, marketingWallet } = await getNamedAccounts();

  // Get chain ID
  const chainId = await hardhat_re.getChainId();

  // Load contract addresses
  const generatedNetworks = JSON.parse(
    fs.readFileSync(GENERATED_ADDRESSES).toString()
  );
  const generatedAddresses = generatedNetworks[chainId] || {};

  // Load deployed contract instances
  const DAI_TOKEN_ADDRESS = generatedAddresses.daiToken;
  const TUSD_TOKEN_ADDRESS = generatedAddresses.tusdToken;
  const USDC_TOKEN_ADDRESS = generatedAddresses.usdcToken;
  const USDT_TOKEN_ADDRESS = generatedAddresses.usdtToken;

  const YDAI_STRATEGY_ADDRESS = generatedAddresses.ydaiStrategy;
  const YTUSD_STRATEGY_ADDRESS = generatedAddresses.ytusdStrategy;
  const YUSDC_STRATEGY_ADDRESS = generatedAddresses.yusdcStrategy;
  const YUSDT_STRATEGY_ADDRESS = generatedAddresses.yusdtStrategy;

  const CURVE_Y_SWAP_ADDRESS = generatedAddresses.curveYSwap;
  const CURVE_Y_DEPOSIT_ADDRESS = generatedAddresses.curveYDeposit;

  // Contract instances
  const CURVE_Y_TOKEN_INSTANCE = await hardhat_re.ethers.getContract(
    CURVE_Y_TOKEN_CONTRACT
  );
  const YEARN_CONTROLLER_INSTANCE = await hardhat_re.ethers.getContract(
    YEARN_CONTROLLER_CONTRACT
  );

  //////////////////////////////////////////////////////////////////////////////
  //
  // Setup calls for Yearn vaults
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Yearn vault calls');

  //
  // Set the DAI strategy
  //

  const daiStrategy = await YEARN_CONTROLLER_INSTANCE.strategies(
    DAI_TOKEN_ADDRESS
  );
  if (daiStrategy !== YDAI_STRATEGY_ADDRESS) {
    await catchUnknownSigner(
      execute(
        YEARN_CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'approveStrategy',
        DAI_TOKEN_ADDRESS,
        YDAI_STRATEGY_ADDRESS
      )
    );

    await catchUnknownSigner(
      execute(
        YEARN_CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setStrategy',
        DAI_TOKEN_ADDRESS,
        YDAI_STRATEGY_ADDRESS
      )
    );
  } else {
    console.log(`DAI strategy set to ${daiStrategy}`);
  }

  //
  // Set the TUSD strategy
  //

  const tusdStrategy = await YEARN_CONTROLLER_INSTANCE.strategies(
    TUSD_TOKEN_ADDRESS
  );
  if (tusdStrategy !== YTUSD_STRATEGY_ADDRESS) {
    await catchUnknownSigner(
      execute(
        YEARN_CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'approveStrategy',
        TUSD_TOKEN_ADDRESS,
        YTUSD_STRATEGY_ADDRESS
      )
    );

    await catchUnknownSigner(
      execute(
        YEARN_CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setStrategy',
        TUSD_TOKEN_ADDRESS,
        YTUSD_STRATEGY_ADDRESS
      )
    );
  } else {
    console.log(`TUSD strategy set to ${tusdStrategy}`);
  }

  //
  // Set the USDC strategy
  //

  const usdcStrategy = await YEARN_CONTROLLER_INSTANCE.strategies(
    USDC_TOKEN_ADDRESS
  );
  if (usdcStrategy !== YUSDC_STRATEGY_ADDRESS) {
    await catchUnknownSigner(
      execute(
        YEARN_CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'approveStrategy',
        USDC_TOKEN_ADDRESS,
        YUSDC_STRATEGY_ADDRESS
      )
    );

    await catchUnknownSigner(
      execute(
        YEARN_CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setStrategy',
        USDC_TOKEN_ADDRESS,
        YUSDC_STRATEGY_ADDRESS
      )
    );
  } else {
    console.log(`USDC strategy set to ${usdcStrategy}`);
  }

  //
  // Set the USDT strategy
  //

  const usdtStrategy = await YEARN_CONTROLLER_INSTANCE.strategies(
    USDT_TOKEN_ADDRESS
  );
  if (usdtStrategy !== YUSDT_STRATEGY_ADDRESS) {
    await catchUnknownSigner(
      execute(
        YEARN_CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'approveStrategy',
        USDT_TOKEN_ADDRESS,
        YUSDT_STRATEGY_ADDRESS
      )
    );

    await catchUnknownSigner(
      execute(
        YEARN_CONTROLLER_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'setStrategy',
        USDT_TOKEN_ADDRESS,
        YUSDT_STRATEGY_ADDRESS
      )
    );
  } else {
    console.log(`USDT strategy set to ${usdtStrategy}`);
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Setup calls for Curve
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Curve setup calls');

  //
  // Set the Y pool token minter
  //

  try {
    await catchUnknownSigner(
      execute(
        CURVE_Y_TOKEN_CONTRACT,
        {
          from: marketingWallet,
          log: true,
        },
        'set_minter',
        CURVE_Y_SWAP_ADDRESS
      )
    );
  } catch (err) {
    console.log('Curve minter already set');
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Seed the Y pool with some funds
  //
  //////////////////////////////////////////////////////////////////////////////

  log_step('Adding funds to Y pool');

  // Check of previously seeded
  const yPoolTokenBalance = await CURVE_Y_TOKEN_INSTANCE.balanceOf(deployer);
  if (yPoolTokenBalance < INITIAL_Y_POOL_TOKENS) {
    //
    // Mint
    //

    await execute(
      DAI_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'mint',
      deployer,
      INITIAL_Y_POOL_DAI
    );

    await execute(
      TUSD_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'mint',
      deployer,
      INITIAL_Y_POOL_TUSD
    );

    await execute(
      USDC_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'mint',
      deployer,
      INITIAL_Y_POOL_USDC
    );

    await execute(
      USDT_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'mint',
      deployer,
      INITIAL_Y_POOL_USDT
    );

    //
    // Approve
    //

    await execute(
      DAI_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'approve',
      CURVE_Y_DEPOSIT_ADDRESS,
      INITIAL_Y_POOL_DAI
    );

    await execute(
      TUSD_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'approve',
      CURVE_Y_DEPOSIT_ADDRESS,
      INITIAL_Y_POOL_TUSD
    );

    await execute(
      USDC_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'approve',
      CURVE_Y_DEPOSIT_ADDRESS,
      INITIAL_Y_POOL_USDC
    );

    await execute(
      USDT_TOKEN_CONTRACT,
      {
        from: deployer,
        log: true,
      },
      'approve',
      CURVE_Y_DEPOSIT_ADDRESS,
      INITIAL_Y_POOL_USDT
    );

    //
    // Add liquidity
    //

    await execute(
      CURVE_Y_DEPOSIT_CONTRACT,
      {
        from: deployer,
        gasLimit: 2000000, // 2M GWei
        log: true,
      },
      'add_liquidity',
      [
        INITIAL_Y_POOL_DAI,
        INITIAL_Y_POOL_USDC,
        INITIAL_Y_POOL_USDT,
        INITIAL_Y_POOL_TUSD,
      ],
      0
    );
  } else {
    console.log(`Deployer has ${yPoolTokenBalance} Y pool tokens`);
  }
};

module.exports = func;
module.exports.tags = ['SetupInvestmentDepends'];
