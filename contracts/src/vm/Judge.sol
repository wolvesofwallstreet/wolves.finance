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

import './CommonOnchain.sol';

contract Judge is CommonOnchain {
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  bytes32 public constant MASK =
    bytes32(uint256(0xffffffffffffffffffffffffffffffffffffffffffffffff));

  //////////////////////////////////////////////////////////////////////////////
  // Public interface
  //////////////////////////////////////////////////////////////////////////////

  function judge(
    bytes32[13] memory res,
    uint256 q,
    //bytes32[] memory proof,
    //bytes32[] memory proof2,
    bytes32 vm,
    bytes32 op,
    uint256[4] memory regs,
    bytes32[10] memory roots,
    uint256[4] memory pointers
  ) public returns (uint256) {
    // Update state
    setMachine(vm, op, regs[0], regs[1], regs[2], regs[3]);
    setVM(roots, pointers);

    // Special initial state
    if (q == 0) {
      _machine.vm = hashVM();
      _state = hashMachine();
      require(_machine.vm == res[q]);
    } else {
      require(hashVM() == _machine.vm);
      _state = res[q];
      require(_state == hashMachine());
    }

    _phase = q;

    /*
    checkProof(_proof, _proof2);
    proof = _proof;
    proof2 = _proof2;
    */

    performPhase();

    // Special final state
    if (q == 11) {
      _state = _machine.vm;
    }

    // Validate state
    require(_state == res[q + 1]);

    return q;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal interface
  //////////////////////////////////////////////////////////////////////////////

  /*
  function checkProof(bytes32[] memory pr, bytes32[] memory pr2) internal view {
    if (pr2.length == 0 && !(_phase == 7 && getHint(7) == 0x0c)) {
      require(
        pr.length == 0 ||
          (pr.length != 1 && pr[0] == pr[0] & MASK && pr[1] == pr[1] & MASK)
      );
    }
  }
  */
}
