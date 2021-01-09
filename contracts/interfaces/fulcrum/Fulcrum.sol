/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * This file is derived from Fulcrum, available under the Apache 2.0 license.
 * https://fulcrum.trade/
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

interface Fulcrum {
  function mint(address receiver, uint256 amount)
    external
    payable
    returns (uint256 mintAmount);

  function burn(address receiver, uint256 burnAmount)
    external
    returns (uint256 loanAmountPaid);

  function assetBalanceOf(address _owner)
    external
    view
    returns (uint256 balance);

  function supplyInterestRate() external view returns (uint256 rate);
}
