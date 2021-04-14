/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;
abstract contract ICurveFi_DepositY { 
    function add_liquidity(uint256[4] calldata uamounts, uint256 min_mint_amount) virtual external;
    function remove_liquidity(uint256 _amount, uint256[4] calldata min_uamounts) virtual external;
    function remove_liquidity_imbalance(uint256[4] calldata uamounts, uint256 max_burn_amount) virtual external;

    function coins(int128 i) external virtual view returns (address);
    function underlying_coins(int128 i) virtual external view returns (address);
    function underlying_coins() external virtual view returns (address[4] memory);
    function curve() external virtual view returns (address);
    function token() external virtual view returns (address);
}