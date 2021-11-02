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

import './interfaces/IConsumer.sol';

contract Filesystem is Context {
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  bytes32 public constant EMPTY_FILE =
    0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563;

  //////////////////////////////////////////////////////////////////////////////
  // Types
  //////////////////////////////////////////////////////////////////////////////

  struct File {
    uint256 byteSize;
    string name;
    bytes32[] data;
    string ipfsCid;
    bytes32 root;
  }

  // Used to build IO blocks
  struct Bundle {
    bytes32 nameFile;
    bytes32 dataFile;
    bytes32 sizeFile;
    uint256 pointer;
    address code;
    string codeFileCid;
    bytes32 codeRoot; // TODO: Previously this param was called "init" for "initial hash"
    bytes32[] files;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  bytes32[20] private _zero;
  bytes32[20] private _zeroFiles;

  mapping(bytes32 => File) private _files;

  mapping(bytes32 => Bundle) private _bundles;

  // More efficient way to store data onchain in chunks
  mapping(bytes32 => uint256) private _chunks;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  event FileCreated(bytes32 fileId, string name, uint256 size);

  event AddedIPFSFile(
    bytes32 fileId,
    string fileName,
    uint256 fileSize,
    string cid
  );

  event BundleCreated(
    bytes32 bundleId,
    address code,
    bytes32 codeInit,
    bytes32 fileId
  );

  event AddedToBundle(bytes32 bundleId, bytes32 fileId);

  event BundleFinalized(bytes32 bundleId, string fileCid);

  event ChunkAdded(bytes32 hash, uint256 size);

  event ChunksCombined(bytes32 hash, uint256 size, uint256 partSize);

  event FileCreatedFromChunk(bytes32 fileId, string name, uint256 byteSize);

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor() {
    _zeroFiles[0] = EMPTY_FILE;
    for (uint256 i = 1; i < _zero.length; i++) {
      _zero[i] = keccak256(abi.encodePacked(_zero[i - 1], _zero[i - 1]));
      _zeroFiles[i] = keccak256(
        abi.encodePacked(_zeroFiles[i - 1], _zeroFiles[i - 1])
      );
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public utility functions
  //////////////////////////////////////////////////////////////////////////////

  // Assume 256 bytes?
  function hashName(string memory name) public pure returns (bytes32) {
    return _makeMerkle(bytes(name), 0, 8);
  }

  function calcId(address operator, uint256 nonce)
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(operator, nonce));
  }

  function makeBundle(address operator, uint256 num)
    public
    pure
    returns (bytes32)
  {
    bytes32 bundleId = keccak256(abi.encodePacked(operator, num));
    return bundleId;
  }

  //////////////////////////////////////////////////////////////////////////////
  // File accessors
  //////////////////////////////////////////////////////////////////////////////

  function getName(bytes32 fileId) public view returns (string memory) {
    return _files[fileId].name;
  }

  function getNameHash(bytes32 fileId) public view returns (bytes32) {
    return hashName(_files[fileId].name);
  }

  function getHash(bytes32 fileId) public view returns (string memory) {
    return _files[fileId].ipfsCid;
  }

  function getByteSize(bytes32 fileId) public view returns (uint256) {
    return _files[fileId].byteSize;
  }

  function getData(bytes32 fileId) public view returns (bytes32[] memory) {
    File storage f = _files[fileId];
    return f.data;
  }

  function getByteData(bytes32 fileId) public view returns (bytes memory) {
    File storage f = _files[fileId];
    bytes memory res = new bytes(f.byteSize);

    for (uint256 i = 0; i < f.data.length; i++) {
      bytes32 w = f.data[i];
      for (uint256 j = 0; j < 32; j++) {
        bytes1 b = bytes1(uint8((uint256(w) >> (8 * j))));
        if (i * 32 + j < res.length) res[i * 32 + j] = b;
      }
    }

    return res;
  }

  /*
  function forwardData(bytes32 fileId, address consumer) public {
    File storage f = _files[fileId];
    IConsumer(consumer).consume(fileId, f.data);
  }
  */

  function getRoot(bytes32 fileId) public view returns (bytes32) {
    File storage f = _files[fileId];
    return f.root;
  }

  function getLeaf(bytes32 fileId, uint256 loc) public view returns (bytes32) {
    File storage f = _files[fileId];
    return f.data[loc];
  }

  //////////////////////////////////////////////////////////////////////////////
  // Bundle accessors
  //////////////////////////////////////////////////////////////////////////////

  function getInitHash(bytes32 bundleId) public view returns (bytes32) {
    Bundle storage b = _bundles[bundleId];
    return b.codeRoot;
  }

  function getCode(bytes32 bundleId) public view returns (bytes memory) {
    Bundle storage b = _bundles[bundleId];
    return getCodeAtAddress(b.code);
  }

  function getIpfsCid(bytes32 bundleId) public view returns (string memory) {
    Bundle storage b = _bundles[bundleId];
    return b.codeFileCid;
  }

  function getFiles(bytes32 bundleId) public view returns (bytes32[] memory) {
    Bundle storage b = _bundles[bundleId];
    return b.files;
  }

  function getCodeAtAddress(address a) internal view returns (bytes memory) {
    uint256 len;
    // solhint-disable-next-line no-inline-assembly
    assembly {
      len := extcodesize(a)
    }

    bytes memory bs = new bytes(len);
    // solhint-disable-next-line no-inline-assembly
    assembly {
      extcodecopy(a, add(bs, 32), 0, len)
    }

    return bs;
  }

  //////////////////////////////////////////////////////////////////////////////
  // File mutators
  //////////////////////////////////////////////////////////////////////////////

  function createFileWithContents(
    string memory name,
    uint256 nonce,
    bytes32[] memory arr,
    uint256 sz
  ) public returns (bytes32) {
    // Encode parameters
    bytes32 fileId = calcId(_msgSender(), nonce);

    // Update state
    File storage f = _files[fileId];
    f.name = name;
    f.data = arr;
    _setByteSize(fileId, sz);
    uint256 size = 0;
    uint256 tmp = arr.length;
    while (tmp > 1) {
      size++;
      tmp = tmp / 2;
    }
    f.root = _fileMerkle(arr, 0, size);

    // Dispatch event
    emit FileCreated(fileId, name, sz);

    return fileId;
  }

  // The IPFS file should have same contents and name
  function addIPFSFile(
    string memory fileName,
    uint256 fileSize,
    string memory cid,
    bytes32 root,
    uint256 nonce
  ) public returns (bytes32) {
    // Encode parameters
    bytes32 fileId = calcId(_msgSender(), nonce);

    // Update state
    File storage f = _files[fileId];
    f.byteSize = fileSize;
    f.name = fileName;
    f.ipfsCid = cid;
    f.root = root;

    // Dispatch event
    emit AddedIPFSFile(fileId, fileName, fileSize, cid);

    return fileId;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Chunk mutators
  //////////////////////////////////////////////////////////////////////////////

  function addChunk(bytes32[] memory arr, uint256 size)
    public
    returns (bytes32)
  {
    // Validate parameters
    require(
      // TODO: Disabled in original code
      /* arr.length == 2**sz && */
      arr.length > 1
    );

    bytes32 hash = _fileMerkle(arr, 0, size);
    _chunks[hash] = size;

    emit ChunkAdded(hash, size);

    return hash;
  }

  function combineChunks(
    bytes32[] memory arr,
    uint256 partSize,
    uint256 size
  ) public {
    // Validate parameters
    require(arr.length == 2**size && arr.length > 1);
    for (uint256 i = 0; i < arr.length; i++) {
      require(_chunks[arr[i]] == partSize);
    }

    // Update state
    bytes32 hash = _calcMerkle(arr, 0, size);
    _chunks[hash] = size + partSize;

    // Dispatch event
    emit ChunksCombined(hash, size, partSize);
  }

  function fileFromChunk(
    string memory name,
    bytes32 chunk,
    uint256 size
  ) public returns (bytes32) {
    // Encode parameters
    bytes32 fileId = keccak256(abi.encodePacked(_msgSender(), chunk));

    // Validate parameters
    require(_chunks[chunk] != 0);

    // Update state
    File storage f = _files[fileId];
    f.byteSize = size;
    f.name = name;
    f.root = chunk;

    // Dispatch event
    emit FileCreatedFromChunk(fileId, name, size);

    return fileId;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Bundle mutators
  //////////////////////////////////////////////////////////////////////////////

  function makeSimpleBundle(
    uint256 num,
    address code,
    bytes32 codeInit,
    bytes32 fileId
  ) public returns (bytes32) {
    // Encode parameters
    bytes32 bundleId = calcId(_msgSender(), num);

    // Update state
    Bundle storage b = _bundles[bundleId];
    b.code = code;

    bytes32 res1 = bytes32(getByteSize(fileId));
    for (uint256 i = 0; i < 3; i++)
      res1 = keccak256(abi.encodePacked(res1, _zero[i]));

    bytes32 res2 = hashName(getName(fileId));
    for (uint256 i = 0; i < 3; i++)
      res2 = keccak256(abi.encodePacked(res2, _zero[i]));

    bytes32 res3 = getRoot(fileId);
    for (uint256 i = 0; i < 3; i++)
      res3 = keccak256(abi.encodePacked(res3, _zero[i]));

    b.codeRoot = keccak256(abi.encodePacked(codeInit, res1, res2, res3));

    b.files.push(fileId);

    // Dispatch event
    emit BundleCreated(bundleId, code, codeInit, fileId);

    return bundleId;
  }

  function addToBundle(bytes32 bundleId, bytes32 fileId) public {
    // Update state
    Bundle storage b = _bundles[bundleId];
    b.files.push(fileId);

    // Dispatch event
    emit AddedToBundle(bundleId, fileId);
  }

  function finalizeBundleIPFS(
    bytes32 bundleId,
    string memory fileCid,
    bytes32 codeRoot
  ) public {
    // Load state
    Bundle storage b = _bundles[bundleId];
    bytes32[] memory res1 = new bytes32[](b.files.length);
    bytes32[] memory res2 = new bytes32[](b.files.length);
    bytes32[] memory res3 = new bytes32[](b.files.length);

    for (uint256 i = 0; i < b.files.length; i++) {
      res1[i] = bytes32(getByteSize(b.files[i]));
      res2[i] = hashName(getName(b.files[i]));
      res3[i] = getRoot(b.files[i]);
    }

    // Update state
    b.codeFileCid = fileCid;
    b.codeRoot = keccak256(
      abi.encodePacked(
        codeRoot,
        _calcMerkle(res1, 0, 10),
        _calcMerkle(res2, 0, 10),
        _calcMerkleFiles(res3, 0, 10)
      )
    );

    // Dispatch event
    emit BundleFinalized(bundleId, fileCid);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal interface
  //////////////////////////////////////////////////////////////////////////////

  function _setByteSize(bytes32 fileId, uint256 sz) internal {
    _files[fileId].byteSize = sz;
  }

  function _makeMerkle(
    bytes memory arr,
    uint256 idx,
    uint256 level
  ) internal pure returns (bytes32) {
    if (level == 0) return idx < arr.length ? bytes32(arr[idx]) : bytes32(0);
    else
      return
        keccak256(
          abi.encodePacked(
            _makeMerkle(arr, idx, level - 1),
            _makeMerkle(arr, idx + (2**(level - 1)), level - 1)
          )
        );
  }

  function _calcMerkle(
    bytes32[] memory arr,
    uint256 idx,
    uint256 level
  ) internal view returns (bytes32) {
    if (level == 0) {
      return idx < arr.length ? arr[idx] : bytes32(0);
    } else if (idx >= arr.length) {
      return _zero[level];
    } else {
      return
        keccak256(
          abi.encodePacked(
            _calcMerkle(arr, idx, level - 1),
            _calcMerkle(arr, idx + (2**(level - 1)), level - 1)
          )
        );
    }
  }

  function _fileMerkle(
    bytes32[] memory arr,
    uint256 idx,
    uint256 level
  ) internal pure returns (bytes32) {
    if (level == 0) {
      // Base case
      return
        idx < arr.length
          ? keccak256(
            abi.encodePacked(bytes16(arr[idx]), uint128(bytes16(arr[idx])))
          )
          : keccak256(abi.encodePacked(bytes16(0), bytes16(0)));
    } else {
      // Visit children
      return
        keccak256(
          abi.encodePacked(
            _fileMerkle(arr, idx, level - 1),
            _fileMerkle(arr, idx + (2**(level - 1)), level - 1)
          )
        );
    }
  }

  function _calcMerkleFiles(
    bytes32[] memory arr,
    uint256 idx,
    uint256 level
  ) internal view returns (bytes32) {
    if (level == 0) {
      return idx < arr.length ? arr[idx] : EMPTY_FILE;
    } else if (idx >= arr.length) {
      return _zeroFiles[level];
    } else {
      return
        keccak256(
          abi.encodePacked(
            _calcMerkleFiles(arr, idx, level - 1),
            _calcMerkleFiles(arr, idx + (2**(level - 1)), level - 1)
          )
        );
    }
  }
}
