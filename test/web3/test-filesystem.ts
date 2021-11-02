/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * This file is derived from webasm-solidity, available under the MIT license.
 * https://github.com/TrueBitFoundation/webasm-solidity
 *
 * SPDX-License-Identifier: Apache-2.0 AND MIT
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */
/* eslint @typescript-eslint/no-unused-vars: "off" */

import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { ethers } from 'ethers';
import fs from 'fs';

import FilesystemAbi from '../../src/abi/contracts/src/filesystem/Filesystem.sol/Filesystem.json';
import { hardhat } from '../utils/hardhat';

chai.use(solidity);

// Path to generated address registry file
const GENERATED_ADDRESSES = `${__dirname}/../../src/config/generated-addresses.json`;

// Path to test file
//const TEST_FILE = `${__dirname}/../data/Space Invaders (1978) (Atari) [!].a26`;
const TEST_FILE = `${__dirname}/../data/random-100KB.bin`;

// The following gas prices are available
//
//   - 'SLOW'
//   - 'AVERAGE'
//   - 'FAST'
//   - 'FASTEST'
//
const GAS_PRICE = 'AVERAGE';

// Current price API URL
const CURRENT_PRICE_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum';

// Gas estimator API URL
// TODO: Move API key to GitHub Actions secret
//const GAS_ESTIMATOR_URL =
//  'https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json?api-key=53be2a60f8bc0bb818ad161f034286d709a9c4ccb1362054b0543df78e27';
const GAS_ESTIMATOR_URL = 'https://ethgasstation.info/json/ethgasAPI.json';

