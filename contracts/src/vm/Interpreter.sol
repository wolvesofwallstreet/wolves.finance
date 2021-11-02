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

import './CommonOffchain.sol';

contract Interpreter is CommonOffchain {
  //////////////////////////////////////////////////////////////////////////////
  // Public interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Run the module in its entirety
   *
   * @param code The wasm code to run
   * @param stack The stack
   * @param mem The linear memory
   * @param globals The gloval values
   * @param callTable The call table
   * @param callTypes The call types
   * @param callStack The call stack
   * @param input The input size
   * @param pc The program counter
   * @param stackPtr The stack pointer
   * @param callPtr The call pointer
   * @param memSize The linear memory size
   *
   * @return Return the wasm module's return value
   */
  /* TODO
  function run(
    bytes32[] memory code,
    bytes32[] memory stack,
    bytes32[] memory mem,
    bytes32[] memory globals,
    bytes32[] memory callTable,
    bytes32[] memory callTypes,
    bytes32[] memory callStack,
    bytes32[] memory input,
    uint256 pc,
    uint256 stackPtr,
    uint256 callPtr,
    uint256 memSize
  ) public returns (int64) {
    _roots.code = code;
    _roots.stack = stack;
    _roots.mem = mem;
    _roots.globals = globals;
    _roots.callTable = callTable;
    _roots.callTypes = callTypes;
    _roots.callStack = callStack;
    _roots.input_size = input;
    _vm.pc = pc;
    _vm.stackPtr = stackPtr;
    _vm.callPtr = callPtr;
    _vm.memSize = memSize;

    while (
      _roots.code[_vm.pc] !=
      0x0000000000000000000000000000000000000000040006060001000106000000
    ) {
      performPhase();
    }

    return int64(_roots.stack[0]);
  }
  */

  /**
   * @dev Run a single step
   *
   * @param limit Maximum number of steps
   * @param code The code
   * @param roots The roots of the wasm machine state
   * @param pc Program counter
   * @param stackPtr Stack pointer
   * @param callPtr Call pointer
   * @param memSize Size of the linear memory
   *
   * @return Return the top of stack, the program counter and the stack
   */
  function run2(
    uint256 limit,
    bytes32[] memory code,
    uint256[] memory roots,
    uint256 pc,
    uint256 stackPtr,
    uint256 callPtr,
    uint256 memSize
  )
    public
    returns (
      int64,
      uint256,
      bytes32
    )
  {
    //_roots.code = code; // TODO
    setStackSize(roots[0]);
    setMemorySize(roots[1]);
    setGlobalsSize(roots[2]);
    setCallTableSize(roots[3]);
    setCallTypesSize(roots[4]);
    setCallStackSize(roots[5]);
    //_roots.inputSize.length = roots[6]; // TODO
    _vm.pc = pc;
    _vm.stackPtr = stackPtr;
    _vm.callPtr = callPtr;
    _vm.memSize = memSize;

    while (
      limit > 0 &&
      bytes32(_roots.code[_vm.pc]) !=
      0x0000000000000000000000000000000000000000040006060001000106000000
    ) {
      performPhase();
      limit--;
    }

    return (
      int64(bytes8(_roots.stack[0])),
      _vm.pc,
      keccak256(abi.encodePacked(_roots.stack))
    );
  }
}
