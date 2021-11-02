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

contract VMMemory {
  //////////////////////////////////////////////////////////////////////////////
  // Internal interface
  //////////////////////////////////////////////////////////////////////////////

  // a and b are integer values that represent 8 bytes each
  function toMemory(uint256 a, uint256 b)
    internal
    pure
    returns (uint8[] memory)
  {
    uint8[] memory arr = new uint8[](16);
    storeN(arr, 0, 8, a);
    storeN(arr, 8, 8, b);
    return arr;
  }

  function storeN(
    uint8[] memory mem,
    uint256 addr,
    uint256 n,
    uint256 v
  ) internal pure {
    for (uint256 i = 0; i < n; i++) {
      mem[addr + i] = uint8(v);
      v = v / 256;
    }
  }

  function loadN(
    uint8[] memory mem,
    uint256 addr,
    uint256 n
  ) internal pure returns (uint256) {
    uint256 res = 0;
    uint256 exp = 1;
    for (uint256 i = 0; i < n; i++) {
      res += mem[addr + i] * exp;
      exp = exp * 256;
    }
    return res;
  }

  function fromMemory(uint8[] memory mem)
    internal
    pure
    returns (uint256 a, uint256 b)
  {
    a = loadN(mem, 0, 8);
    b = loadN(mem, 8, 8);
  }

  function typeSize(uint256 ty) internal pure returns (uint256) {
    if (ty == 0) return 4;
    // I32
    else if (ty == 1) return 8;
    // I64
    else if (ty == 2) return 4;
    // F32
    else if (ty == 3) return 8; // F64

    revert('typeSize - Unreachable');
  }

  function store(
    uint8[] memory mem,
    uint256 addr,
    uint256 v,
    uint256 ty,
    uint256 packing
  ) internal pure {
    if (packing == 0) storeN(mem, addr, typeSize(ty), v);
    else {
      // Only integers can be packed, also cannot pack I32 to 32-bit?
      require(ty < 2 && !(ty == 0 && packing == 4));
      storeN(mem, addr, packing, v);
    }
  }

  function storeX(
    uint8[] memory mem,
    uint256 addr,
    uint256 v,
    uint256 hint
  ) internal pure {
    store(mem, addr, v, (hint / 2**3) & 0x3, hint & 0x7);
  }

  function load(
    uint8[] memory mem,
    uint256 addr,
    uint256 ty,
    uint256 packing,
    bool signExtend
  ) internal pure returns (uint256) {
    if (packing == 0) return loadN(mem, addr, typeSize(ty));
    else {
      require(ty < 2 && !(ty == 0 && packing == 4));
      uint256 res = loadN(mem, addr, packing);
      if (signExtend) {
        res =
          res |
          (uint256(-1) * 2**(8 * packing) * (res / 2**(8 * packing - 1)));
      }
      if (ty == 0) res = res % (2**32);
      else res = res % (2**64);
      return res;
    }
  }

  function loadX(
    uint8[] memory mem,
    uint256 addr,
    uint256 hint
  ) internal pure returns (uint256) {
    return
      load(mem, addr, (hint / 2**4) & 0x3, (hint / 2) & 0x7, hint & 0x1 == 1);
  }
}