describe('Filesystem', function () {
  let contracts = undefined;

  // Addresses are lazy-loaded
  let addresses = null;

  // Lazily-initialized variables
  let ethUsd = 0;
  let gasPrice = 0;

  // Utility function to get addresses from the address registry file
  async function getAddresses() {
    if (addresses === null) {
      // Get chain ID
      const chainId = await hardhat.getChainId();

      // Load contract addresses
      const generatedNetworks = JSON.parse(
        fs.readFileSync(GENERATED_ADDRESSES).toString()
      );
      addresses = generatedNetworks[chainId] || {};
    }

    return addresses;
  }

  // Fixture setup
  const setupTest = hardhat.deployments.createFixture(
    async ({ deployments }) => {
      // Ensure we start from a fresh deployment
      await deployments.fixture();

      // Get the Signers
      const [_, marketingWallet] = await hardhat.ethers.getSigners();

      // Get contract addresses
      const addresses = await getAddresses();

      // Construct the contracts
      const filesystemContract = new ethers.Contract(
        addresses.filesystem,
        FilesystemAbi,
        marketingWallet
      );

      return {
        filesystemContract,
      };
    }
  );

  // Helper functions
  async function toUsd(eth: number): Promise<number> {
    if (ethUsd === 0) {
      // Query current price API
      const response: Response = await fetch(CURRENT_PRICE_URL);

      // Parse response
      const responseJson = await response.json();
      if (responseJson) {
        ethUsd = responseJson[0].current_price;
      }
    }

    return parseFloat((eth * ethUsd).toFixed(2));
  }

  async function getGasPrice(): Promise<number> {
    if (gasPrice === 0) {
      // Lookup table for JSON keys
      const JSON_KEY = {
        SLOW: 'safeLow',
        AVERAGE: 'average',
        FAST: 'fast',
        FASTEST: 'fastest',
      };

      // Query current price API
      const response: Response = await fetch(GAS_ESTIMATOR_URL);

      // Parse response
      const responseJson = await response.json();
      if (responseJson) {
        gasPrice = (responseJson[JSON_KEY[GAS_PRICE]] * 1e9) / 10;
      }
    }

    return gasPrice;
  }

  function arrange(buf: Buffer): string[] {
    const res: string[] = [];
    const arr: string[] = [];

    for (let i = buf.length % 32; i < 32; i++) {
      arr.push('00');
    }

    for (let i = 0; i < buf.length; i++) {
      if (buf[i] > 15) {
        arr.push(buf[i].toString(16));
      } else {
        arr.push('0' + buf[i].toString(16));
      }
    }

    let acc = '';
    arr.forEach(function (b) {
      acc += b;
      if (acc.length === 64) {
        res.push('0x' + acc);
        acc = '';
      }
    });
    if (acc !== '') {
      res.push('0x' + acc);
    }

    return res;
  }

  function bufferSize(n: number): number {
    return Math.ceil(Math.log(n) / Math.log(2));
  }

  function completeArray(arr: string[][]) {
    const tlen: number = Math.pow(2, bufferSize(arr.length));

    while (arr.length < tlen) {
      arr.push([
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      ]);
    }
  }

  function chunkify(arr: string[]): string[][] {
    // Make chunks of length 1024
    const res: string[][] = [];
    let acc: string[] = [];

    for (let i = 0; i < arr.length; i++) {
      acc.push(arr[i]);
      if (acc.length === 1024) {
        res.push(acc);
        acc = [];
      }
    }

    if (acc.length > 0) {
      res.push(
        acc.concat([
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ])
      );
    }

    completeArray(res);

    return res;
  }

  /**
   * Parses transaction events from the logs in a transaction receipt
   *
   * @param {TransactionReceipt} receipt Transaction receipt containing the events in the logs
   *
   * @returns The chunk hash
   *
   * Credit to ricmoo's helpful post on GitHub.
   */
  function getChunkHash(
    filesystemInterface: ethers.utils.Interface,
    receipt: ethers.providers.TransactionReceipt
  ): string {
    let hash = '';

    // For each log in the transaction receipt
    const receiptLogs: ethers.providers.Log[] = receipt.logs;
    for (const log of receiptLogs) {
      const event: ethers.utils.LogDescription =
        filesystemInterface.parseLog(log);

      if (event.name === 'ChunkAdded') {
        hash = event.args.hash;
        break;
      }
    }

    return hash;
  }

  async function uploadBuffer(
    filesystemContract: ethers.Contract,
    filesystemInterface: ethers.utils.Interface,
    buf: Buffer
  ): Promise<void> {
    let totalGas: ethers.BigNumber = ethers.constants.Zero;
    let totalCost = 0;
    let totalSize = 0;

    const arr: string[] = arrange(buf);
    const chunks: string[][] = chunkify(arr);
    const acc: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkSize: number = 32 * chunks[i].length;

      const tx: Promise<ethers.ContractTransaction> =
        filesystemContract.addChunk(chunks[i], 10);

      // Log gas cost
      const receipt: ethers.ContractReceipt = await (await tx).wait();
      const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
      const gasCost: number =
        gasUsedGwei
          .mul(await getGasPrice())
          .div(ethers.BigNumber.from('1000000000000000'))
          .toNumber() / 1000.0;
      console.log(
        `    Gas to add chunk of size ${chunkSize}: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
          gasCost
        )})`
      );

      // Update total gas cost and file size
      totalGas = totalGas.add(gasUsedGwei);
      totalCost += gasCost;
      totalSize += chunkSize;

      // Get hash from tx events
      const hash: string = getChunkHash(filesystemInterface, receipt);
      acc.push(hash);
    }

    // Log total gas cost so far
    console.log(
      `    Total gas to upload ${totalSize} bytes: ${totalGas} (${totalCost} ETH / $${await toUsd(
        totalCost
      )})`
    );

    if (chunks.length === 1) {
      // No need to combine chunks
      return;
    }

    const tx: Promise<ethers.ContractTransaction> =
      filesystemContract.combineChunks(acc, 10, bufferSize(chunks.length));

    // Log gas cost
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
    const gasCost: number =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000'))
        .toNumber() / 1000.0;
    console.log(
      `    Gas to combine ${
        acc.length
      } chunks: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(gasCost)})`
    );

    // Log total gas cost
    totalGas = totalGas.add(gasUsedGwei);
    totalCost += gasCost;
    console.log(
      `    Total gas to upload file: ${totalGas} (${totalCost} ETH / $${await toUsd(
        totalCost
      )})`
    );
  }

  before(async function () {
    this.timeout(60 * 1000);

    // Get contracts
    contracts = await setupTest();

    // Query API providers
    const ethUsd: number = await toUsd(1);
    const gasPrice: number = await getGasPrice();

    console.log(`    ETH price is $${ethUsd}`);
    console.log(`    Using '${GAS_PRICE}' gas at ${gasPrice / 1e9} Gwei`);
  });

  it('should deploy a file', async function () {
    this.timeout(10 * 60 * 1000);

    const { filesystemContract } = contracts;

    const filesystemInterface = new ethers.utils.Interface(FilesystemAbi);

    const fileContents: Buffer = fs.readFileSync(TEST_FILE);

    console.log(`    Loaded file of size ${fileContents.length} bytes`);
    await uploadBuffer(filesystemContract, filesystemInterface, fileContents);
  });
});
