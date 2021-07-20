/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Context.sol';

import '../../interfaces/yearn/IController.sol';
import '../../interfaces/yearn/IStrategy.sol';

import '../token/TestERC20Mintable.sol';

/**
 * @dev Dummy test strategy that just holds whatever coins are sent to it
 */
contract StrategyHODL is IStrategy, Context {
  using SafeERC20 for IERC20;
  using SafeERC20 for TestERC20Mintable;
  using SafeMath for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  uint256 private constant WITHDRAWAL_FEE = 50;

  //////////////////////////////////////////////////////////////////////////////
  // Protocol actors
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev The Controller acts as the gatekeeping interface between vaults and
   * strategies and oversees communication and fund flows.
   */
  IController private immutable _controller;

  /**
   * @dev Underlying token wanted by this strategy
   */
  TestERC20Mintable private immutable _wantedToken;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(address controller, address want) public {
    // Validate parameters
    require(controller != address(0), 'controller is zero address');
    require(want != address(0), 'want is zero address');

    // Initialize state
    _controller = IController(controller);
    _wantedToken = TestERC20Mintable(want);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IStrategy}
  //////////////////////////////////////////////////////////////////////////////

  function want() external view override returns (address) {
    return address(_wantedToken);
  }

  function deposit() external override {}

  /**
   * @dev Controller only function for creating additional rewards from dust
   */
  function withdraw(address asset) external override {
    // Validate access
    require(_msgSender() == address(_controller), '!controller');

    // Validate parameters
    require(asset != address(_wantedToken), '!want');

    // Load state
    uint256 balance = IERC20(asset).balanceOf(address(this));

    // Update state
    IERC20(asset).safeTransfer(address(_controller), balance);
  }

  /**
   * @dev Withdraw partial funds, normally used with a vault withdrawal
   */
  function withdraw(uint256 amount) external override {
    // Validate access
    require(_msgSender() == address(_controller), '!controller');

    // Validate parameters
    uint256 balance = _wantedToken.balanceOf(address(this));
    require(amount <= balance, 'amount > balance');

    // Load state
    address vault = _controller.vaults(address(this));
    require(vault != address(0), '!vault'); // Additional protection so we don't burn the funds

    // Update state
    _wantedToken.safeTransfer(vault, amount);
  }

  function skim() external override {}

  /**
   * @dev Withdraw all funds, normally used when migrating strategies
   */
  function withdrawAll() external override returns (uint256) {
    // Validate access
    require(_msgSender() == address(_controller), '!controller');

    // Load state
    address vault = _controller.vaults(address(this));
    require(vault != address(0), '!vault'); // Additional protection so we don't burn the funds

    uint256 balance = _wantedToken.balanceOf(address(this));

    // Update state
    _wantedToken.safeTransfer(vault, balance);

    return balance;
  }

  function balanceOf() public view override returns (uint256) {
    return _wantedToken.balanceOf(address(this));
  }

  function withdrawalFee() external view override returns (uint256) {
    return WITHDRAWAL_FEE;
  }
}
