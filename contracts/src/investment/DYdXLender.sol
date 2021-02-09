/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../../interfaces/dydx/DYdX.sol';

import './interfaces/IStrategy.sol';

contract DYdXLender is IStrategy {
  using SafeMath for uint256;
  /*//mainnnet
  address public constant DYDX = 0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e;
  address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
  address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public constant SAI = address(0);
  */
  // kovan
  address public constant DYDX = 0x4EC3570cADaAEE08Ae384779B0f3A45EF85289DE;
  address public constant USDC = 0xe22da380ee6B445bb8273C81944ADEB6E8450422;
  address public constant DAI = 0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD;
  address public constant SAI = 0xC4375B7De8af5a38a93548eb8453a498222C4fF2;

  function getId() external pure override returns (bytes32) {
    return keccak256(abi.encodePacked('DYdXLender'));
  }

  function approve(address token) external override {
    IERC20(token).approve(DYDX, uint256(-1));
  }

  function invest(address token, uint256 assetAmount)
    external
    override
    returns (uint256)
  {
    uint256 dToken = _token2dToken(token);
    require(dToken != uint256(-1), 'invest(): dToken address is -1');

    // Mint dToken
    Info[] memory infos = new Info[](1);
    infos[0] = Info(address(this), 0);

    AssetAmount memory amt =
      AssetAmount(
        true,
        AssetDenomination.Wei,
        AssetReference.Delta,
        assetAmount
      );
    ActionArgs memory act;
    act.actionType = ActionType.Deposit;
    act.accountId = 0;
    act.amount = amt;
    act.primaryMarketId = dToken;
    act.otherAddress = address(this);

    ActionArgs[] memory args = new ActionArgs[](1);
    args[0] = act;

    DYdX(DYDX).operate(infos, args);
    return assetAmount;
  }

  function redeem(address token, uint256 poolAmount)
    external
    override
    returns (uint256)
  {
    uint256 dToken = _token2dToken(token);
    require(dToken != uint256(-1), 'redeem(): dToken address is -1');

    // Redeem tokens to this contract
    Info[] memory infos = new Info[](1);
    infos[0] = Info(address(this), 0);

    AssetAmount memory amt =
      AssetAmount(
        false,
        AssetDenomination.Wei,
        AssetReference.Delta,
        poolAmount
      );
    ActionArgs memory act;
    act.actionType = ActionType.Withdraw;
    act.accountId = 0;
    act.amount = amt;
    act.primaryMarketId = dToken;
    act.otherAddress = address(this);

    ActionArgs[] memory args = new ActionArgs[](1);
    args[0] = act;

    DYdX(DYDX).operate(infos, args);
    return poolAmount;
  }

  function balanceOf(address token, address _owner)
    external
    view
    override
    returns (uint256)
  {
    Wei memory bal =
      DYdX(DYDX).getAccountWei(Info(_owner, 0), _token2dToken(token));
    return bal.value;
  }

  /**
   * @dev Return the amount of the underlying asset
   */
  function getAssetAmount(address token, address _owner)
    external
    view
    override
    returns (uint256)
  {
    Wei memory bal =
      DYdX(DYDX).getAccountWei(Info(_owner, 0), _token2dToken(token));
    return bal.value;
  }

  function getApr(address token) external view override returns (uint256) {
    uint256 dToken = _token2dToken(token);
    uint256 rate = DYdX(DYDX).getMarketInterestRate(dToken).value;
    uint256 aprBorrow = rate * 31622400;
    Set memory set = DYdX(DYDX).getMarketTotalPar(dToken);
    uint256 usage = (set.borrow * 1e18) / set.supply;
    return
      (((aprBorrow * usage) / 1e18) * DYdX(DYDX).getEarningsRate().value) /
      1e18;
  }

  // solhint-disable-next-line no-empty-blocks
  function refresh(address token) external override {}

  function _token2dToken(address asset) internal pure returns (uint256) {
    if (asset == SAI) return 1;
    if (asset == USDC) return 2;
    if (asset == DAI) return 3;
    return uint256(-1);
  }
}
