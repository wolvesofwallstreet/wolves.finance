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

/* eslint @typescript-eslint/no-unused-vars: "off" */

import * as dagPB from '@ipld/dag-pb';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { MemoryBlockstore } from 'blockstore-core/memory';
import chai from 'chai';
import { MemoryDatastore } from 'datastore-core/memory';
import { solidity } from 'ethereum-waffle';
import { ethers } from 'ethers';
import fs from 'fs';
import * as IPFS from 'ipfs-core';
import { IPFS as IPFSType } from 'ipfs-core-types';
import { createRepo } from 'ipfs-repo';
import tempDir from 'ipfs-utils/src/temp-dir.js';
import { BlockCodec } from 'multiformats/codecs/interface';
import Web3 from 'web3'; // TODO: Remove me

import FilesystemAbi from '../../src/abi/contracts/src/filesystem/Filesystem.sol/Filesystem.json';
import TaskManagerAbi from '../../src/abi/contracts/src/filesystem/TaskManager.sol/TaskManager.json';
import { hardhat } from '../utils/hardhat';

chai.use(solidity);

// Path to generated address registry file
const GENERATED_ADDRESSES = `${__dirname}/../../src/config/generated-addresses.json`;

// Paths to test files
const TEST_INPUT_FILE = `${__dirname}/../data/alphabet.txt`;
const TEST_OUTPUT_FILE = `${__dirname}/../data/reverse_alphabet.txt`;
const TEST_WASM_FILE = `${__dirname}/../data/reverse_alphabet.wasm`;

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
//const GAS_ESTIMATOR_URL: string =
//  'https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json?api-key=53be2a60f8bc0bb818ad161f034286d709a9c4ccb1362054b0543df78e27';
const GAS_ESTIMATOR_URL = 'https://ethgasstation.info/json/ethgasAPI.json';

const CodeType = {
  WAST: 0,
  WASM: 1,
  INTERNAL: 2,
  INPUT: 3,
};

const StorageType = {
  IPFS: 0,
  BLOCKCHAIN: 1,
};

