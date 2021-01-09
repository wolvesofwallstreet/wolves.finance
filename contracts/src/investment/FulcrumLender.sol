/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.6.5;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../../interfaces/fulcrum/Fulcrum.sol';

import './interfaces/IStrategy.sol';

contract FulcrumLender is IStrategy {
  using SafeMath for uint256;
  /*//mainnnet
  address constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
  address constant iusdc = 0x32E4c68B3A4a813b710595AebA7f6B7604Ab9c15;
  address constant dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address constant idai = 0x6b093998D36f2C7F0cc359441FBB24CC629D5FF0;
  address constant usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
  address constant iusdt = 0x7e9997a38A439b2be7ed9c9C4628391d3e055D48;
  */
  //Kovan
  address constant usdc = 0xB443f30CDd6076b1A5269dbc08b774F222d4Db4e;
  address constant iusdc = 0x021C5923398168311Ff320902BF8c8C725B4F288;
  address constant dai = address(0);
  address constant idai = address(0);
  address constant usdt = address(0);
  address constant iusdt = address(0);

  function getId() external pure override returns (bytes32) {
    return keccak256(abi.encodePacked('FulcrumLender'));
  }

  function approve(address token) external override {
    IERC20(token).approve(_token2iToken(token), uint256(-1));
  }

  function invest(address token, uint256 assetAmount)
    external
    override
    returns (uint256)
  {
    // mint iToken
    uint256 poolTokens =
      Fulcrum(_token2iToken(token)).mint(address(this), assetAmount);
    require(poolTokens > 0, 'Fulcrum: mint failed');
    return poolTokens;
  }

  function redeem(address token, uint256 poolAmount)
    external
    override
    returns (uint256)
  {
    // redeem tokens to this contract
    uint256 assetTokens =
      Fulcrum(_token2iToken(token)).burn(address(this), poolAmount);
    require(assetTokens > 0, 'Fulcrum: burn failed');
    return assetTokens;
  }

  function balanceOf(address token, address _owner)
    external
    view
    override
    returns (uint256)
  {
    return IERC20(_token2iToken(token)).balanceOf(_owner);
  }

  // return the amount of the underlying asset
  function getAssetAmount(address token, address _owner)
    external
    view
    override
    returns (uint256)
  {
    return Fulcrum(_token2iToken(token)).assetBalanceOf(_owner);
  }

  function getApr(address token) external view override returns (uint256) {
    return Fulcrum(_token2iToken(token)).supplyInterestRate().div(100);
  }

  function refresh(address token) external override {}

  function _token2iToken(address asset) internal pure returns (address) {
    if (asset == usdc) return iusdc;
    if (asset == dai) return idai;
    if (asset == usdt) return iusdt;
    return address(0);
  }
}
