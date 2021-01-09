/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * This file is derived from dYdX, available under the Apache 2.0 license.
 * http://dydx.exchange/
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

struct Val {
  uint256 value;
}

struct Set {
  uint128 borrow;
  uint128 supply;
}

enum ActionType {
  Deposit, // supply tokens
  Withdraw // borrow tokens
}

enum AssetDenomination {
  Wei // the amount is denominated in wei
}

enum AssetReference {
  Delta // the amount is given as a delta from the current value
}

struct AssetAmount {
  bool sign; // true if positive
  AssetDenomination denomination;
  AssetReference ref;
  uint256 value;
}

struct ActionArgs {
  ActionType actionType;
  uint256 accountId;
  AssetAmount amount;
  uint256 primaryMarketId;
  uint256 secondaryMarketId;
  address otherAddress;
  uint256 otherAccountId;
  bytes data;
}

struct Info {
  address owner; // The address that owns the account
  uint256 number; // A nonce that allows a single address to control many accounts
}

struct Wei {
  bool sign; // true if positive
  uint256 value;
}

interface dYdX {
  function getAccountWei(Info calldata account, uint256 marketId)
    external
    view
    returns (Wei memory);

  function operate(Info[] calldata, ActionArgs[] calldata) external;

  function getEarningsRate() external view returns (Val memory);

  function getMarketInterestRate(uint256 marketId)
    external
    view
    returns (Val memory);

  function getMarketTotalPar(uint256 marketId)
    external
    view
    returns (Set memory);
}
