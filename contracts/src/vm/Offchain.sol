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

contract Offchain {
  //////////////////////////////////////////////////////////////////////////////
  // Types
  //////////////////////////////////////////////////////////////////////////////

  struct Roots {
    bytes32[] code;
    bytes32[] stack;
    bytes32[] mem;
    bytes32[] globals;
    bytes32[] callTable;
    bytes32[] callTypes;
    bytes32[] callStack;
    bytes32[] inputSize;
    bytes32[][] inputName;
    bytes32[][] inputData;
  }

  struct VM {
    uint256 pc;
    uint256 stackPtr;
    uint256 callPtr;
    uint256 memSize;
  }

  struct Machine {
    bytes32 op;
    uint256 reg1;
    uint256 reg2;
    uint256 reg3;
    uint256 ireg;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  VM internal _vm;
  Roots internal _roots;
  Machine internal _machine;

  //////////////////////////////////////////////////////////////////////////////
  // Internal interface
  //////////////////////////////////////////////////////////////////////////////

  function checkReadAccess(
    uint256, /* loc */
    uint256 /* hint */
  ) internal pure returns (bool) {
    return true;
  }

  function checkWriteAccess(
    uint256, /* loc */
    uint256 /* hint */
  ) internal pure returns (bool) {
    return true;
  }

  function checkInputDataAccess(
    uint256, /* loc */
    uint256 /* hint */
  ) internal pure returns (bool) {
    return true;
  }

  function checkInputNameAccess(
    uint256, /* loc */
    uint256 /* hint */
  ) internal pure returns (bool) {
    return true;
  }

  function setStackSize(uint256 sz) internal {
    for (uint256 i = 0; i < 2**sz / 32; i++) {
      _roots.stack.push(bytes32(0));
    }
  }

  function setCallStackSize(uint256 sz) internal {
    for (uint256 i = 0; i < 2**sz / 32; i++) {
      _roots.callStack.push(bytes32(0));
    }
  }

  function setGlobalsSize(uint256 sz) internal {
    for (uint256 i = 0; i < 2**sz / 32; i++) {
      _roots.globals.push(bytes32(0));
    }
  }

  function setMemorySize(uint256 sz) internal {
    for (uint256 i = 0; i < 2**sz / 32; i++) {
      _roots.mem.push(bytes32(0));
    }
  }

  function setCallTableSize(uint256 sz) internal {
    for (uint256 i = 0; i < 2**sz / 32; i++) {
      _roots.callTable.push(bytes32(0));
    }
  }

  function setCallTypesSize(uint256 sz) internal {
    for (uint256 i = 0; i < 2**sz / 32; i++) {
      _roots.callTypes.push(bytes32(0));
    }
  }

  function getCode(uint256 loc) internal view returns (bytes32) {
    return _roots.code[loc];
  }

  function getStack(uint256 loc) internal view returns (uint256) {
    return uint256(_roots.stack[loc]);
  }

  function getCallStack(uint256 loc) internal view returns (uint256) {
    return uint256(_roots.callStack[loc]);
  }

  function setCallStack(uint256 loc, uint256 v) internal {
    _roots.callStack[loc] = bytes32(v);
  }

  function getCallTable(uint256 loc) internal view returns (uint256) {
    return uint256(_roots.callTable[loc]);
  }

  function getCallTypes(uint256 loc) internal view returns (uint256) {
    return uint256(_roots.callTypes[loc]);
  }

  function getMemory(uint256 loc) internal view returns (uint256) {
    return uint256(_roots.mem[loc]);
  }

  function setMemory(uint256 loc, uint256 v) internal {
    _roots.mem[loc] = bytes32(v);
  }

  function setStack(uint256 loc, uint256 v) internal {
    _roots.stack[loc] = bytes32(v);
  }

  function getGlobal(uint256 loc) internal view returns (uint256) {
    return uint256(_roots.globals[loc]);
  }

  function setGlobal(uint256 loc, uint256 v) internal {
    _roots.globals[loc] = bytes32(v);
  }

  function setCallTable(uint256 loc, uint256 v) internal {
    _roots.callTable[loc] = bytes32(v);
  }

  function setCallType(uint256 loc, uint256 v) internal {
    _roots.callTypes[loc] = bytes32(v);
  }

  function getInputSize(uint256 loc) internal view returns (uint256) {
    return uint256(_roots.inputSize[loc]);
  }

  function getInputName(uint256 loc, uint256 loc2)
    internal
    view
    returns (uint256)
  {
    return uint256(_roots.inputName[loc][loc2]);
  }

  function getInputData(uint256 loc, uint256 loc2)
    internal
    view
    returns (uint256)
  {
    return uint256(_roots.inputData[loc][loc2]);
  }

  function createInputData(uint256 loc, uint256 sz) internal {
    /* TODO
    _roots.inputData[loc].length = sz;
    */
  }

  function setInputSize(uint256 loc, uint256 v) internal {
    _roots.inputSize[loc] = bytes32(v);
  }

  function setInputName(
    uint256 loc,
    uint256 loc2,
    uint256 v
  ) internal {
    _roots.inputName[loc][loc2] = bytes32(v);
  }

  function setInputData(
    uint256 loc,
    uint256 loc2,
    uint256 v
  ) internal {
    _roots.inputData[loc][loc2] = bytes32(v);
  }

  function getPC() internal view returns (uint256) {
    return _vm.pc;
  }

  function getMemsize() internal view returns (uint256) {
    return _vm.memSize;
  }

  function setMemsize(uint256 v) internal {
    _vm.memSize = v;
  }

  function getStackPtr() internal view returns (uint256) {
    return _vm.stackPtr;
  }

  function getCallPtr() internal view returns (uint256) {
    return _vm.callPtr;
  }

  function getIreg() internal view returns (uint256) {
    return _machine.ireg;
  }

  function setIreg(uint256 v) internal {
    _machine.ireg = v;
  }

  function setReg1(uint256 v) internal {
    _machine.reg1 = v;
  }

  function setReg2(uint256 v) internal {
    _machine.reg2 = v;
  }

  function setReg3(uint256 v) internal {
    _machine.reg3 = v;
  }

  function getReg1() internal view returns (uint256) {
    return _machine.reg1;
  }

  function getReg2() internal view returns (uint256) {
    return _machine.reg2;
  }

  function getReg3() internal view returns (uint256) {
    return _machine.reg3;
  }

  function setPC(uint256 v) internal {
    _vm.pc = v;
  }

  function setStackPtr(uint256 v) internal {
    _vm.stackPtr = v;
  }

  function setCallPtr(uint256 v) internal {
    _vm.callPtr = v;
  }

  function getOp() internal view returns (bytes32) {
    return _machine.op;
  }

  function setOp(bytes32 op) internal {
    _machine.op = op;
  }
}
