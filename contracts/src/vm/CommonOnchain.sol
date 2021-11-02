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

import './ALU.sol';
import './Onchain.sol';

pragma solidity 0.7.6;

contract CommonOnchain is Onchain, ALU {
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  // Magic pc: in the end or error state, has magic value 0xffffffffff (40 bits)
  uint256 public constant FINAL_STATE = 0xffffffffff;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  uint256 internal _phase;

  //////////////////////////////////////////////////////////////////////////////
  // Implementation
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Get a pointer for the place we want to perform a read from, based on the opcode
   *
   * @param hint The opcode
   *
   * @return Returns a pointer to where to read from
   */
  function readPosition(uint256 hint) internal view returns (uint256) {
    require(hint > 4);

    if (hint == 5) return getReg1();
    else if (hint == 6) return getStackPtr() - 1;
    else if (hint == 7) return getStackPtr() - 2;
    else if (hint == 8) return getStackPtr() - getReg1();
    // Stack in reg
    else if (hint == 9) return getStackPtr() - getReg2();
    else if (hint == 14) return getCallPtr() - 1;
    else if (hint == 15) return (getReg1() + getIreg()) / 8;
    else if (hint == 16) return getReg1();
    else if (hint == 17) return (getReg1() + getIreg()) / 8 + 1;
    else if (hint == 18) return getReg1();
    else if (hint == 19) return getReg1();
    else if (hint == 0x16) return getStackPtr() - 3;
    else revert('readPosition - Unreachable');
  }

  /**
   * @dev Perform a read based on the opcode
   *
   * @param hint The opcode
   *
   * returns The read value
   */
  function readFrom(uint256 hint) internal returns (uint256 res, bool fin4l) {
    if (hint == 0) res = 0;
    else if (hint == 1) res = getIreg();
    else if (hint == 2) res = getPC() + 1;
    else if (hint == 3) res = getStackPtr();
    else if (hint == 4)
      res = getMemsize();
      // Add special cases for input data, input name
    else if (hint == 0x14) {
      if (getReg2() >= 1024) fin4l = true;
      else if (!checkInputNameAccess(getReg2(), getReg1())) {
        fin4l = true;
        getInputName(getReg2(), 0);
      } else res = getInputName(getReg2(), getReg1());
    } else if (hint == 0x15) {
      if (getReg2() >= 1024) fin4l = true;
      else if (!checkInputDataAccess(getReg2(), getReg1())) {
        fin4l = true;
        getInputData(getReg2(), 0);
      } else res = getInputData(getReg2(), getReg1());
    } else {
      uint256 loc = readPosition(hint);

      if (!checkReadAccess(loc, hint)) {
        setPC(FINAL_STATE);
        res = 0;
        fin4l = true;
        if (hint == 5) res = getGlobal(0);
        else if (hint == 6) res = getStack(0);
        else if (hint == 7) res = getStack(0);
        else if (hint == 8) res = getStack(0);
        else if (hint == 9) res = getStack(0);
        else if (hint == 14) res = getCallStack(0);
        else if (hint == 15) res = getMemory(0);
        else if (hint == 16) res = getCallTable(0);
        else if (hint == 17) res = getMemory(0);
        else if (hint == 18) res = getCallTypes(0);
        else if (hint == 19) res = getInputSize(0);
        else if (hint == 0x16) res = getStack(0);
      } else if (hint == 5) res = getGlobal(loc);
      else if (hint == 6) res = getStack(loc);
      else if (hint == 7) res = getStack(loc);
      else if (hint == 8) res = getStack(loc);
      else if (hint == 9) res = getStack(loc);
      else if (hint == 14) res = getCallStack(loc);
      else if (hint == 15) res = getMemory(loc);
      else if (hint == 16) res = getCallTable(loc);
      else if (hint == 17) res = getMemory(loc);
      else if (hint == 18) res = getCallTypes(loc);
      else if (hint == 19) res = getInputSize(loc);
      else if (hint == 0x16) res = getStack(loc);
      else revert('readFrom - Unreachable');
    }
  }

  /**
   * @dev Make changes to a memory location
   *
   * @param loc Where should be changed inside memory
   * @param v The value to change the memory position to
   * @param hint Denoted v's type and packing value
   */
  function makeMemChange1(
    uint256 loc,
    uint256 v,
    uint256 hint
  ) internal {
    uint256 old = getMemory(loc);
    uint8[] memory mem = toMemory(old, 0);
    storeX(mem, (getReg1() + getIreg()) % 8, v, hint);
    uint256 res;
    uint256 extra;
    (res, extra) = fromMemory(mem);
    setMemory(loc, res);
  }

  /**
   * @dev Make changes to a memory location
   *
   * @param loc Where should the write be performed
   * @param v The value to be written to memory
   * @param hint Denotes v's type and packing value
   */
  function makeMemChange2(
    uint256 loc,
    uint256 v,
    uint256 hint
  ) internal {
    uint256 old = getMemory(loc);
    uint8[] memory mem = toMemory(0, old);
    storeX(mem, (getReg1() + getIreg()) % 8, v, hint);
    uint256 res;
    uint256 extra;
    (extra, res) = fromMemory(mem);
    setMemory(loc, res);
  }

  /**
   * @dev Get a pointer to where we want to write to based on the opcode
   *
   * @param hint The opcode
   *
   * @return Returns a pointer to where to write to
   */
  function writePosition(uint256 hint) internal view returns (uint256) {
    require(hint > 0);

    if (hint == 2) return getStackPtr() - getReg1();
    else if (hint == 3) return getStackPtr();
    else if (hint == 4) return getStackPtr() - 1;
    else if (hint == 5) return getReg1() + getReg2();
    else if (hint == 6) return getCallPtr();
    else if (hint == 8) return getReg1();
    else if (hint == 9) return getStackPtr() - 2;
    else if (hint == 0x0a) return getReg1();
    else if (hint == 0x0c) return getReg1();
    else if (hint == 0x0e) return getIreg();
    else if (hint == 0x0f) return getIreg();
    else if (hint & 0xc0 == 0x80) return (getReg1() + getIreg()) / 8;
    else if (hint & 0xc0 == 0xc0) return (getReg1() + getIreg()) / 8 + 1;
    else revert('writePosition - Unreachable');
  }

  /**
   * @dev Perform a write
   *
   * @param hint The opcode
   * @param v The value to be written
   */
  function writeStuff(uint256 hint, uint256 v) internal {
    if (hint == 0) return;
    // Special cases for creation, other output
    uint256 r1;
    if (hint == 0x0b) {
      r1 = getReg1();
      if (r1 >= 1024) setPC(FINAL_STATE);
      else if (!checkInputNameAccess(r1, getReg2())) {
        setPC(FINAL_STATE);
        getInputName(r1, 0);
      } else setInputName(r1, getReg2(), v);
    } else if (hint == 0x0c) {
      r1 = getReg1();
      if (r1 >= 1024) setPC(FINAL_STATE);
      else createInputData(r1, v);
    } else if (hint == 0x0d) {
      r1 = getReg1();
      if (r1 >= 1024) setPC(FINAL_STATE);
      else if (!checkInputDataAccess(r1, getReg2())) {
        setPC(FINAL_STATE);
        getInputData(r1, 0);
      } else setInputData(r1, getReg2(), v);
    } else if (hint == 0x10) setStackSize(v);
    else if (hint == 0x11) setCallStackSize(v);
    else if (hint == 0x12) setGlobalsSize(v);
    else if (hint == 0x13) setCallTableSize(v);
    else if (hint == 0x14) setCallTypesSize(v);
    else if (hint == 0x15) setMemorySize(v);
    else {
      uint256 loc = writePosition(hint);
      if (!checkWriteAccess(loc, hint)) {
        setPC(FINAL_STATE);
        if (hint & 0xc0 == 0x80) getMemory(0);
        else if (hint & 0xc0 == 0xc0) getMemory(0);
        else if (hint == 2) getStack(0);
        else if (hint == 3) getStack(0);
        else if (hint == 4) getStack(0);
        else if (hint == 6) getCallStack(0);
        else if (hint == 8) getGlobal(0);
        else if (hint == 9) getStack(0);
        else if (hint == 0x0a) getInputSize(0);
        else if (hint == 0x0e) getCallTable(0);
        else if (hint == 0x0f) getCallTypes(0);
      } else if (hint & 0xc0 == 0x80) makeMemChange1(loc, v, hint);
      else if (hint & 0xc0 == 0xc0) makeMemChange2(loc, v, hint);
      else if (hint == 2) setStack(loc, v);
      else if (hint == 3) setStack(loc, v);
      else if (hint == 4) setStack(loc, v);
      else if (hint == 6) setCallStack(loc, v);
      else if (hint == 8) setGlobal(loc, v);
      else if (hint == 9) setStack(loc, v);
      else if (hint == 0x0a) setInputSize(loc, v);
      else if (hint == 0x0e) setCallTable(loc, v);
      else if (hint == 0x0f) setCallType(loc, v);
      else revert('writeStuff - Unreachable');
    }
  }

  /**
   * @dev Makes the necessary changes to a pointer based on the addressing mode
   * provided by hint
   *
   * @param hint Provides a hint as to what changes to make to the input pointer
   * @param ptr The pointer that's going to be handled
   *
   * @return Returns the pointer after processing
   */
  function handlePointer(uint256 hint, uint256 ptr)
    internal
    view
    returns (uint256)
  {
    if (hint == 0) return ptr - getReg1();
    else if (hint == 1) return getReg1();
    else if (hint == 2) return getReg2();
    else if (hint == 3) return getReg3();
    else if (hint == 4) return ptr + 1;
    else if (hint == 5) return ptr - 1;
    else if (hint == 6) return ptr;
    else if (hint == 7) return ptr - 2;
    else if (hint == 8) return ptr - 1 - getIreg();
    else revert('handlePointer - Unreachable');
  }

  /**
   * @dev Get the immediate value of an instruction
   */
  function getImmed(bytes32 op) internal pure returns (uint256) {
    // it is the first 8 bytes
    return uint256(op) / (2**(13 * 8));
  }

  /**
   * @dev "Fetch" an instruction
   */
  function performFetch() internal {
    setOp(getCode(getPC()));
  }

  /**
   * @dev Initialize the Truebit register machine's registers
   */
  function performInit() internal {
    setReg1(0);
    setReg2(0);
    setReg3(0);
    setIreg(getImmed(getOp()));
  }

  /**
   * @dev Get the opcode
   *
   * @param n Which opcode byte to read
   *
   * @return Returns the opcode
   */
  function getHint(uint256 n) internal view returns (uint256) {
    return (uint256(getOp()) / 2**(8 * n)) & 0xff;
  }

  /**
   * @dev Read the first byte of the opcode and then read the value based on
   * the hint into REG1
   */
  function performRead1() internal {
    uint256 res;
    bool fin4l;
    (res, fin4l) = readFrom(getHint(0));
    if (!fin4l) setReg1(res);
  }

  /**
   * @dev Read the second byte of the opcode and then read the value based on
   * the hint into REG2
   */
  function performRead2() internal {
    uint256 res;
    bool fin4l;
    (res, fin4l) = readFrom(getHint(1));
    if (!fin4l) setReg2(res);
  }

  /**
   * @dev Read the third byte of the opcode and then read the value based on
   * the hint into REG3
   */
  function performRead3() internal {
    uint256 res;
    bool fin4l;
    (res, fin4l) = readFrom(getHint(2));
    if (!fin4l) setReg3(res);
  }

  /**
   * @dev Execute the opcode, put the result back in REG1
   */
  function performALU() internal {
    uint256 res;
    bool fin4l;
    (res, fin4l) = handleALU(
      getHint(3),
      getReg1(),
      getReg2(),
      getReg3(),
      getIreg()
    );
    if (fin4l) setPC(FINAL_STATE);
    else setReg1(res);
  }

  /**
   * @dev Write a value stored in REG to a location using the 4th and 5th hint bytes
   */
  function performWrite1() internal {
    uint256 target = getHint(4);
    uint256 hint = getHint(5);
    uint256 v;
    if (target == 1) v = getReg1();
    if (target == 2) v = getReg2();
    if (target == 3) v = getReg3();
    writeStuff(hint, v);
  }

  /**
   * @dev Write a value stored in REG to a location using the 6th and 7th hint bytes
   */
  function performWrite2() internal {
    uint256 target = getHint(6);
    uint256 hint = getHint(7);
    uint256 v;
    if (target == 1) v = getReg1();
    if (target == 2) v = getReg2();
    if (target == 3) v = getReg3();
    writeStuff(hint, v);
  }

  function performUpdatePC() internal {
    setPC(handlePointer(getHint(11), getPC()));
  }

  function performUpdateStackPtr() internal {
    setStackPtr(handlePointer(getHint(9), getStackPtr()));
  }

  function performUpdateCallPtr() internal {
    setCallPtr(handlePointer(getHint(8), getCallPtr()));
  }

  function performUpdateMemsize() internal {
    if (getHint(12) == 1) setMemsize(getMemsize() + getReg1());
  }

  function performPhase() internal {
    if (getPC() == FINAL_STATE) {} else if (_phase == 0) performFetch();
    else if (_phase == 1) performInit();
    else if (_phase == 2) performRead1();
    else if (_phase == 3) performRead2();
    else if (_phase == 4) performRead3();
    else if (_phase == 5) performALU();
    else if (_phase == 6) performWrite1();
    else if (_phase == 7) performWrite2();
    else if (_phase == 8) performUpdatePC();
    else if (_phase == 9) performUpdateStackPtr();
    else if (_phase == 10) performUpdateCallPtr();
    else if (_phase == 11) performUpdateMemsize();
    _phase = (_phase + 1) % 12;
  }
}
