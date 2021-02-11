/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.6.5;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../../interfaces/aave/AaveLP.sol';
import '../../interfaces/aave/AaveLPAddressProvider.sol';
import '../../interfaces/aave/AaveToken.sol';

import './interfaces/IStrategy.sol';

contract AaveLender is IStrategy {
  using SafeMath for uint256;
  /*//mainnnet
  address constant LENDING_POOL_ADDRESS_PROVIDER = 0x24a42fD28C976A61Df5D00D0599C34c4f90748c8;
  address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
  address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
  */
  // Kovan
  address public constant LENDING_POOL_ADDRESS_PROVIDER =
    0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5;
  address public constant USDC = 0xe22da380ee6B445bb8273C81944ADEB6E8450422;
  address public constant DAI = 0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD;
  address public constant USDT = 0x13512979ADE267AB5100878E2e0f485B568328a4;

  function getId() external pure override returns (bytes32) {
    return keccak256(abi.encodePacked('AaveLender'));
  }

  function approve(address token) external override {
    IERC20(token).approve(
      AaveLPAddressProvider(LENDING_POOL_ADDRESS_PROVIDER).getLendingPoolCore(),
      uint256(-1)
    );
  }

  function invest(address token, uint256 assetAmount)
    external
    override
    returns (uint256)
  {
    address lendingPool =
      AaveLPAddressProvider(LENDING_POOL_ADDRESS_PROVIDER).getLendingPool();
    require(lendingPool != address(0), 'Lending pool address is 0');

    // Aave pegs token 1:1
    AaveLP(lendingPool).deposit(token, assetAmount, 0);

    return assetAmount;
  }

  function redeem(address token, uint256 poolAmount)
    external
    override
    returns (uint256)
  {
    address aToken = _getPoolToken(token);
    require(aToken != address(0), 'Pool token address is 0');

    // Redeem tokens to this contract
    AaveToken(aToken).redeem(poolAmount);

    return poolAmount;
  }

  function balanceOf(address token, address _owner)
    external
    view
    override
    returns (uint256)
  {
    return IERC20(_getPoolToken(token)).balanceOf(_owner);
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
    return IERC20(_getPoolToken(token)).balanceOf(_owner);
  }

  function getApr(address token) external view override returns (uint256) {
    (, , , , uint256 liquidityRate, , , , , , , , ) =
      AaveLP(
        AaveLPAddressProvider(LENDING_POOL_ADDRESS_PROVIDER).getLendingPool()
      )
        .getReserveData(token);
    return liquidityRate.div(1e9);
  }

  // solhint-disable-next-line no-empty-blocks
  function refresh(address token) external override {}

  function _getPoolToken(address token) private view returns (address) {
    (, , , , , , , , , , , address aToken, ) =
      AaveLP(
        AaveLPAddressProvider(LENDING_POOL_ADDRESS_PROVIDER).getLendingPool()
      )
        .getReserveData(token);
    return aToken;
  }
}
