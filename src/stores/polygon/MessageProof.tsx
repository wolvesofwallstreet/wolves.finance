/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

//import { Buffer } from 'safe-buffer';
import { BlockHeader } from '@ethereumjs/block/dist/header';
import blockHeaderFromRpc from '@ethereumjs/block/dist/header-from-rpc';
import {
  bufferToHex,
  fromUtf8,
  keccak,
  keccak256,
  rlp,
  setLengthLeft,
  toBuffer,
  zeros,
} from 'ethereumjs-util';
import { ethers } from 'ethers';
import { BaseTrie } from 'merkle-patricia-tree';

const CPM_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'proposer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'headerBlockId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'reward',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'start',
        type: 'uint256',
      },
      { indexed: false, internalType: 'uint256', name: 'end', type: 'uint256' },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'root',
        type: 'bytes32',
      },
    ],
    name: 'NewHeaderBlock',
    type: 'event',
  },
  {
    constant: true,
    inputs: [],
    name: 'currentHeaderBlock',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'getLastChildBlock',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'headerBlocks',
    outputs: [
      { internalType: 'bytes32', name: 'root', type: 'bytes32' },
      { internalType: 'uint256', name: 'start', type: 'uint256' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
      { internalType: 'address', name: 'proposer', type: 'address' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

const SEND_MESSAGE_SIG =
  '0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036';

const GRAPH_BASE = 'https://api.thegraph.com/subgraphs/name/';
const GRAPH_INDEX = 'https://api.thegraph.com/index-node/graphql';
const GRAPH_ACCOUNT = 'wolvesofwallstreet/';

type HeaderBlock = {
  root: string;
  start: ethers.BigNumber;
  end: ethers.BigNumber;
  createdAt: ethers.BigNumber;
  proposer: string;
};

type RawBlock = {
  hash: string;
  number: string;
  timestamp: string;
  transactionsRoot: string;
  receiptsRoot: string;
  transactions: [{ hash: string }];
};

type PendingItem = {
  rootBlock: number; // The blocknumber on the root chain at create tie
  headerBlockId: number; // The header blockId (checkpointed)
  tokenIds: string[];
  txHash: string; // Child chain TX hash
  txBlockNumber: number; // Child chain block number
  pending: boolean;
};

type Storage = {
  ethLastHeaderScanned: number;
  ethLastScanned: number;
  polygonLastScanned: number;
  pendingItems: PendingItem[];
};

type CB_FUNC = () => void;

class MerkleTree {
  leaves: Buffer[];
  layers: Buffer[][];

  constructor(leaves: Buffer[]) {
    if (leaves === void 0) {
      leaves = [];
    }
    if (leaves.length < 1) {
      throw new Error('Atleast 1 leaf needed');
    }
    const depth = Math.ceil(Math.log(leaves.length) / Math.log(2));
    if (depth > 20) {
      throw new Error('Depth must be 20 or less');
    }
    this.leaves = leaves.concat(
      Array.from(Array(Math.pow(2, depth) - leaves.length), function () {
        return zeros(32);
      })
    );
    this.layers = [this.leaves];
    this.createHashes(this.leaves);
  }

  createHashes(nodes: Buffer[]) {
    if (nodes.length === 1) {
      return false;
    }
    const treeLevel = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1];
      const data = Buffer.concat([left, right]);
      treeLevel.push(keccak(data));
    }
    // is odd number of nodes
    if (nodes.length % 2 === 1) {
      treeLevel.push(nodes[nodes.length - 1]);
    }
    this.layers.push(treeLevel);
    this.createHashes(treeLevel);
  }

  getRoot(): Buffer {
    return this.layers[this.layers.length - 1][0];
  }
}

//////////////////////////////////////////////////////////////////////////////
// MainClass
//////////////////////////////////////////////////////////////////////////////

export class MessageProof {
  provider: ethers.providers.JsonRpcProvider;
  checkPointManager: ethers.Contract;
  localStorageKey: string;
  localStorageItems: Storage;
  newBlockFilter: ethers.EventFilter;
  account: string;
  rootTunnel: string;
  childTunnel: string;
  rootGraph: string;
  childGraph: string;
  changed = false;
  launchBlock = 0;
  changeHandler: CB_FUNC;

  static LSKMUMBAI = 'mumbai_goerli_bridge';
  static LSKMATIC = 'matic_mainnet_bridge';

  constructor(
    ethereumProvider: ethers.providers.Provider,
    chainId: number,
    checkPointManagerAddress: string,
    account: string,
    rootTunnel: string,
    childTunnel: string,
    cb: CB_FUNC
  ) {
    if (chainId === 5) {
      this.provider = new ethers.providers.JsonRpcProvider(
        'https://rpc-mumbai.maticvigil.com/'
      );
      this.rootGraph = 'wows-goerli-v2';
      this.childGraph = 'wows-maticmum-v2';
      this.localStorageKey = MessageProof.LSKMUMBAI + '_' + account;
    } else if (chainId === 1) {
      this.provider = new ethers.providers.JsonRpcProvider(
        'https://polygon-rpc.com/'
      );
      this.rootGraph = 'wows-mainnet-v2';
      this.childGraph = 'wows-matic-v2';
      this.localStorageKey = MessageProof.LSKMATIC + '_' + account;
    } else {
      this.localStorageKey = '';
      throw new Error('Unsupported chainId');
    }

    this.checkPointManager = new ethers.Contract(
      checkPointManagerAddress,
      CPM_ABI,
      ethereumProvider
    );

    const items = window.localStorage.getItem(this.localStorageKey);
    // Migrate from old format
    if (items && items.indexOf('ethLastHeaderScanned') > 0) {
      this.localStorageItems = JSON.parse(items);
    } else {
      this.localStorageItems = {
        ethLastHeaderScanned: 1,
        ethLastScanned: 1,
        polygonLastScanned: 1,
        pendingItems: [],
      };
    }

    this.newBlockFilter = this.checkPointManager.filters.NewHeaderBlock();
    this.account = account;
    this.rootTunnel = rootTunnel;
    this.childTunnel = childTunnel;
    this.changeHandler = cb;

    this._setup();
  }

  accountChanged(account: string): void {
    if (account !== this.account) {
      this.account = account;
      const items = window.localStorage.getItem(this.localStorageKey);
      if (items) {
        this.localStorageItems = JSON.parse(items);
        this._setup();
      }
    }
  }

  removeItem(tokenId: ethers.BigNumber): void {
    if (this.localStorageKey) {
      const tokenIdHex = tokenId.toHexString();
      this.localStorageItems.pendingItems =
        this.localStorageItems.pendingItems.filter((elem) =>
          elem.tokenIds.includes(tokenIdHex)
        );
      window.localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(this.localStorageItems)
      );
    }
  }

  getTokenIds(
    account: string
  ): { tokenId: ethers.BigNumber; available: boolean }[] {
    return this.localStorageItems.pendingItems
      .filter((item) => !item.pending)
      .map((item) =>
        item.tokenIds.map((tid) => {
          return {
            tokenId: ethers.BigNumber.from(tid),
            available: item.headerBlockId > 0,
          };
        })
      )
      .flat();
  }

  processPending(tokenId: ethers.BigNumber): Promise<string> {
    const tokenIdHex = tokenId.toHexString();
    const item = this.localStorageItems.pendingItems.find((item) =>
      item.tokenIds.includes(tokenIdHex)
    );
    if (!item || !item.headerBlockId) throw new Error('TokenId invalid');
    item.pending = true;

    return this.buildPayloadForExit(item.headerBlockId, item.txHash);
  }

  resetPending(tokenId: ethers.BigNumber): void {
    const tokenIdHex = tokenId.toHexString();
    const item = this.localStorageItems.pendingItems.find((item) =>
      item.tokenIds.includes(tokenIdHex)
    );
    if (item) item.pending = false;
  }

  async buildPayloadForExit(
    headerBlockId: number,
    txHash: string
  ): Promise<string> {
    if (!this.checkPointManager || !this.provider) return '';

    // Get the last ChildBlock in checkPointManager
    const lastChildBlock: ethers.BigNumber =
      await this.checkPointManager.getLastChildBlock();

    const receipt = await this.provider.getTransactionReceipt(txHash);
    const block = (await this.provider.send('eth_getBlockByNumber', [
      ethers.utils.hexValue(receipt.blockNumber),
      true,
    ])) as RawBlock;

    if (lastChildBlock.lt(receipt.blockNumber))
      throw new Error('Not yet checkpointed');

    const headerBlock: HeaderBlock = await this.checkPointManager.headerBlocks(
      headerBlockId
    );

    const blockProof = await this._buildBlockProof(
      headerBlock.start.toNumber(),
      headerBlock.end.toNumber(),
      receipt.blockNumber
    );

    const receiptProof = await this._getReceiptProof(receipt, block);

    const logIndex = receipt.logs.findIndex(function (log) {
      return log.topics[0].toLowerCase() === SEND_MESSAGE_SIG;
    });

    return this._encodePayload(
      headerBlockId,
      blockProof,
      receipt.blockNumber,
      parseInt(block.timestamp),
      Buffer.from(block.transactionsRoot.slice(2), 'hex'),
      Buffer.from(block.receiptsRoot.slice(2), 'hex'),
      this._getReceiptBytes(receipt),
      receiptProof.parentNodes as Buffer[][],
      receiptProof.path as Buffer,
      logIndex
    );
  }

  _onNewHeaderBlock = (result: ethers.providers.Log): void => {
    this._findHeaderBlockNumber(0, 0, [result]);
  };

  _setup = async (): Promise<void> => {
    await this._scanPendingTokenIds();
    if (this.localStorageItems.pendingItems.length > 0) {
      // Get the last ChildBlock in checkPointManager
      const lastChildBlock = (
        (await this.checkPointManager.getLastChildBlock()) as ethers.BigNumber
      ).toNumber();

      // Run throu pendingItems and look which are ready
      let scanHeaderFrom,
        scanHeaderTo = 0;
      for (const pI of this.localStorageItems.pendingItems) {
        if (!pI.headerBlockId) {
          if (pI.txBlockNumber <= lastChildBlock) {
            if (!scanHeaderFrom) scanHeaderFrom = pI.rootBlock;
            scanHeaderTo = pI.rootBlock;
          }
        }
      }
      if (scanHeaderFrom) {
        if (scanHeaderFrom < this.localStorageItems.ethLastHeaderScanned)
          scanHeaderFrom = this.localStorageItems.ethLastHeaderScanned;
        await this._findHeaderBlockNumber(scanHeaderFrom, scanHeaderTo);
      }
      if (
        this.localStorageItems.pendingItems[
          this.localStorageItems.pendingItems.length - 1
        ].txBlockNumber > lastChildBlock
      ) {
        this.checkPointManager.provider.on(
          this.newBlockFilter,
          this._onNewHeaderBlock
        );
      }
    }
  };

  _scanPendingTokenIds = async (): Promise<void> => {
    //Step 1: fetch all sft token transfers to childTunnel
    try {
      const ethBlockNumber =
        await this.checkPointManager.provider.getBlockNumber();
      // Poll until we reached startup block
      let query = `{ "query": "{indexingStatusForCurrentVersion(subgraphName: \\"${GRAPH_ACCOUNT}${this.childGraph}\\") { chains { latestBlock { number }}}}"}`;
      let results = await (
        await fetch(GRAPH_INDEX, {
          method: 'POST', // or 'PUT'
          headers: {
            'Content-Type': 'application/json',
          },
          body: query,
        })
      ).json();
      const syncedBlockNumber =
        results.data.indexingStatusForCurrentVersion.chains[0].latestBlock
          .number;

      query = `{"query":"{ sftTransferEntities(where: {to: \\"${this.childTunnel}\\", from: \\"${this.account}\\", block_gt: ${this.localStorageItems.polygonLastScanned}}, orderBy: block) { txHash block blockTimestamp tokenIds }}","variables":null}`;
      this.localStorageItems.polygonLastScanned =
        await this.provider.getBlockNumber();
      const mumbaiTime = (
        await this.provider.getBlock(this.localStorageItems.polygonLastScanned)
      ).timestamp;
      if (!this.launchBlock)
        this.launchBlock = this.localStorageItems.polygonLastScanned;

      results = await (
        await fetch(GRAPH_BASE + GRAPH_ACCOUNT + this.childGraph, {
          method: 'POST', // or 'PUT'
          headers: {
            'Content-Type': 'application/json',
          },
          body: query,
        })
      ).json();

      // Step 2: Create a Set with tokenIds as key
      const bridgeItems = new Map<
        string,
        {
          count: number;
          hash: string;
          polygonBlockNumber: number;
          ethBlockNumber: number;
          headerBlockId: number;
          pending: boolean;
        }
      >();
      for (const ent of results.data.sftTransferEntities) {
        const tokenIds = ent.tokenIds.join('_');

        const item = bridgeItems.get(tokenIds) ?? {
          count: 0,
          hash: '',
          polygonBlockNumber: 0,
          ethBlockNumber: 0,
          headerBlockId: 0,
          pending: false,
        };
        ++item.count;
        item.hash = ent.txHash;
        item.polygonBlockNumber = parseInt(ent.block);
        const logTimestamp = parseInt(ent.blockTimestamp);
        item.ethBlockNumber = Math.trunc(
          ethBlockNumber - (mumbaiTime - logTimestamp) / 10
        );
        bridgeItems.set(tokenIds, item);
      }

      // Insert existing pending items
      this.localStorageItems.pendingItems.forEach((item) => {
        const tokenIds = item.tokenIds.join('_');
        if (bridgeItems.get(tokenIds)) throw new Error('Sync Mismatch');
        bridgeItems.set(tokenIds, {
          count: 1,
          hash: item.txHash,
          polygonBlockNumber: item.txBlockNumber,
          ethBlockNumber: item.rootBlock,
          headerBlockId: item.headerBlockId,
          pending: item.pending,
        });
      });

      query = `{"query":"{ sftTransferEntities(where: {to: \\"${this.account}\\", from: \\"${this.rootTunnel}\\", txMethodID: \\"0xf953cec7\\", block_gt: ${this.localStorageItems.ethLastScanned}}, orderBy: block) { txHash block blockTimestamp tokenIds }}","variables":null}`;
      this.localStorageItems.ethLastScanned = ethBlockNumber;

      results = await (
        await fetch(GRAPH_BASE + GRAPH_ACCOUNT + this.rootGraph, {
          method: 'POST', // or 'PUT'
          headers: {
            'Content-Type': 'application/json',
          },
          body: query,
        })
      ).json();

      // Step 4: Create a Set with tokenIds as key
      for (const ent of results.data.sftTransferEntities) {
        const tokenIds = ent.tokenIds.join('_');
        const item = bridgeItems.get(tokenIds);
        if (!item || item.count <= 0) throw new Error('Sync mismatch');
        --item.count;
      }

      // Collect the results
      this.localStorageItems.pendingItems = [];
      for (const key of bridgeItems.keys()) {
        const value = bridgeItems.get(key);
        if (value && value.count > 0) {
          this.localStorageItems.pendingItems.push({
            rootBlock: value.ethBlockNumber,
            headerBlockId: value.headerBlockId,
            tokenIds: key.split('_'),
            txHash: value.hash,
            txBlockNumber: value.polygonBlockNumber,
            pending: value.pending,
          });
          this.changed = true;
        }
      }

      this.localStorageItems.pendingItems.sort(
        (a, b) => a.txBlockNumber - b.txBlockNumber
      );
      window.localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(this.localStorageItems)
      );

      if (this.launchBlock > syncedBlockNumber)
        window.setTimeout(this._setup, 10000);
    } catch (e) {
      console.log(e);
    }
  };

  _encodePayload(
    headerNumber: number,
    buildBlockProof: string,
    blockNumber: number,
    timestamp: number,
    transactionsRoot: Buffer,
    receiptsRoot: Buffer,
    receipt: Buffer,
    receiptParentNodes: Array<Buffer[]>,
    path: Buffer,
    logIndex: number
  ): string {
    return bufferToHex(
      rlp.encode([
        headerNumber,
        buildBlockProof,
        blockNumber,
        timestamp,
        bufferToHex(transactionsRoot),
        bufferToHex(receiptsRoot),
        bufferToHex(receipt),
        bufferToHex(rlp.encode(receiptParentNodes)),
        bufferToHex(Buffer.concat([Buffer.from('00', 'hex'), path])),
        logIndex,
      ])
    );
  }

  async _findHeaderBlockNumber(
    scanStart: number,
    scanEnd: number,
    eventLogs?: ethers.providers.Log[]
  ): Promise<void> {
    let piIndex = 0;
    let logs = eventLogs;
    if (!logs) {
      if (!scanStart) {
        // TODO: Find start eth block by timestamp
        throw new Error('Historical scan not yet mplemented');
      }
      const filter = {
        ...this.checkPointManager.filters.NewHeaderBlock(),
        fromBlock: scanStart,
        toBlock: scanEnd + 1000,
      };
      logs = await this.checkPointManager.provider.getLogs(filter);
    }

    const pendingItems = this.localStorageItems.pendingItems;

    for (const log of logs) {
      const parsed = this.checkPointManager.interface.parseLog(log);
      while (
        piIndex < pendingItems.length &&
        pendingItems[piIndex].txBlockNumber <= parsed.args.end
      ) {
        if (
          !pendingItems[piIndex].headerBlockId &&
          pendingItems[piIndex].txBlockNumber >= parsed.args.start
        ) {
          pendingItems[piIndex].headerBlockId =
            parsed.args.headerBlockId.toNumber();
          this.changed = true;
        }
        ++piIndex;
      }
      if (piIndex >= pendingItems.length) break;
    }
    if (piIndex >= pendingItems.length) {
      this.checkPointManager.provider.off(
        this.newBlockFilter,
        this._onNewHeaderBlock
      );
    }

    if (this.changed) {
      this.localStorageItems.ethLastHeaderScanned =
        logs[logs.length - 1].blockNumber;

      window.localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(this.localStorageItems)
      );
      this.changeHandler();
      this.changed = false;
    }
  }

  async _buildBlockProof(
    start: number,
    end: number,
    blockNumber: number
  ): Promise<string> {
    const proof = await this._getFastMerkleProof(start, end, blockNumber);

    return bufferToHex(
      Buffer.concat(
        proof.map(function (p) {
          return toBuffer(p);
        })
      )
    );
  }

  async _getFastMerkleProof(
    start: number,
    end: number,
    blockNumber: number
  ): Promise<(string | Buffer)[]> {
    const merkleTreeDepth = Math.ceil(Math.log2(end - start + 1));
    const reversedProof = [];
    const offset = start;
    const targetIndex = blockNumber - offset;
    let leftBound = 0;
    let rightBound = end - offset;
    let depth = 0;

    while (depth < merkleTreeDepth) {
      let newLeftBound: number,
        newRightBound: number,
        expectedHeight: number,
        subTreeHeight: number,
        heightDifference: number,
        remainingNodesHash: Buffer;

      const nLeaves = Math.pow(2, merkleTreeDepth - depth);
      const pivotLeaf = leftBound + nLeaves / 2 - 1;
      if (!(targetIndex > pivotLeaf)) {
        newRightBound = Math.min(rightBound, pivotLeaf);
        expectedHeight = merkleTreeDepth - (depth + 1);
        if (!(rightBound <= pivotLeaf)) {
          subTreeHeight = Math.ceil(Math.log2(rightBound - pivotLeaf));
          heightDifference = expectedHeight - subTreeHeight;
          remainingNodesHash = await this._queryRootHash(
            offset + pivotLeaf + 1,
            offset + rightBound
          );
          // The remaining leaves will hold the merkle root of a zero-filled tree of height subTreeHeight
          const leafRoots_1 = this._recursiveZeroHash(subTreeHeight);
          const leaves = Array.from(
            { length: Math.pow(2, heightDifference) },
            function () {
              return toBuffer(leafRoots_1);
            }
          );
          leaves[0] = remainingNodesHash;
          const subTreeMerkleRoot = new MerkleTree(leaves).getRoot();
          reversedProof.push(subTreeMerkleRoot);
        } else {
          const subTreeMerkleRoot = this._recursiveZeroHash(expectedHeight);
          reversedProof.push(subTreeMerkleRoot);
        }
        rightBound = newRightBound;
      } else {
        newLeftBound = pivotLeaf + 1;
        const subTreeMerkleRoot = await this._queryRootHash(
          offset + leftBound,
          offset + pivotLeaf
        );
        reversedProof.push(subTreeMerkleRoot);
        leftBound = newLeftBound;
      }
      depth += 1;
    }
    return reversedProof.reverse();
  }

  async _queryRootHash(start: number, end: number): Promise<Buffer> {
    return toBuffer(
      '0x' + (await this.provider.send('eth_getRootHash', [start, end]))
    );
  }

  _recursiveZeroHash(n: number): string | Buffer {
    if (n === 0)
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    const subHash = this._recursiveZeroHash(n - 1);
    return keccak256(
      toBuffer(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32'],
          [subHash, subHash]
        )
      )
    );
  }

  async _getReceiptProof(
    receipt: ethers.providers.TransactionReceipt,
    block: RawBlock
  ): Promise<Record<string, unknown>> {
    const stateSyncTxHash = bufferToHex(this._getStateSyncTxHash(block));
    const receiptsTrie = new BaseTrie();
    const receiptPromises: Promise<ethers.providers.TransactionReceipt>[] = [];

    for (const tx of block.transactions) {
      if (tx.hash !== stateSyncTxHash) {
        receiptPromises.push(this.provider.getTransactionReceipt(tx.hash));
      }
    }
    const receipts = await Promise.all(receiptPromises);

    for (const siblingReceipt of receipts) {
      const path = rlp.encode(siblingReceipt.transactionIndex);
      const rawReceipt = this._getReceiptBytes(siblingReceipt);

      await receiptsTrie.put(path, rawReceipt);
    }

    const path = await receiptsTrie.findPath(
      rlp.encode(receipt.transactionIndex)
    );
    if (!path.node || path.remaining.length > 0)
      throw new Error('findpath failed');
    return {
      blockHash: toBuffer(receipt.blockHash),
      parentNodes: path.stack.map(function (s) {
        return s.raw();
      }),
      root: this._getRawHeader(block).receiptTrie as Buffer,
      path: rlp.encode(receipt.transactionIndex),
      value: rlp.decode(path.node.value),
    };
  }

  _getReceiptBytes(receipt: ethers.providers.TransactionReceipt): Buffer {
    let encodedData = rlp.encode([
      toBuffer(
        receipt.status !== undefined && receipt.status != null
          ? receipt.status
            ? '0x1'
            : '0x'
          : receipt.root
      ),
      toBuffer(receipt.cumulativeGasUsed.toNumber()),
      toBuffer(receipt.logsBloom),
      // encoded log array
      receipt.logs.map(function (l) {
        // [address, [topics array], data]
        return [toBuffer(l.address), l.topics.map(toBuffer), toBuffer(l.data)];
      }),
    ]);
    if (receipt.status !== undefined && receipt.type !== 0) {
      encodedData = Buffer.concat([
        toBuffer('0x' + receipt.type.toString(16)),
        encodedData,
      ]);
    }
    return encodedData;
  }

  _getStateSyncTxHash(block: RawBlock): Buffer {
    return keccak256(
      Buffer.concat([
        toBuffer(fromUtf8('matic-bor-receipt-')),
        setLengthLeft(toBuffer(block.number), 8),
        toBuffer(block.hash),
      ])
    );
  }

  _getRawHeader(block: RawBlock): BlockHeader {
    return blockHeaderFromRpc(block);
  }
}
