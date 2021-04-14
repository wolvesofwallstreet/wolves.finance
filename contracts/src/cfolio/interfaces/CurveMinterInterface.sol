/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;


abstract contract ICurveFi_Minter {
    function mint(address gauge_addr) virtual external;
    function minted(address _for, address gauge_addr) virtual external view returns(uint256);

    function toggle_approve_mint(address minting_user) virtual external;
    function token() virtual external view returns(address);
}