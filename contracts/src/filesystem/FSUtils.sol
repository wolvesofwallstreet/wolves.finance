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

contract FSUtils {
  //////////////////////////////////////////////////////////////////////////////
  // Internal interface
  //////////////////////////////////////////////////////////////////////////////

  function idToString(bytes32 id) internal pure returns (string memory) {
    bytes memory res = new bytes(64);
    for (uint256 i = 0; i < 64; i++)
      res[i] = bytes1(uint8(((uint256(id) / (2**(4 * i))) & 0xf) + 65));
    return string(res);
  }

  function makeMerkle(
    bytes memory arr,
    uint256 idx,
    uint256 level
  ) internal pure returns (bytes32) {
    if (level == 0) return idx < arr.length ? bytes32(arr[idx]) : bytes32(0);
    else
      return
        keccak256(
          abi.encodePacked(
            makeMerkle(arr, idx, level - 1),
            makeMerkle(arr, idx + (2**(level - 1)), level - 1)
          )
        );
  }

  function calcMerkle(
    bytes32[] memory arr,
    uint256 idx,
    uint256 level
  ) internal returns (bytes32) {
    if (level == 0) return idx < arr.length ? arr[idx] : bytes32(0);
    else
      return
        keccak256(
          abi.encodePacked(
            calcMerkle(arr, idx, level - 1),
            calcMerkle(arr, idx + (2**(level - 1)), level - 1)
          )
        );
  }

  // Assume 256 bytes?
  function hashName(string memory name) internal pure returns (bytes32) {
    return makeMerkle(bytes(name), 0, 8);
  }
}
