/*
 * Copyright (C) 2022 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

/* solhint-disable func-name-mixedcase */
interface ICurveFiGaugeAPoly {
  function decimals() external view returns (uint256);

  function reward_contract() external view returns (address);

  function last_claim() external view returns (uint256);

  function claimed_reward(address addr, address token)
    external
    view
    returns (uint256);

  function claimable_reward(address addr, address token)
    external
    view
    returns (uint256);

  function claimable_reward_write(address addr, address token)
    external
    returns (uint256);

  function set_rewards_receiver(address receiver) external;

  function claim_rewards() external;

  function claim_rewards(address addr) external;

  function claim_rewards(address addr, address receiver) external;

  function deposit(uint256 value) external;

  function deposit(uint256 value, address addr) external;

  function deposit(
    uint256 value,
    address addr,
    bool claimRewards
  ) external;

  function withdraw(uint256 value) external;

  function withdraw(uint256 value, bool claimRewards) external;

  function transfer(address to, uint256 value) external returns (bool);

  function transferFrom(
    address from,
    address to,
    uint256 value
  ) external returns (bool);

  function approve(address spender, uint256 value) external returns (bool);

  function increaseAllowance(address spender, uint256 addedValue)
    external
    returns (bool);

  function decreaseAllowance(address spender, uint256 subtractedValue)
    external
    returns (bool);

  function set_rewards(
    address rewardContract,
    bytes32 claimSig,
    address[8] memory rewardTokens
  ) external;

  function commit_transfer_ownership(address addr) external;

  function accept_transfer_ownership() external;

  function lp_token() external view returns (address);

  function balanceOf(address arg0) external view returns (uint256);

  function totalSupply() external view returns (uint256);

  function allowance(address arg0, address arg1)
    external
    view
    returns (uint256);

  function name() external view returns (string memory);

  function symbol() external view returns (string memory);

  function reward_tokens(uint256 arg0) external view returns (address);

  function reward_balances(address arg0) external view returns (uint256);

  function rewards_receiver(address arg0) external view returns (address);

  function claim_sig() external view returns (bytes memory);

  function reward_integral(address arg0) external view returns (uint256);

  function reward_integral_for(address arg0, address arg1)
    external
    view
    returns (uint256);

  function admin() external view returns (address);

  function future_admin() external view returns (address);
}
