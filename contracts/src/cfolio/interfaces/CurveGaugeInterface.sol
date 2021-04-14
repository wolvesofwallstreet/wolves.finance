/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

abstract contract ICurveFi_Gauge {
    function lp_token() virtual external view returns(address);
    function crv_token() virtual external view returns(address);
 
    function balanceOf(address addr) virtual external view returns (uint256);
    function deposit(uint256 _value) virtual external;
    function withdraw(uint256 _value) virtual external;

    function claimable_tokens(address addr) virtual external returns (uint256);
    function minter() virtual external view returns(address); //use minter().mint(gauge_addr) to claim CRV

    function integrate_fraction(address _for) virtual external view returns(uint256);
    function user_checkpoint(address _for) virtual external returns(bool);
}