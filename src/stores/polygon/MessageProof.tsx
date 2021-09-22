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
  tokenId: string;
  txHash: string; // Child chain TX hash
  txBlockNumber: number; // Child chain block number
  account: string;
  pending: boolean;
};

type CB_FUNC = (accounts: Set<string>) => void;

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

export class MessageProof {
  provider: ethers.providers.WebSocketProvider;
  checkPointManager: ethers.Contract;
  localStorageKey: string;
  pendingItems: PendingItem[] = [];
  newBlockFilter: ethers.EventFilter;
  changeHandler?: CB_FUNC;

  static LSKMUMBAI = 'mumbai_goerli_bridge';
  static LSKMATIC = 'matic_mainnet_bridge';

  constructor(
    ethereumProvider: ethers.providers.Provider,
    chainId: number,
    cb: CB_FUNC
  ) {
    if (chainId === 5) {
      this.provider = new ethers.providers.WebSocketProvider(
        'wss://ws-matic-mumbai.chainstacklabs.com'
      );
      this.checkPointManager = new ethers.Contract(
        '0x2890bA17EfE978480615e330ecB65333b880928e',
        CPM_ABI,
        ethereumProvider
      );
      this.localStorageKey = MessageProof.LSKMUMBAI;
    } else if (chainId === 1) {
      this.provider = new ethers.providers.WebSocketProvider(
        'wss://polygon-rpc.com/'
      );
      this.checkPointManager = new ethers.Contract(
        '0x86e4dc95c7fbdbf52e33d563bbdb00823894c287',
        CPM_ABI,
        ethereumProvider
      );
      this.localStorageKey = MessageProof.LSKMATIC;
    } else {
      this.localStorageKey = '';
      throw new Error('Unsupported chainId');
    }

    const items = window.localStorage.getItem(this.localStorageKey);
    this.pendingItems = [];
    if (items) this.pendingItems = JSON.parse(items);

    this.newBlockFilter = this.checkPointManager.filters.NewHeaderBlock();

    this._setup(cb);
  }

  static async insertItem(
    account: string,
    chainId: number,
    tokenId: ethers.BigNumber,
    receipt: ethers.providers.TransactionReceipt
  ): Promise<void> {
    const localStorageId =
      chainId === 80001
        ? MessageProof.LSKMUMBAI
        : chainId === 137
        ? MessageProof.LSKMATIC
        : '';
    if (localStorageId) {
      const infuranetwork = chainId === 80001 ? 'goerli' : 'mainnet';
      const provider = new ethers.providers.JsonRpcProvider(
        `https://${infuranetwork}.infura.io/v3/${process.env.REACT_APP_INFURA_ID}`
      );
      const items = window.localStorage.getItem(localStorageId);
      const pIs: PendingItem[] = items ? JSON.parse(items) : [];
      pIs.push({
        rootBlock: await provider.getBlockNumber(),
        headerBlockId: 0,
        tokenId: tokenId.toHexString(),
        txHash: receipt.transactionHash,
        txBlockNumber: receipt.blockNumber,
        account,
        pending: false,
      });
      window.localStorage.setItem(localStorageId, JSON.stringify(pIs));
    }
  }

  removeItem(tokenId: ethers.BigNumber): void {
    if (this.localStorageKey) {
      const tokenIdHex = tokenId.toHexString();
      this.pendingItems = this.pendingItems.filter(
        (elem) => elem.tokenId !== tokenIdHex
      );
      window.localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(this.pendingItems)
      );
    }
  }

  getTokenIds(
    account: string
  ): { tokenId: ethers.BigNumber; available: boolean }[] {
    return this.pendingItems
      .filter(
        (item) => !item.pending && (!item.account || item.account === account)
      )
      .map((item) => {
        return {
          tokenId: ethers.BigNumber.from(item.tokenId),
          available: item.headerBlockId > 0,
        };
      });
  }

  _onNewHeaderBlock = (result: ethers.providers.Log): void => {
    this._findHeaderBlockNumber(0, 0, [result]);
  };

  _setup = async (cb: CB_FUNC): Promise<void> => {
    if (this.pendingItems.length > 0) {
      // Get the last ChildBlock in checkPointManager
      const lastChildBlock = (
        (await this.checkPointManager.getLastChildBlock()) as ethers.BigNumber
      ).toNumber();

      // Run throu pendingItems and look which are ready
      let scanHeaderFrom,
        scanHeaderTo = 0;
      for (const pI of this.pendingItems) {
        if (!pI.headerBlockId) {
          if (pI.txBlockNumber <= lastChildBlock) {
            if (!scanHeaderFrom) scanHeaderFrom = pI.rootBlock;
            scanHeaderTo = pI.rootBlock;
          }
        }
      }
      if (scanHeaderFrom) {
        await this._findHeaderBlockNumber(scanHeaderFrom, scanHeaderTo);
      }
      if (
        this.pendingItems[this.pendingItems.length - 1].txBlockNumber >
        lastChildBlock
      ) {
        this.checkPointManager.provider.on(
          this.newBlockFilter,
          this._onNewHeaderBlock
        );
      }
    }
    this.changeHandler = cb;
  };

  processPending(tokenId: ethers.BigNumber): Promise<string> {
    const tokenIdHex = tokenId.toHexString();
    const item = this.pendingItems.find((item) => item.tokenId === tokenIdHex);
    if (!item || !item.headerBlockId) throw new Error('TokenId invalid');
    item.pending = true;

    return this.buildPayloadForExit(item.headerBlockId, item.txHash);
  }

  resetPending(tokenId: ethers.BigNumber): void {
    const tokenIdHex = tokenId.toHexString();
    const item = this.pendingItems.find((item) => item.tokenId === tokenIdHex);
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
    const changedAccounts: Set<string> = new Set();
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

    for (const log of logs) {
      const parsed = this.checkPointManager.interface.parseLog(log);
      while (
        piIndex < this.pendingItems.length &&
        this.pendingItems[piIndex].txBlockNumber <= parsed.args.end
      ) {
        if (
          !this.pendingItems[piIndex].headerBlockId &&
          this.pendingItems[piIndex].txBlockNumber >= parsed.args.start
        ) {
          this.pendingItems[piIndex].headerBlockId =
            parsed.args.headerBlockId.toNumber();
          changedAccounts.add(this.pendingItems[piIndex].account);
        }
        ++piIndex;
      }
      if (piIndex >= this.pendingItems.length) break;
    }
    if (piIndex >= this.pendingItems.length) {
      this.checkPointManager.provider.off(
        this.newBlockFilter,
        this._onNewHeaderBlock
      );
    }
    if (changedAccounts.size > 0) {
      window.localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(this.pendingItems)
      );
      if (this.changeHandler) this.changeHandler(changedAccounts);
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
