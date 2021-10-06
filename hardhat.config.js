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
      rinkeby: env.RINKEBY_GNOSIS_MARKETING_WALLET_ADDRESS,
      mainnet: env.MAINNET_GNOSIS_MARKETING_WALLET_ADDRESS,
      polygon: env.POLYGON_GNOSIS_ADMIN_WALLET_ADDRESS,
      fantom: env.FANTOM_GNOSIS_ADMIN_WALLET_ADDRESS,
      goerli_sft: env.DEPLOYER_ADDRESS,
      mumbai: env.DEPLOYER_ADDRESS,
    },
    teamWallet: {
      default: 2,
      rinkeby: env.RINKEBY_GNOSIS_TEAM_WALLET_ADDRESS,
      mainnet: env.MAINNET_GNOSIS_TEAM_WALLET_ADDRESS,
      polygon: env.POLYGON_GNOSIS_ADMIN_WALLET_ADDRESS,
      fantom: env.FANTOM_GNOSIS_ADMIN_WALLET_ADDRESS,
      goerli_sft: env.DEPLOYER_ADDRESS,
      mumbai: env.DEPLOYER_ADDRESS,
    },
    testUser: {
      default: 3,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.7.6',
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
        // Required by Yearn
        version: '0.6.12',
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
        version: '0.6.6',
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
  // possible tags: needUniswap, needYearn, sidechain, rootchain, test, stakeFarm, local
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      tags: ['test', 'local', 'sidechain', 'needUniswap', 'needYearn'],
      loggingEnabled: false,
    },
    localhost: {
      tags: ['needUniswap'],
      url: 'http://localhost:8545',
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${env.INFURA_API_KEY}`,
      accounts: TESTNET_ACCOUNTS,
      gasPrice: 1500000000,
    },
    goerli_sft: {
      tags: ['rootchain'],
      url: `https://goerli.infura.io/v3/${env.INFURA_API_KEY}`,
      accounts: TESTNET_ACCOUNTS,
      gasPrice: 1500000000,
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
    mainnet: {
      tags: ['rootchain'],
      url: `https://mainnet.infura.io/v3/${env.INFURA_API_KEY}`,
      accounts: TESTNET_ACCOUNTS,
    },
    mumbai: {
      tags: ['sidechain', 'needYearn'],
      url: 'https://matic-mumbai.chainstacklabs.com',
      accounts: TESTNET_ACCOUNTS,
      gasPrice: 1500000000,
    },
    polygon: {
      tags: ['sidechain', 'curve3pool'],
      url: 'https://polygon-rpc.com',
      accounts: TESTNET_ACCOUNTS,
      gasPrice: 10000000000,
    },
    fantom: {
      tags: ['sidechain', 'fantom', 'curve2pool'],
      url: 'https://rpc.ftm.tools/',
      accounts: TESTNET_ACCOUNTS,
      gasPrice: 100000000000,
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
