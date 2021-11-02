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

contract Onchain {
  //////////////////////////////////////////////////////////////////////////////
  // Types
  //////////////////////////////////////////////////////////////////////////////

  struct Roots {
    bytes32 code;
    bytes32 stack;
    bytes32 mem;
    bytes32 globals;
    bytes32 callTable;
    bytes32 callTypes;
    bytes32 callStack;
    bytes32 inputSize;
    bytes32 inputName;
    bytes32 inputData;
  }

  struct VM {
    uint256 pc;
    uint256 stackPtr;
    uint256 callPtr;
    uint256 memSize;
  }

  struct Machine {
    bytes32 vm;
    bytes32 op;
    uint256 reg1;
    uint256 reg2;
    uint256 reg3;
    uint256 ireg;
    bool exit;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  VM internal _vm;
  Roots internal _roots;
  Machine internal _machine;
  bytes32[] internal _proof;
  bytes32[] internal _proof2;

  bytes32 internal _state;

  uint256 private _debug; // TODO: Remove me
  bytes32 private _debugb; // TODO: Remove me

  //////////////////////////////////////////////////////////////////////////////
  // Internal interface
  //////////////////////////////////////////////////////////////////////////////

  function setVM(bytes32[10] memory roots, uint256[4] memory pointers)
    internal
  {
    _roots.code = roots[0];
    _roots.stack = roots[1];
    _roots.mem = roots[2];
    _roots.callStack = roots[3];
    _roots.globals = roots[4];
    _roots.callTable = roots[5];
    _roots.callTypes = roots[6];
    _roots.inputSize = roots[7];
    _roots.inputName = roots[8];
    _roots.inputData = roots[9];

    _vm.pc = pointers[0];
    _vm.stackPtr = pointers[1];
    _vm.callPtr = pointers[2];
    _vm.memSize = pointers[3];
  }

  function hashVM() internal view returns (bytes32) {
    bytes32[] memory arr = new bytes32[](14);
    arr[0] = _roots.code;
    arr[1] = _roots.mem;
    arr[2] = _roots.stack;
    arr[3] = _roots.globals;
    arr[4] = _roots.callStack;
    arr[5] = _roots.callTable;
    arr[6] = _roots.callTypes;
    arr[7] = _roots.inputSize;
    arr[8] = _roots.inputName;
    arr[9] = _roots.inputData;
    arr[10] = bytes32(_vm.pc);
    arr[11] = bytes32(_vm.stackPtr);
    arr[12] = bytes32(_vm.callPtr);
    arr[13] = bytes32(_vm.memSize);
    return keccak256(abi.encodePacked(arr));
  }

  function setMachine(
    bytes32 vm,
    bytes32 op,
    uint256 reg1,
    uint256 reg2,
    uint256 reg3,
    uint256 ireg
  ) internal {
    _machine.vm = vm;
    _machine.op = op;
    _machine.reg1 = reg1;
    _machine.reg2 = reg2;
    _machine.reg3 = reg3;
    _machine.ireg = ireg;
  }

  function hashMachine() internal view returns (bytes32) {
    return
      keccak256(
        abi.encodePacked(
          _machine.vm,
          _machine.op,
          _machine.reg1,
          _machine.reg2,
          _machine.reg3,
          _machine.ireg
        )
      );
  }

  function getLeaf(uint256 loc) internal view returns (uint256) {
    require(_proof.length >= 2);
    if (loc % 2 == 0) return uint256(_proof[0]);
    else return uint256(_proof[1]);
  }

  function setLeaf(uint256 loc, uint256 v) internal {
    require(_proof.length >= 2);
    if (loc % 2 == 0) _proof[0] = bytes32(v);
    else _proof[1] = bytes32(v);
  }

  function checkWriteAccess(
    uint256 loc,
    uint256 /* hint */
  ) internal view returns (bool) {
    require(_proof.length >= 2);
    for (uint256 i = 2; i < _proof.length; i++) {
      loc = loc / 2;
    }
    return loc < 2;
  }

  function checkInputDataAccess(
    uint256, /* loc2 */
    uint256 loc
  ) internal view returns (bool) {
    require(_proof2.length >= 2);
    for (uint256 i = 2; i < _proof2.length; i++) {
      loc = loc / 2;
    }
    return loc < 2;
  }

  function checkReadAccess(uint256 loc, uint256 hint)
    internal
    view
    returns (bool)
  {
    return checkWriteAccess(loc, hint);
  }

  function checkInputNameAccess(uint256 loc2, uint256 loc)
    internal
    view
    returns (bool)
  {
    return checkInputDataAccess(loc2, loc);
  }

  function getRoot(uint256 loc) internal view returns (bytes32) {
    require(_proof.length >= 2);
    bytes32 res = keccak256(abi.encodePacked(_proof[0], _proof[1]));
    for (uint256 i = 2; i < _proof.length; i++) {
      loc = loc / 2;
      if (loc % 2 == 0) res = keccak256(abi.encodePacked(res, _proof[i]));
      else res = keccak256(abi.encodePacked(_proof[i], res));
    }
    require(loc < 2); // This should be runtime error, access over bounds
    return res;
  }

  function getLeaf2(uint256 loc) internal view returns (uint256) {
    require(_proof2.length >= 2);
    if (loc % 2 == 0) return uint256(_proof2[0]);
    else return uint256(_proof2[1]);
  }

  function setLeaf2(uint256 loc, uint256 v) internal {
    require(_proof2.length >= 2);
    if (loc % 2 == 0) _proof2[0] = bytes32(v);
    else _proof2[1] = bytes32(v);
  }

  function getRoot2(uint256 loc) internal view returns (bytes32) {
    require(_proof2.length >= 2);
    bytes32 res = keccak256(abi.encodePacked(_proof2[0], _proof2[1]));
    for (uint256 i = 2; i < _proof2.length; i++) {
      loc = loc / 2;
      if (loc % 2 == 0) res = keccak256(abi.encodePacked(res, _proof2[i]));
      else res = keccak256(abi.encodePacked(_proof2[i], res));
    }
    require(loc < 2);
    return res;
  }

  function getRoot2_16(uint256 loc) internal view returns (bytes32) {
    require(_proof2.length >= 2);
    bytes32 res = keccak256(
      abi.encodePacked(
        uint128(bytes16(_proof2[0])),
        uint128(bytes16(_proof2[1]))
      )
    );
    for (uint256 i = 2; i < _proof2.length; i++) {
      loc = loc / 2;
      if (loc % 2 == 0) res = keccak256(abi.encodePacked(res, _proof2[i]));
      else res = keccak256(abi.encodePacked(_proof2[i], res));
    }
    require(loc < 2);
    return res;
  }

  function getCode(uint256 loc) internal view returns (bytes32) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.code);
    require(_proof2.length == 0);
    return bytes32(getLeaf(loc));
  }

  function getStack(uint256 loc) internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.stack);
    require(_proof2.length == 0);
    return getLeaf(loc);
  }

  function getCallStack(uint256 loc) internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.callStack);
    require(_proof2.length == 0);
    return getLeaf(loc);
  }

  function getCallTable(uint256 loc) internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.callTable);
    require(_proof2.length == 0);
    return getLeaf(loc);
  }

  function getCallTypes(uint256 loc) internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.callTypes);
    require(_proof2.length == 0);
    return getLeaf(loc);
  }

  function getMemory(uint256 loc) internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.mem);
    require(_proof2.length == 0);
    return getLeaf(loc);
  }

  function getGlobal(uint256 loc) internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.globals);
    require(_proof2.length == 0);
    return getLeaf(loc);
  }

  uint256 constant INPUT_FILES = 11;

  function getInputSize(uint256 loc) internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.inputSize && _proof.length == INPUT_FILES);
    require(_proof2.length == 0);
    return getLeaf(loc);
  }

  function getInputName(uint256 loc, uint256 loc2)
    internal
    view
    returns (uint256)
  {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.inputName && _proof.length == INPUT_FILES);
    require(getRoot2(loc2) == bytes32(getLeaf(loc)));
    return getLeaf2(loc2);
  }

  function setInputName(
    uint256 loc,
    uint256 loc2,
    uint256 v
  ) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.inputName && _proof.length == INPUT_FILES);
    require(getRoot2(loc2) == bytes32(getLeaf(loc)));
    setLeaf2(loc2, v);
    // setLeaf(loc, getLeaf2(loc));
    setLeaf(loc, uint256(getRoot2(loc2)));
    _roots.inputName = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setInputSize(uint256 loc, uint256 v) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.inputSize && _proof.length == INPUT_FILES);
    setLeaf(loc, v);
    _roots.inputSize = getRoot(loc);
    _machine.vm = hashVM();
    require(_proof2.length == 0);
    _state = hashMachine();
  }

  function setInputFile(uint256 loc, bytes32 v) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.inputData && _proof.length == INPUT_FILES);
    setLeaf(loc, uint256(v));
    _roots.inputData = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setNthByte(
    uint256 a,
    uint256 n,
    uint8 bte
  ) internal pure returns (bytes16) {
    uint256 mask = (uint256(-1) * (2**(8 * (15 - n)))) |
      (uint256(-1) / (2**(8 * (15 - n + 1))));
    return bytes16(bytes32((a & mask) | ((2**(8 * (15 - n))) * uint256(bte))));
  }

  function setInputData(
    uint256 loc,
    uint256 loc2,
    uint256 v
  ) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.inputData && _proof.length == INPUT_FILES);
    require(getRoot2_16(loc2 / 16) == bytes32(getLeaf(loc)));

    uint256 leaf = getLeaf2(loc2 / 16);
    uint256 idx = loc2 % 16;

    _debugb = bytes32(leaf);
    _debug = idx;
    uint256 nleaf = uint256(bytes32(setNthByte(leaf, idx, uint8(v))));
    _debugb = bytes32(nleaf);

    setLeaf2(loc2 / 16, nleaf);
    setLeaf(loc, uint256(getRoot2_16(loc2 / 16)));
    _debugb = _proof2[0];
    _debug = _proof2.length;
    _roots.inputData = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function getInputData(uint256 loc, uint256 loc2)
    internal
    view
    returns (uint256)
  {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.inputData && _proof.length == INPUT_FILES);
    require(getRoot2_16(loc2 / 16) == bytes32(getLeaf(loc)));
    uint256 leaf = getLeaf2(loc2 / 16);
    uint256 idx = loc2 % 16;

    return (leaf / 2**((15 - idx) * 8)) & 0xff;
  }

  function createInputData(uint256 loc, uint256 sz) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.inputData && _proof.length == INPUT_FILES);

    sz = sz / 32;
    bytes32 zero = keccak256(abi.encodePacked(bytes16(0), bytes16(0)));
    while (sz > 1) {
      sz = sz / 2;
      zero = keccak256(abi.encodePacked(zero, zero));
    }
    setLeaf(loc, uint256(zero));
    _roots.inputData = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setCallStack(uint256 loc, uint256 v) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.callStack);
    require(_proof2.length == 0);
    setLeaf(loc, v);
    _roots.callStack = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setMemory(uint256 loc, uint256 v) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.mem);
    require(_proof2.length == 0);
    setLeaf(loc, v);
    _roots.mem = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setStack(uint256 loc, uint256 v) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.stack);
    require(_proof2.length == 0);
    setLeaf(loc, v);
    _roots.stack = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setGlobal(uint256 loc, uint256 v) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.globals);
    require(_proof2.length == 0);
    setLeaf(loc, v);
    _roots.globals = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setCallTable(uint256 loc, uint256 v) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.callTable);
    require(_proof2.length == 0);
    setLeaf(loc, v);
    _roots.callTable = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setCallType(uint256 loc, uint256 v) internal {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    require(getRoot(loc) == _roots.callTypes);
    require(_proof2.length == 0);
    setLeaf(loc, v);
    _roots.callTypes = getRoot(loc);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function getPC() internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    return _vm.pc;
  }

  function getMemsize() internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    return _vm.memSize;
  }

  function getStackPtr() internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    return _vm.stackPtr;
  }

  function getCallPtr() internal view returns (uint256) {
    require(hashMachine() == _state && hashVM() == _machine.vm);
    return _vm.callPtr;
  }

  function getReg1() internal view returns (uint256) {
    require(hashMachine() == _state);
    return _machine.reg1;
  }

  function getReg2() internal view returns (uint256) {
    require(hashMachine() == _state);
    return _machine.reg2;
  }

  function getReg3() internal view returns (uint256) {
    require(hashMachine() == _state);
    return _machine.reg3;
  }

  function getIreg() internal view returns (uint256) {
    require(hashMachine() == _state);
    return _machine.ireg;
  }

  function getOp() internal view returns (bytes32) {
    require(hashMachine() == _state);
    return _machine.op;
  }

  function setMemsize(uint256 v) internal {
    _vm.memSize = v;
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setIreg(uint256 v) internal {
    _machine.ireg = v;
    _state = hashMachine();
  }

  function setReg1(uint256 v) internal {
    _machine.reg1 = v;
    _state = hashMachine();
  }

  function setReg2(uint256 v) internal {
    _machine.reg2 = v;
    _state = hashMachine();
  }

  function setReg3(uint256 v) internal {
    _machine.reg3 = v;
    _state = hashMachine();
  }

  function setPC(uint256 v) internal {
    _vm.pc = v;
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setStackPtr(uint256 v) internal {
    _vm.stackPtr = v;
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setCallPtr(uint256 v) internal {
    _vm.callPtr = v;
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setOp(bytes32 op) internal {
    _machine.op = op;
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function makeZero(uint256 n) internal pure returns (bytes32) {
    bytes32 res = 0;
    for (uint256 i = 0; i < n; i++) res = keccak256(abi.encodePacked(res, res));
    return res;
  }

  function setStackSize(uint256 sz) internal {
    _roots.stack = makeZero(sz);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setCallStackSize(uint256 sz) internal {
    _roots.callStack = makeZero(sz);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setGlobalsSize(uint256 sz) internal {
    _roots.globals = makeZero(sz);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setMemorySize(uint256 sz) internal {
    _roots.mem = makeZero(sz);
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setCallTableSize(uint256 sz) internal {
    bytes32 res = bytes32(uint256(uint32(-1)));
    _debugb = res;
    for (uint256 i = 0; i < sz; i++)
      res = keccak256(abi.encodePacked(res, res));
    _roots.callTable = res;
    _machine.vm = hashVM();
    _state = hashMachine();
  }

  function setCallTypesSize(uint256 sz) internal {
    _roots.callTypes = makeZero(sz);
    _machine.vm = hashVM();
    _state = hashMachine();
  }
}
