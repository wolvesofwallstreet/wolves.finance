/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

/**
 * @title TestTetherIERC20 interface
 *
 * @dev Because Tether is not fully consistent with OZ's IERC20 interface, a
 * specialized IERC20 interface is needed. The interface below comes from the
 * mainnet Tether contract (0xdac17f958d2ee523a2206206994597c13d831ec7).
 *
 * Functions from {ERC20Basic} and {ERC20} of the Tether contract are
 * concatenated and modernized to form the interface here.
 *
 * Ref: https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7#code
 *
 * FOR TESTING ONLY.
 */
abstract contract TestTetherIERC20 {
  uint256 public _totalSupply;

  function totalSupply() public view virtual returns (uint256);

  function balanceOf(address who) public view virtual returns (uint256);

  function transfer(address to, uint256 value) public virtual;

  function allowance(address owner, address spender)
    public
    view
    virtual
    returns (uint256);

  function transferFrom(
    address from,
    address to,
    uint256 value
  ) public virtual;

  function approve(address spender, uint256 value) public virtual;

  event Transfer(address indexed from, address indexed to, uint256 value);

  event Approval(address indexed owner, address indexed spender, uint256 value);
}
