/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */

const env = require('./src/config/environment');

// Inject Hardhat plugins
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('hardhat-abi-exporter');
require('hardhat-deploy');
require('hardhat-deploy-ethers');

// Testnet accounts
const TESTNET_ACCOUNTS = [
  env.DEPLOYER_WALLET,
  env.MARKETING_WALLET,
  env.TEAM_WALLET,
  env.TEST_WALLET,
].filter(Boolean);

const config = {
  namedAccounts: {
    deployer: {
      default: 0,
    },
    marketingWallet: {
      default: 1,
      rinkeby: '0x7Df8c0E18c6103B1f5037032ca02A960cd4F67E4',
      mainnet: '0xbb5a7c17adE983f03AFd8B09922b1C117b9eabc0',
    },
    teamWallet: {
      default: 2,
      rinkeby: '0xb50c5E17B6d665d50AE5c44677086eB20f75Aa35',
      mainnet: '0x154f41d41B67278c6AB41fc8Ca5db77Fd461f2f2',
    },
    testUser: {
      default: 3,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.7.4',
        settings: {
          evmVersion: 'berlin',
          optimizer: {
            enabled: true,
            runs: 1000,
            details: {
              yul: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
            },
          },
        },
      },
      {
        // Required by Uniswap
        version: '0.6.6',
        settings: {
          evmVersion: 'berlin',
          optimizer: {
            enabled: true,
            runs: 1000000,
            details: {
              yul: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
            },
          },
        },
      },
      {
        version: '0.6.5',
        settings: {
          evmVersion: 'berlin',
          optimizer: {
            enabled: true,
            runs: 1000000,
            details: {
              yul: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
            },
          },
        },
      },
      {
        // Required by W-ETH
        version: '0.5.17',
        settings: {
          evmVersion: 'berlin',
          optimizer: {
            enabled: true,
            runs: 1000000,
            details: {
              yul: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
            },
          },
        },
      },
      {
        // Required by Uniswap
        version: '0.5.16',
        settings: {
          evmVersion: 'berlin',
          optimizer: {
            enabled: true,
            runs: 1000000,
            details: {
              yul: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
            },
          },
        },
      },
    ],
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      tags: ['test', 'local'],
      loggingEnabled: false,
    },
    localhost: {
      url: 'http://localhost:8545',
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${env.INFURA_API_KEY}`,
      accounts: TESTNET_ACCOUNTS,
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${env.INFURA_API_KEY}`,
      accounts: TESTNET_ACCOUNTS,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${env.INFURA_API_KEY}`,
      accounts: TESTNET_ACCOUNTS,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${env.INFURA_API_KEY}`,
      accounts: TESTNET_ACCOUNTS,
    },
  },
  etherscan: {
    apiKey: env.ETHERSCAN_API_KEY,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',

    // Contains the deploy script that are executed upon invocation of
    // `hardhat deploy` or `hardhat node`
    deploy: './deploy',

    // Contains the resulting deployments (contract addresses along their ABI,
    // bytecode, metadata...)
    deployments: './deployments',

    // Contains artifacts that were pre-compiled. Useful if you want to upgrade
    // to a new solidity version but want to keep using previously compiled
    // contracts.
    imports: 'imports',
  },
  abiExporter: {
    // Path to ABI export directory (relative to Hardhat root)
    path: './src/abi',

    // Whether to delete old files in path
    clear: true,
  },
};

module.exports = config;
