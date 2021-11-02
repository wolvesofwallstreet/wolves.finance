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

import '../vm/CommonOffchain.sol';

import './Filesystem.sol';

interface Callback {
  function solved(uint256 taskId, bytes32[] memory files) external;

  function rejected(uint256 taskId) external;
}

contract TaskManager is Context, CommonOffchain {
  //////////////////////////////////////////////////////////////////////////////
  // Types
  //////////////////////////////////////////////////////////////////////////////

  enum CodeType {
    WAST,
    WASM,
    INTERNAL
  }

  enum StorageType {
    IPFS,
    BLOCKCHAIN
  }

  struct RequiredFile {
    bytes32 nameHash;
    StorageType fileStorage;
    bytes32 fileId;
  }

  struct IO {
    bytes32 name;
    bytes32 size;
    bytes32 data;
    uint256[] uploadIndexes;
  }

  struct VMParameters {
    uint8 stackSize;
    uint8 memorySize;
    uint8 callSize;
    uint8 globalsSize;
    uint8 tableSize;
  }

  struct Task {
    address giver;
    bytes32 initHash; // Includes code and input roots, the output should be similar
    string stor;
    CodeType codeType;
    StorageType storageType;
    uint256 state;
    address solver;
    bytes32 resultHash;
    bytes32 outputFile;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  Filesystem private immutable _fs;

  Task[] private _tasks;
  VMParameters[] private _params;
  IO[] private _ioRoots;
  RequiredFile[] private _uploads;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  event TaskPosted(
    uint256 taskId,
    address taskGiver,
    bytes32 initHash,
    CodeType codeType,
    StorageType storageType,
    string stor
  );

  event TaskSolved(
    uint256 taskId,
    bytes32 resultHash,
    bytes32 initHash,
    CodeType codeType,
    StorageType storageType,
    string stor,
    address solver
  );

  event TaskFinalized(uint256 taskId);

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(address fileSystem) {
    _fs = Filesystem(fileSystem);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Task accessors
  //////////////////////////////////////////////////////////////////////////////

  function taskInfo(uint256 unq)
    public
    view
    returns (
      uint256 taskId,
      address giver,
      bytes32 initHash,
      CodeType codeType,
      StorageType storageType,
      string memory stor
    )
  {
    Task storage t = _tasks[unq];
    return (unq, t.giver, t.initHash, t.codeType, t.storageType, t.stor);
  }

  function getVMParameters(uint256 taskId)
    public
    view
    returns (
      uint8 stack,
      uint8 mem,
      uint8 globals,
      uint8 table,
      uint8 call
    )
  {
    VMParameters storage param = _params[taskId];
    stack = param.stackSize;
    mem = param.memorySize;
    globals = param.globalsSize;
    table = param.tableSize;
    call = param.callSize;
  }

  function getUploadNames(uint256 taskId)
    public
    view
    returns (bytes32[] memory)
  {
    uint256[] storage uploadIndexes = _ioRoots[taskId].uploadIndexes;
    bytes32[] memory arr = new bytes32[](uploadIndexes.length);

    for (uint256 i = 0; i < arr.length; i++) {
      arr[i] = _uploads[uploadIndexes[i]].nameHash;
    }

    return arr;
  }

  function getUploadTypes(uint256 taskId)
    public
    view
    returns (StorageType[] memory)
  {
    uint256[] storage uploadIndexes = _ioRoots[taskId].uploadIndexes;
    StorageType[] memory arr = new StorageType[](uploadIndexes.length);

    for (uint256 i = 0; i < arr.length; i++) {
      arr[i] = _uploads[uploadIndexes[i]].fileStorage;
    }

    return arr;
  }

  function nextTask() public view returns (uint256) {
    return _tasks.length;
  }

  function getSolver(uint256 taskId) public view returns (address) {
    return _tasks[taskId].solver;
  }

  function solutionInfo(uint256 unq)
    public
    view
    returns (
      uint256 taskId,
      bytes32 initHash,
      bytes32 resultHash,
      CodeType codeType,
      StorageType storageType,
      string memory stor,
      address solver
    )
  {
    Task storage t = _tasks[unq];

    return (
      unq,
      t.initHash,
      t.resultHash,
      t.codeType,
      t.storageType,
      t.stor,
      t.solver
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Task mutators
  //////////////////////////////////////////////////////////////////////////////

  function add(
    bytes32 initHash,
    CodeType codeType,
    StorageType storageType,
    string memory stor
  ) public returns (uint256) {
    uint256 taskId = _tasks.length;

    // Add task
    _tasks.push(
      Task({
        giver: _msgSender(),
        initHash: initHash,
        stor: stor,
        codeType: codeType,
        storageType: storageType,
        state: uint256(0),
        solver: address(0),
        resultHash: bytes32(0),
        outputFile: bytes32(0)
      })
    );

    // Add params
    _params.push(
      VMParameters({
        stackSize: 14, // 16 KiB
        memorySize: 16, // 64 KiB
        callSize: 10, // 1 KiB
        globalsSize: 8, // 512 B
        tableSize: 8 // 512 B
      })
    );

    // Add IO roots
    _ioRoots.push(
      IO({
        name: bytes32(0),
        size: bytes32(0),
        data: bytes32(0),
        uploadIndexes: new uint256[](0)
      })
    );

    commit(taskId);

    return taskId;
  }

  function commit(uint256 taskId) public {
    Task storage t1 = _tasks[taskId];

    // Validate access
    require(_msgSender() == t1.giver);

    // Dispatch event
    emit TaskPosted(
      taskId,
      t1.giver,
      t1.initHash,
      t1.codeType,
      t1.storageType,
      t1.stor
    );
  }

  function addWithParameters(
    bytes32 initHash,
    CodeType codeType,
    StorageType storageType,
    string memory stor,
    uint8 stack,
    uint8 mem,
    uint8 globals,
    uint8 table,
    uint8 call
  ) public returns (uint256) {
    uint256 taskId = _tasks.length;

    // Add task
    _tasks.push(
      Task({
        giver: _msgSender(),
        initHash: initHash,
        stor: stor,
        codeType: codeType,
        storageType: storageType,
        state: uint256(0),
        solver: address(0),
        resultHash: bytes32(0),
        outputFile: bytes32(0)
      })
    );

    // Add params
    _params.push(
      VMParameters({
        stackSize: stack,
        memorySize: mem,
        callSize: call,
        globalsSize: globals,
        tableSize: table
      })
    );

    // Add IO roots
    _ioRoots.push(
      IO({
        name: bytes32(0),
        size: bytes32(0),
        data: bytes32(0),
        uploadIndexes: new uint256[](0)
      })
    );

    // Dispatch event
    emit TaskPosted(
      taskId,
      _msgSender(),
      initHash,
      codeType,
      storageType,
      stor
    );

    return taskId;
  }

  // Make sure they won't be required after the task has been posted already
  function requireFile(
    uint256 taskId,
    bytes32 hash,
    StorageType storageType
  ) public {
    Task storage t1 = _tasks[taskId];

    // Validate access
    require(_msgSender() == t1.giver);

    IO storage io = _ioRoots[taskId];

    uint256 nextUploadIndex = _uploads.length;
    _uploads.push(RequiredFile(hash, storageType, 0));
    io.uploadIndexes.push(nextUploadIndex);
  }

  function solve(uint256 taskId) public returns (bool) {
    Task storage t = _tasks[taskId];
    IO storage io = _ioRoots[taskId];

    // Validate state
    require(t.solver == address(0));

    VMParameters storage params = _params[taskId];

    setStackSize(params.stackSize);
    setMemorySize(params.memorySize);
    setGlobalsSize(params.globalsSize);
    setCallStackSize(params.callSize);
    setCallTableSize(params.tableSize);
    // TODO: setCallTypesSize()?
    //_roots.inputSize.length = roots[6]; // TODO

    /* TODO
    while (
      bytes32(_roots.code[_vm.pc]) !=
      0x0000000000000000000000000000000000000000040006060001000106000000
    ) {
      performPhase();
      limit--;
    }
    */

    // Update state
    /* TODO
    io.size = size;
    io.name = name;
    io.data = data;
    */
    t.solver = _msgSender();
    //t.resultHash = keccak256(abi.encodePacked(code, size, name, data));
    t.state = 1;

    // Dispatch event
    emit TaskSolved(
      taskId,
      t.resultHash,
      t.initHash,
      t.codeType,
      t.storageType,
      t.stor,
      t.solver
    );

    // Update state
    finalizeTask(taskId);

    return true;
  }

  function solveIO(
    uint256 taskId,
    bytes32 code,
    bytes32 size,
    bytes32 name,
    bytes32 data
  ) public returns (bool) {
    Task storage t = _tasks[taskId];
    IO storage io = _ioRoots[taskId];

    // Validate state
    require(t.solver == address(0));

    // Update state
    io.size = size;
    io.name = name;
    io.data = data;
    t.solver = _msgSender();
    t.resultHash = keccak256(abi.encodePacked(code, size, name, data));
    t.state = 1;

    // Dispatch event
    emit TaskSolved(
      taskId,
      t.resultHash,
      t.initHash,
      t.codeType,
      t.storageType,
      t.stor,
      t.solver
    );

    return true;
  }

  /*
  function uploadFile(
    uint256 taskId,
    uint256 num,
    bytes32 fileId,
    bytes32[] nameProof,
    bytes32[] dataProof,
    uint256 fileNum
  ) public returns (bool) {
    IO storage io = _ioRoots[taskId];
    RequiredFile storage file = io.uploads[num];

    if (
      !iactive.checkProof(fs.getRoot(fileId), io.data, dataProof, fileNum) ||
      !iactive.checkProof(fs.getNameHash(fileId), io.name, nameProof, fileNum)
    ) return false;
    require(
      iactive.checkProof(fs.getRoot(fileId), io.data, dataProof, fileNum)
    );
    require(
      iactive.checkProof(fs.getNameHash(fileId), io.name, nameProof, fileNum)
    );

    file.fileId = fileId;
    return true;
  }
  */

  //////////////////////////////////////////////////////////////////////////////
  // Implementation details
  //////////////////////////////////////////////////////////////////////////////

  function finalizeTask(uint256 taskId) private returns (bool) {
    Task storage t = _tasks[taskId];
    IO storage io = _ioRoots[taskId];

    /*
    if (
      t.state != 1 ||
      t.blocked >= block.number ||
      iactive.isRejected(taskId) ||
      iactive.blockedTime(taskId) >= block.number
    ) return false;
    // if (!(t.state == 1 && t2.blocked < block.number && !iactive.isRejected(taskId) && iactive.blockedTime(taskId) < block.number)) return false;

    // require(t.state == 1 && t2.blocked < block.number && !iactive.isRejected(taskId) && iactive.blockedTime(taskId) < block.number);
    */
    t.state = 3;

    bytes32[] memory files = new bytes32[](io.uploadIndexes.length);
    for (uint256 i = 0; i < io.uploadIndexes.length; i++) {
      if (_uploads[io.uploadIndexes[i]].fileId == 0) return false;
      // require(_uploads[io.uploadIndexes[i]].fileId != 0);
      files[i] = _uploads[io.uploadIndexes[i]].fileId;
    }

    // Invoke callback
    if (files.length > 0) {
      Callback(t.giver).solved(taskId, files);
    }

    // Dispatch event
    emit TaskFinalized(taskId);

    return true;
  }
}
