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

import './IPFS.sol';

contract IPFSLoad {
  //////////////////////////////////////////////////////////////////////////////
  // Types
  //////////////////////////////////////////////////////////////////////////////

  struct Task {
    address solver;
    address verifier;
    bytes32 nameHash;
    string ipfsCid;
    bytes32 ipfsBlock;
    uint256 ipfsSize;
    uint256 clock;
    bool resolved;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  IPFS private _ipfs;

  uint256 private _uniq;

  mapping(bytes32 => Task) private _tasks;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  event LoadingToIPFS(bytes32 taskId, bytes32 state);

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(address ipfs) {
    _ipfs = IPFS(ipfs);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public interface
  //////////////////////////////////////////////////////////////////////////////

  // Initializes a new custom verification game
  // State will include IPFS hash as a base58 string
  function init(
    bytes32 state,
    uint256 stateSize,
    uint256, /* r3 */
    address solver,
    address verifier
  ) public {
    // Encode parameters
    bytes32 taskId = keccak256(
      abi.encodePacked(state, stateSize, solver, verifier, _uniq++)
    );

    // Update state
    Task storage t = _tasks[taskId];
    t.solver = solver;
    t.verifier = verifier;
    t.nameHash = state;
    t.clock = block.number;

    // Dispatch event
    emit LoadingToIPFS(taskId, state);
  }

  // Last time the task was updated
  function clock(bytes32 taskId) public view returns (uint256) {
    Task storage t = _tasks[taskId];

    if (t.ipfsBlock != 0) {
      return _ipfs.clock(t.ipfsBlock);
    }

    return t.clock;
  }

  function resolveName(
    bytes32 taskId,
    string memory ipfsCid,
    uint256 sz
  ) public {
    // Load state
    Task storage t = _tasks[taskId];

    // Encode and validate parameters
    bytes32 name = fileMerkle(arrange(bytes(ipfsCid)), 0, sz);
    require(name == t.nameHash);

    // Update state
    t.ipfsCid = ipfsCid;

    // Load state
    bytes32 blockHash;
    uint256 blockSize;
    (blockHash, blockSize) = _ipfs.load(t.ipfsCid);

    // Validate state
    require(blockHash == t.ipfsBlock && blockSize == t.ipfsSize);

    // Update state
    t.resolved = true;
  }

  function resolveBlock(
    bytes32 taskId,
    bytes32 blockHash,
    uint256 blockSize
  ) public {
    Task storage t = _tasks[taskId];
    t.ipfsBlock = blockHash;
    t.ipfsSize = blockSize;
  }

  // Check if has resolved into correct state: merkle root of output data and output size
  function resolved(
    bytes32 taskId,
    bytes32 state,
    uint256 size
  ) public view returns (bool) {
    Task storage t = _tasks[taskId];
    return t.ipfsBlock == state && t.ipfsSize == size && t.resolved;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation details
  //////////////////////////////////////////////////////////////////////////////

  function arrange(bytes memory str) private pure returns (bytes32[] memory) {
    bytes32[] memory res = new bytes32[]((str.length + 31) / 32);
    uint256 ptr = 0;
    for (uint256 i = 0; i < res.length; i++) {
      uint256 word = 0;
      for (uint256 j = 0; j < 32; j++) {
        word = 256 * word; // shift byte
        if (ptr < str.length) word = word | uint256(bytes32(str[ptr]));
        ptr++;
      }
      res[i] = bytes32(word);
    }
    return res;
  }

  function fileMerkle(
    bytes32[] memory arr,
    uint256 idx,
    uint256 level
  ) private returns (bytes32) {
    if (level == 0) {
      return
        idx < arr.length
          ? keccak256(
            abi.encodePacked(bytes16(arr[idx]), uint128(bytes16(arr[idx])))
          )
          : keccak256(abi.encodePacked(bytes16(0), bytes16(0)));
    } else {
      return
        keccak256(
          abi.encodePacked(
            fileMerkle(arr, idx, level - 1),
            fileMerkle(arr, idx + (2**(level - 1)), level - 1)
          )
        );
    }
  }
}
