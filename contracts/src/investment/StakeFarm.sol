/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import './interfaces/IController.sol';

// This class handles staking of ERC20 compatible token.
// Note, that implementation wise only token
// with 18 decimals are allowed

contract StakeFarm is Ownable {
  using SafeMath for uint256;
  struct Stake {
    uint256 stakedAmount;
    uint256 stakeStartBlock;
    uint256 tokensEarned;
  }

  // Our stake holders
  mapping(address => Stake) private stakes;
  // The invested token, must be IERC20 conform
  IERC20 immutable token;
  // The address of the controller
  address controllerAddress;
  // Unique name of this instance, used in controller
  string public name;

  constructor(string memory _name, address _token) {
    name = _name;
    token = IERC20(_token);
  }

  function stake(uint256 amount) external {}

  function unstake(uint256 amount) external {}

  // Every time the stake amount changes, we save the
  // amount of already earned rewards and reset counter
  function _lockEarnedTokens(address user) private {
    Stake storage data = stakes[user];
    if (data.stakeStartBlock > 0) {
      uint256 tokensEarned =
        IController(controllerAddress).calculateTokensEarned(
          data.stakedAmount,
          (data.stakedAmount.mul(1e18)).div(token.balanceOf(address(this))),
          data.stakeStartBlock
        );
      data.tokensEarned = data.tokensEarned.add(tokensEarned);
      IController(controllerAddress).lockEarnedTokens(tokensEarned);
    }
    data.stakeStartBlock = block.number;
  }
}
