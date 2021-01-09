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

import '../../interfaces/compound/CTokenInterface.sol';

import './interfaces/IStrategy.sol';

contract CompoundLender is IStrategy {
  using SafeMath for uint256;
  /*//mainnnet
  address constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
  address constant cusdc = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
  address constant dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address constant cdai = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
  address constant usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
  address constant cusdt = 0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9;
  */
  /*// kovan
  address constant usdc = 0xb7a4F3E9097C08dA09517b5aB877F7a917224ede;
  address constant cusdc = 0x4a92E71227D294F041BD82dd8f78591B75140d63;
  address constant dai = 0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa;
  address constant cdai = 0xF0d0EB522cfa50B716B3b1604C4F0fA6f04376AD;
  address constant usdt = 0x07de306FF27a2B630B1141956844eB1552B956B5;
  address constant cusdt = 0x3f0A0EA2f86baE6362CF9799B523BA06647Da018;
  */
  // rinkeby
  address constant usdc = 0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b;
  address constant cusdc = 0x5B281A6DdA0B271e91ae35DE655Ad301C976edb1;
  address constant dai = 0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa;
  address constant cdai = 0x6D7F0754FFeb405d23C51CE938289d4835bE3b14;
  address constant usdt = 0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02;
  address constant cusdt = 0x2fB298BDbeF468638AD6653FF8376575ea41e768;

  function getId() external pure override returns (bytes32) {
    return keccak256(abi.encodePacked('CompoundLender'));
  }

  function approve(address token) external override {
    IERC20(token).approve(_token2cToken(token), uint256(-1));
  }

  function invest(address token, uint256 assetAmount)
    external
    override
    returns (uint256)
  {
    address cToken = _token2cToken(token);
    require(cToken != address(0));
    // mint cToken
    uint256 poolTokens = IERC20(cToken).balanceOf(address(this));
    require(
      CTokenInterface(cToken).mint(assetAmount) == 0,
      'COMPOUND: mint failed'
    );
    return IERC20(cToken).balanceOf(address(this)).sub(poolTokens);
  }

  function redeem(address token, uint256 poolAmount)
    external
    override
    returns (uint256)
  {
    address cToken = _token2cToken(token);
    require(cToken != address(0));
    // redeem tokens to this contract
    uint256 assetTokens = IERC20(token).balanceOf(address(this));
    require(
      CTokenInterface(cToken).redeem(poolAmount) == 0,
      'COMPOUND: redeem failed'
    );
    return IERC20(token).balanceOf(address(this)).sub(assetTokens);
  }

  function balanceOf(address token, address _owner)
    external
    view
    override
    returns (uint256)
  {
    address cToken = _token2cToken(token);
    require(cToken != address(0));
    return IERC20(cToken).balanceOf(_owner);
  }

  // return the amount of the underlying asset
  function getAssetAmount(address token, address _owner)
    external
    view
    override
    returns (uint256)
  {
    address cToken = _token2cToken(token);
    return
      (
        IERC20(cToken).balanceOf(_owner).mul(
          CTokenInterface(cToken).exchangeRateStored()
        )
      )
        .div(1e18);
  }

  function getApr(address token) external view override returns (uint256) {
    return CTokenInterface(_token2cToken(token)).supplyRatePerBlock() * 2102400;
  }

  function refresh(address token) external override {
    CTokenInterface(_token2cToken(token)).exchangeRateCurrent();
  }

  function _token2cToken(address asset) internal pure returns (address) {
    if (asset == usdc) return cusdc;
    if (asset == dai) return cdai;
    if (asset == usdt) return cusdt;
    return address(0);
  }
}
