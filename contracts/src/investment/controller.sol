/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.6.5;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

import './interfaces/IController.sol';
import './interfaces/IFarm.sol';

contract Controller is IController, Ownable {
  using SafeMath for uint256;

  uint256 constant oneDayInBlocksMillion = 6500e6;
  uint256 constant tokenToRewardPerDayPerMillion = 100;
  uint256 public lockedToken = 0;

  struct Farm {
    address farm;
    uint256 lockedToken;
  }
  Farm[] farms;

  // TODO: handle preconditions (%tokens restriction)
  function onDeposit(uint256 amount) external override {}

  // TODO: resolve withdraw actions
  function onWithdraw(uint256 amount) external override {}

  function calculateTokensEarned(
    uint256 amount,
    uint256, /*share*/
    uint256 depositStartBlock
  ) external view override returns (uint256) {
    require(_findFarm(msg.sender) < farms.length, 'Farm not registered');
    uint256 blocksPassed = block.number.sub(depositStartBlock);
    return
      amount.mul(tokenToRewardPerDayPerMillion).mul(blocksPassed).div(
        oneDayInBlocksMillion
      );
  }

  function lockEarnedTokens(uint256 tokenCount) external override {
    uint256 farmId = _findFarm(msg.sender);
    require(farmId < farms.length, 'Farm not registered');
    Farm storage farm = farms[farmId];
    farm.lockedToken = farm.lockedToken.add(tokenCount);
  }

  function registerFarm(address farm) external onlyOwner {
    bytes32 farmName = keccak256(abi.encodePacked(IFarm(farm).farmName()));
    for (uint256 i = 0; i < farms.length; i++) {
      if (farms[i].farm == farm) return;
      if (
        keccak256(abi.encodePacked(IFarm(farms[i].farm).farmName())) == farmName
      ) {
        lockedToken -= farms[i].lockedToken;
        farms[i].farm = farm;
        return;
      }
    }
    farms.push(Farm(farm, 0));
  }

  function unregisterFarm(address farm) external onlyOwner {
    uint256 newLength = 0;
    for (uint256 i = 0; i < farms.length; i++) {
      if (farms[i].farm != farm) {
        if (newLength < i) farms[newLength] = farms[i];
        ++newLength;
      } else lockedToken -= farms[i].lockedToken;
    }
    if (newLength < farms.length) farms.pop();
  }

  function collectFees() external onlyOwner {
    for (uint256 i = 0; i < farms.length; i++)
      IFarm(farms[i].farm).requestMarketingFee();
  }

  function rebalance() external onlyOwner {
    for (uint256 i = 0; i < farms.length; i++) IFarm(farms[i].farm).rebalance();
  }

  function _findFarm(address _farm) private view returns (uint256) {
    for (uint256 i = 0; i < farms.length; i++)
      if (farms[i].farm == _farm) return i;
    return farms.length;
  }
}
