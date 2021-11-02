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

pragma solidity 0.7.6;

import '../../0xerc1155/utils/Context.sol';

import './Filesystem.sol';
import './FSUtils.sol';
import './TaskManager.sol';

contract IPFS is Context, FSUtils {
  //////////////////////////////////////////////////////////////////////////////
  // Types
  //////////////////////////////////////////////////////////////////////////////

  struct Task {
    bytes32 root;
    uint256 startBlock;
    uint256 endBlock;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  uint256 private _nonce;
  TaskManager private _taskManager;
  Filesystem private _filesystem;

  // Address for wasm file in IPFS
  string private _codeAddress;

  // The canonical hash
  bytes32 private _initHash;

  mapping(string => bytes32) private _stringToFile;

  mapping(uint256 => Task) private _taskInfo;
  mapping(bytes32 => uint256) private _rootToTask;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(
    address taskManager,
    address filesystem,
    string memory codeAddress,
    bytes32 initHash
  ) {
    // Initialize state
    _taskManager = TaskManager(taskManager);
    _filesystem = Filesystem(filesystem);
    _codeAddress = codeAddress;
    _initHash = initHash;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public accessors
  //////////////////////////////////////////////////////////////////////////////

  // Resolves IPFS hash to TaskManager file
  function load(string memory ipfshash)
    public
    view
    returns (bytes32 hash, uint256 size)
  {
    hash = _filesystem.getRoot(_stringToFile[ipfshash]);
    size = _filesystem.getByteSize(_stringToFile[ipfshash]);
  }

  // Check if is still processing the file
  function clock(bytes32 root) public view returns (uint256) {
    Task storage t = _taskInfo[_rootToTask[root]];

    if (t.endBlock > 0) {
      return t.endBlock;
    } else if (t.startBlock > 0) {
      return block.number;
    } else {
      return 0;
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public mutators
  //////////////////////////////////////////////////////////////////////////////

  // The block should be a file that is available on-chain
  function submitBlock(bytes32 fileId) public {
    uint256 num = _nonce;
    _nonce++;

    bytes32 bundle = _filesystem.makeBundle(_msgSender(), num);
    _filesystem.addToBundle(bundle, fileId);

    bytes32[] memory empty = new bytes32[](0);
    _filesystem.addToBundle(
      bundle,
      _filesystem.createFileWithContents(
        'output.data',
        num + 1000000000,
        empty,
        0
      )
    );
    _filesystem.finalizeBundleIPFS(bundle, _codeAddress, _initHash);

    uint256 task = _taskManager.addWithParameters(
      _filesystem.getInitHash(bundle),
      TaskManager.CodeType.WASM,
      TaskManager.StorageType.BLOCKCHAIN,
      idToString(bundle),
      20,
      20,
      8,
      20,
      10
    );
    _taskManager.requireFile(
      task,
      hashName('output.data'),
      TaskManager.StorageType.BLOCKCHAIN
    );
    _taskManager.commit(task);

    bytes32 root = _filesystem.getRoot(fileId);
    _taskInfo[task].root = root;
    _taskInfo[task].startBlock = block.number;
    _rootToTask[root] = task;
  }

  function solved(uint256 id, bytes32[] memory files) public {
    // Validate access
    require(_msgSender() == address(_taskManager));

    // Update state
    Task storage t = _taskInfo[id];
    string memory ihash = string(_filesystem.getByteData(files[0]));
    _stringToFile[ihash] = t.root;
    t.endBlock = block.number;
  }
}
