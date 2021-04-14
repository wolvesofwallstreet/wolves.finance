/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */
 abstract contract IYERC20 { 
    //ERC20 functions
    //
    //

    //Y-token functions
    function deposit(uint256 amount) virtual external;
    function withdraw(uint256 shares) virtual external;
    function getPricePerFullShare() virtual external view returns (uint256);

    function token() virtual external returns(address);
}