describe('Reverse alphabet WASM task', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;

  // Addresses are lazy-loaded
  let addresses = null;

  let contracts = null;

  // IPFS parameters
  let ipfsNode: IPFSType = null;
  let inputFile: Buffer;
  let outputFile: Buffer;
  let wasmCode: Buffer;
  let solverWasmCode: Buffer;

  // Lazily-initialized variables
  let ethUsd = 0;
  let gasPrice = 0;

  // Fixture setup
  const setupTest = hardhat.deployments.createFixture(
    async ({ deployments }) => {
      // Ensure we start from a fresh deployment
      await deployments.fixture();

      // Get the Signers
      [signer, marketingWallet] = await hardhat.ethers.getSigners();

      // Get contract addresses
      const addresses = await getAddresses();

      // Construct the contracts
      const filesystemContract = new ethers.Contract(
        addresses.filesystem,
        FilesystemAbi,
        marketingWallet
      );
      const taskManagerContract = new ethers.Contract(
        addresses.taskManager,
        TaskManagerAbi,
        marketingWallet
      );

      return {
        filesystemContract,
        taskManagerContract,
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

  async function getGasPrice() {
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

  // Utility function to get the file ID from transaction logs
  function getFileIdFromLogs(
    filesystemInterface: ethers.utils.Interface,
    receipt: ethers.providers.TransactionReceipt
  ): string {
    let fileId = '';

    // For each log in the transaction receipt
    const receiptLogs: ethers.providers.Log[] = receipt.logs;
    for (const log of receiptLogs) {
      const event: ethers.utils.LogDescription =
        filesystemInterface.parseLog(log);

      if (event.name === 'AddedIPFSFile') {
        fileId = event.args.fileId;
        break;
      }
    }

    return fileId;
  }

  // Utility function to get the task info from transaction logs
  function getTaskInfoFromLogs(
    taskManagerInterface: ethers.utils.Interface,
    receipt: ethers.providers.TransactionReceipt
  ) {
    let taskId = '';
    let taskGiver = '';
    let initHash = '';
    let codeType = CodeType.WASM;
    let storageType = StorageType.IPFS; // TODO: Move to blockchain
    let bundleId = '';

    // For each log in the transaction receipt
    const receiptLogs: ethers.providers.Log[] = receipt.logs;
    for (const log of receiptLogs) {
      const event: ethers.utils.LogDescription =
        taskManagerInterface.parseLog(log);

      if (event.name === 'TaskPosted') {
        taskId = event.args.taskId;
        taskGiver = event.args.taskGiver;
        initHash = event.args.initHash;
        codeType = event.args.codeType;
        storageType = event.args.storageType;
        bundleId = event.args.stor;

        break;
      }
    }

    return [taskId, taskGiver, initHash, codeType, storageType, bundleId];
  }

  // Utility function to get the task solution info from transaction logs
  function getSolutionInfoFromLogs(
    taskManagerInterface: ethers.utils.Interface,
    receipt: ethers.providers.TransactionReceipt
  ) {
    let taskId = '';
    let initHash = '';
    let resultHash = '';
    let codeType = CodeType.WASM;
    let storageType = StorageType.IPFS; // TODO: Move to blockchain
    let bundleId = '';
    let solver = '';

    // For each log in the transaction receipt
    const receiptLogs: ethers.providers.Log[] = receipt.logs;
    for (const log of receiptLogs) {
      const event: ethers.utils.LogDescription =
        taskManagerInterface.parseLog(log);

      if (event.name === 'TaskSolved') {
        taskId = event.args.taskId;
        initHash = event.args.initHash;
        resultHash = event.args.resultHash;
        codeType = event.args.codeType;
        storageType = event.args.storageType;
        bundleId = event.args.stor;
        solver = event.args.solver;

        break;
      }
    }

    return [
      taskId,
      initHash,
      resultHash,
      codeType,
      storageType,
      bundleId,
      solver,
    ];
  }

  //
  // IPFS operations
  //

  // Bootstraps IPFS and transfers control to our entry points
  async function bootstrapIPFS(): Promise<IPFSType> {
    const dir = tempDir();
    fs.mkdirSync(dir);

    const memoryDs = new MemoryDatastore();
    const memoryBs = new MemoryBlockstore();

    // IPFS options
    // Configuration for running offline comes from:
    //   https://github.com/ipfs/js-ipfs/issues/3923#issuecomment-950778157
    const options = {
      offline: true,
      silent: true,
      preload: {
        enabled: false,
      },
      config: {
        Discovery: {
          MDNS: {
            Enabled: false,
          },
          webRTCStar: {
            Enabled: false,
          },
        },
      },
      libp2p: {
        peerStore: {
          persistence: false,
        },
        config: {
          peerDiscovery: {
            autoDial: false,
          },
        },
      },
      repo: createRepo(
        dir,
        (codeOrName) => {
          const lookup: Record<string, BlockCodec<number, unknown>> = {
            [dagPB.code]: dagPB,
            [dagPB.name]: dagPB,
          };

          return Promise.resolve(lookup[codeOrName]);
        },
        {
          root: memoryDs,
          blocks: memoryBs,
          keys: memoryDs,
          datastore: memoryDs,
          pins: memoryDs,
        },
        {
          repoLock: {
            lock: async () => ({
              close: async function () {
                return;
              },
            }),
            locked: async () => false,
          },
          autoMigrate: false,
        }
      ),
      EXPERIMENTAL: {
        ipnsPubsub: true,
      },
    };

    // Create IPFS node
    const node: IPFSType = await IPFS.create(options);

    //
    // IPFS is ready to use!
    // See https://github.com/ipfs/js-ipfs#core-api
    //

    return node;
  }

  async function uploadFile(path: string, content: Buffer): Promise<string> {
    const { cid } = await ipfsNode.add({
      path: path,
      content: content,
    });

    return cid.toString();
  }

  async function downloadFile(
    fileId: string,
    fileName: string
  ): Promise<Buffer[]> {
    const parts: Buffer[] = [];

    for await (const part of ipfsNode.get(fileId)) {
      parts.push(Buffer.from(part));
    }

    return parts;
  }

  //
  // Merkle operations
  //

  const zeroWord = Buffer.alloc(16);

  function makeMerkle(arr, i: number, level: number): string {
    if (level === 0) {
      if (i < arr.length) {
        return '0x' + arr[i].toString('hex');
      } else {
        return '0x' + zeroWord.toString('hex');
      }
    } else {
      return Web3.utils.soliditySha3(
        { t: 'bytes', v: makeMerkle(arr, i, level - 1) },
        {
          t: 'bytes',
          v: makeMerkle(arr, i + Math.pow(2, level - 1), level - 1),
        }
      );
    }
  }

  function depth(x: number): number {
    if (x <= 1) {
      return 0;
    } else {
      return 1 + depth(Math.floor(x / 2));
    }
  }

  function to16BytesArray(inputBuf: Buffer): Buffer[] {
    const leafs: Buffer[] = [];
    let i = 0;
    while (i < inputBuf.byteLength) {
      const buf = inputBuf.slice(i, i + 16);
      if (buf.byteLength < 16) {
        leafs.push(Buffer.concat([buf, Buffer.alloc(16 - buf.byteLength)]));
      } else {
        leafs.push(buf);
      }
      i += 16;
    }
    return leafs;
  }

  function merkleRoot(input: Buffer): string {
    const chunks: Buffer[] = to16BytesArray(input);

    if (chunks.length < 1) chunks.push(zeroWord);
    if (chunks.length < 2) chunks.push(zeroWord);

    const res: string = makeMerkle(chunks, 0, depth(chunks.length * 2 - 1));
    return res;
  }

  before(async function () {
    this.timeout(60 * 1000);

    // Get contracts
    contracts = await setupTest();

    // Initialize IPFS
    ipfsNode = await bootstrapIPFS();

    // Query API providers
    const ethUsd: number = await toUsd(1);
    const gasPrice: number = await getGasPrice();

    console.log(`    ETH price is $${ethUsd}`);
    console.log(`    Using '${GAS_PRICE}' gas at ${gasPrice / 1e9} Gwei`);
  });

  after(async function () {
    if (ipfsNode) {
      await ipfsNode.stop();
      ipfsNode = null;
    }
  });

  let bundleId: string;

  it('should create bundle', async function () {
    this.timeout(60 * 1000);

    const { filesystemContract } = contracts;

    const operator: string = marketingWallet.address;
    const num: ethers.BigNumber = ethers.BigNumber.from(
      String(Math.floor(Math.random() * Math.pow(2, 60)))
    );

    bundleId = await filesystemContract.makeBundle(operator, num);
  });

  let inputSize: number;
  let inputCid: string;
  let inputRoot: string;

  it('should upload input file to IPFS', async function () {
    inputFile = fs.readFileSync(TEST_INPUT_FILE);
    inputSize = inputFile.byteLength;

    inputCid = await uploadFile('bundle/alphabet.txt', inputFile);

    inputRoot = merkleRoot(inputFile);

    console.log(`Input file: ${inputCid} (${inputSize} bytes)`);
  });

  const inputName = 'alphabet.txt';
  const inputNonce = 100; // Use deterministic nonce for testing
  let inputFileId: string;

  it('should register input file with filesystem', async function () {
    const { filesystemContract } = contracts;

    const filesystemInterface = new ethers.utils.Interface(FilesystemAbi);

    const tx: Promise<ethers.ContractTransaction> =
      filesystemContract.addIPFSFile(
        inputName,
        inputSize,
        inputCid,
        inputRoot,
        inputNonce
      );

    // Log gas cost
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
    const gasCost: number =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000'))
        .toNumber() / 1000.0;
    console.log(
      `    Gas to register input file (${inputSize} bytes): ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );

    // Get file ID from tx events
    inputFileId = getFileIdFromLogs(filesystemInterface, receipt);
  });

  it('should add input file to bundle', async function () {
    const { filesystemContract } = contracts;

    const tx: Promise<ethers.ContractTransaction> =
      filesystemContract.addToBundle(bundleId, inputFileId);

    // Log gas cost
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
    const gasCost: number =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000'))
        .toNumber() / 1000.0;
    console.log(
      `    Gas to add input file to bundle: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  let outputSize: number;
  let outputCid: string;
  let outputRoot: string;

  it('should upload output file to IPFS', async function () {
    outputFile = fs.readFileSync(TEST_OUTPUT_FILE);
    outputSize = outputFile.byteLength;

    outputCid = await uploadFile('bundle/reverse_alphabet.txt', outputFile);

    outputRoot = merkleRoot(outputFile);

    console.log(`Output file: ${outputCid} (${outputSize} bytes)`);
  });

  const outputName = 'reverse_alphabet.txt';
  const outputNonce = 101; // Use deterministic nonce for testing
  let outputFileId: string;

  it('should register output file with filesystem', async function () {
    const { filesystemContract } = contracts;

    const filesystemInterface = new ethers.utils.Interface(FilesystemAbi);

    const tx: Promise<ethers.ContractTransaction> =
      await filesystemContract.addIPFSFile(
        outputName,
        outputSize,
        outputCid,
        outputRoot,
        outputNonce
      );

    // Log gas cost
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
    const gasCost: number =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000'))
        .toNumber() / 1000.0;
    console.log(
      `    Gas to register output file (${outputSize} bytes): ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );

    // Get file ID from tx events
    outputFileId = getFileIdFromLogs(filesystemInterface, receipt);
  });

  it('should add output file to bundle', async function () {
    const { filesystemContract } = contracts;

    const tx: Promise<ethers.ContractTransaction> =
      filesystemContract.addToBundle(bundleId, outputFileId);

    // Log gas cost
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
    const gasCost: number =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000'))
        .toNumber() / 1000.0;
    console.log(
      `    Gas to add output file to bundle: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  let wasmSize: number;
  let ipfsFileCid: string;

  it('should upload WASM code to IPFS', async function () {
    const fileName = 'bundle/alphabet.wasm';

    wasmCode = fs.readFileSync(TEST_WASM_FILE);
    wasmSize = wasmCode.length;

    ipfsFileCid = await uploadFile(fileName, wasmCode);

    console.log(`WASM file: ${ipfsFileCid} (${wasmSize} bytes)`);
  });

  it('should register IPFS file with filesystem', async function () {
    this.timeout(5 * 1000);

    const { filesystemContract } = contracts;

    // Upload and register input and output files
    const randomPath =
      process.cwd() +
      '/tmp.giver_' +
      Math.floor(Math.random() * Math.pow(2, 60)).toString(32);

    if (!fs.existsSync(randomPath)) {
      fs.mkdirSync(randomPath);
    }

    fs.writeFileSync(randomPath + '/alphabet.txt', inputFile);
    fs.writeFileSync(randomPath + '/reverse_alphabet.txt', outputFile);
    fs.writeFileSync(randomPath + '/reverse_alphabet.wasm', wasmCode);

    const config = {
      code_file: 'reverse_alphabet.wasm',
      input_file: 'alphabet.txt',
      actor: {},
      files: ['alphabet.txt', 'reverse_alphabet.txt'],
      code_type: ethers.BigNumber.from(CodeType.WASM),
    };

    // TODO: Is this correct?
    const codeRoot = ethers.utils.keccak256(wasmCode);

    const tx: Promise<ethers.ContractTransaction> =
      filesystemContract.finalizeBundleIPFS(bundleId, ipfsFileCid, codeRoot);

    // Log gas cost
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
    const gasCost: number =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000'))
        .toNumber() / 1000.0;
    console.log(
      `    Gas to finalize bundle: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  let initHash: string;

  it('should provide the hash of the initialized state', async function () {
    const { filesystemContract } = contracts;

    initHash = await filesystemContract.getInitHash(bundleId);
  });

  let taskId: string;

  it('should submit a task', async function () {
    const { taskManagerContract } = contracts;

    const taskManagerInterface = new ethers.utils.Interface(TaskManagerAbi);

    const tx: Promise<ethers.ContractTransaction> = taskManagerContract.add(
      initHash,
      ethers.BigNumber.from(CodeType.WASM),
      ethers.BigNumber.from(StorageType.IPFS), // TODO: Change to blockchain storage
      bundleId
    );

    // Log gas cost
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
    const gasCost: number =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000'))
        .toNumber() / 1000.0;
    console.log(
      `    Gas to submit task: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );

    // Get task ID from tx events
    const [_taskId, _taskGiver, _initHash, _codeType, _storageType, _bundleId] =
      getTaskInfoFromLogs(taskManagerInterface, receipt);
    taskId = String(_taskId);

    console.log(`Task ID: ${taskId}`);

    chai.expect(_taskGiver).to.equal(marketingWallet.address);
    chai.expect(_initHash).to.equal(initHash);
    chai.expect(_codeType).to.equal(CodeType.WASM);
    chai.expect(_storageType).to.equal(StorageType.IPFS); // TODO: Change to blockchain storage
    chai.expect(_bundleId).to.equal(bundleId);
  });

  it('should get task data from IPFS', async function () {
    const { filesystemContract } = contracts;

    const codeIpfsCid = await filesystemContract.getIpfsCid(bundleId);

    const name = 'task.wast';

    const parts: Buffer[] = await downloadFile(codeIpfsCid, name);

    // TODO: Remove logging when getting files is figured out
    let totalSize = 0;
    for (const part of parts) {
      if (part.length === wasmSize) {
        solverWasmCode = part;
        console.log(`Got part of size ${part.length} bytes (WASM file)`);
      } else {
        console.log(`Got part of size ${part.length} bytes`);
      }
      totalSize += part.length;
    }
    console.log(`Total size: ${totalSize}`);
  });

  it('should execute task', async function () {
    const { taskManagerContract } = contracts;

    const randomPath =
      process.cwd() +
      '/tmp.solver_' +
      Math.floor(Math.random() * Math.pow(2, 60)).toString(32);

    if (!fs.existsSync(randomPath)) {
      fs.mkdirSync(randomPath);
    }

    fs.writeFileSync(randomPath + '/solverWasmCode.wasm', solverWasmCode);
    fs.writeFileSync(randomPath + '/alphabet.txt', inputFile);
    fs.writeFileSync(randomPath + '/reverse_alphabet.txt', outputFile);

    const taskInfo = await taskManagerContract.taskInfo(taskId);
    const vmParameters = await taskManagerContract.getVMParameters(taskId);

    console.log('VM parameters:');
    console.log(`  Stack size: ${2**vmParameters.stack}`);
    console.log(`  Mem size: ${2**vmParameters.mem}`);
    console.log(`  Globals size: ${2**vmParameters.globals}`);
    console.log(`  Table size: ${2**vmParameters.table}`);
    console.log(`  Call size: ${2**vmParameters.call}`);

    // TODO
    const solverConf = {
      error: false,
      error_location: 0,
      stop_early: -1,
      deposit: 1,
    };

    const config = {
      code_file: 'solverWasmCode.wasm',
      input_file: 'alphabet.txt',
      actor: solverConf,
      files: ['alphabet.txt', 'reverse_alphabet.txt'],
      vm_parameters: vmParameters,
      code_type: parseInt(taskInfo.codeType),
    };

    /* TODO
    solverVM = merkleComputer.init(config, randomPath);

    const interpreterArgs = [];

    solverResult = await solverVM.executeWasmTask(interpreterArgs);
    */
  });

  it('should solve the task', async function () {
    this.timeout(60 * 1000);

    const { taskManagerContract } = contracts;

    const taskManagerInterface = new ethers.utils.Interface(TaskManagerAbi);

    /* TODO
    const tx: Promise<ethers.ContractTransaction> = taskManagerContract.solveIO(
      taskId,
      solverResult.vm.code,
      solverResult.vm.input_size,
      solverResult.vm.input_name,
      solverResult.vm.input_data
    );
    */

    const tx: Promise<ethers.ContractTransaction> =
      taskManagerContract.solve(taskId);

    // Log gas cost
    const receipt: ethers.ContractReceipt = await (await tx).wait();
    const gasUsedGwei: ethers.BigNumber = receipt.gasUsed;
    const gasCost: number =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000'))
        .toNumber() / 1000.0;
    console.log(
      `    Gas to solve task: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );

    const [
      _taskId,
      _initHash,
      _resultHash,
      _codeType,
      _storageType,
      _bundleId,
      _solver,
    ] = getSolutionInfoFromLogs(taskManagerInterface, receipt);

    console.log(`Result hash: ${_resultHash}`);

    chai.expect(_taskId).to.equal(taskId);
    chai.expect(_initHash).to.equal(initHash);
    chai.expect(_codeType).to.equal(CodeType.WASM);
    chai.expect(_storageType).to.equal(StorageType.IPFS); // TODO: Change to blockchain storage
    chai.expect(_bundleId).to.equal(bundleId);
    chai.expect(_solver).to.equal(marketingWallet.address);
  });
});
