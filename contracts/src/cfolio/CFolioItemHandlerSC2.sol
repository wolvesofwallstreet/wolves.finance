/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/interfaces/IERC20.sol';
import '../../0xerc1155/utils/SafeERC20.sol';
import '../../interfaces/curve/CurveDepositInterface2.sol';

import './CFolioItemHandlerFarm.sol';

/**
 * @dev CFolioItemHandlerSC manages CFolioItems, minted in the SFT contract.
 *
 * See {CFolioItemHandlerFarm}.
 */
contract CFolioItemHandlerSC2 is CFolioItemHandlerFarm {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  // Curve pool token contract
  IERC20 public immutable curveToken;

  // Curve 2 stable coin pool deposit contract
  ICurveFiDeposit2 public immutable curveDeposit;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Constructs the CFolioItemHandlerSC
   *
   * We gather all current addresses from address registry into immutable vars.
   * If one of the relevant addresses changes, the contract has to be updated.
   * There is little state here, user state is completely handled in CFolioFarm.
   */
  constructor(
    IAddressRegistry addressRegistry,
    ICurveFiDeposit2 depositContract,
    address farm
  ) CFolioItemHandlerFarm(addressRegistry, farm) {
    // The pool deposit contract
    curveDeposit = depositContract;
    curveToken = IERC20(address(depositContract));
  }

  /**
   * @dev One time contract initializer
   */
  function initialize() public {
    // Approve stablecoin spending
    for (uint256 i = 0; i < 2; ++i) {
      address underlyingCoin = curveDeposit.coins(i);
      IERC20(underlyingCoin).safeApprove(address(curveDeposit), uint256(-1));
    }

    // Approve pool token spending
    curveToken.approve(address(curveDeposit), uint256(-1));
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {CFolioItemHandlerFarm}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {CFolioItemHandlerFarm-_deposit}.
   */
  function _deposit(
    address itemCFolio,
    address payer,
    uint256[] calldata amounts
  ) internal override {
    // Validate input
    require(amounts.length == 3, 'CFIHSC: Amount length invalid');

    // Keep track of how many pool tokens were received
    uint256 beforeBalance = curveToken.balanceOf(address(this));

    // Keep track of amounts
    uint256[2] memory stableAmounts;
    uint256 totalStableAmount;

    // Update state
    for (uint256 i = 0; i < 2; ++i) {
      if (amounts[i] > 0) {
        address underlyingCoin = curveDeposit.coins(i);

        IERC20(underlyingCoin).safeTransferFrom(
          payer,
          address(this),
          amounts[i]
        );

        uint256 stableAmount = IERC20(underlyingCoin).balanceOf(address(this));

        stableAmounts[i] = stableAmount;
        totalStableAmount += stableAmount;
      }
    }

    if (totalStableAmount > 0) {
      // Call to external contract
      curveDeposit.add_liquidity(stableAmounts, 0);

      // Validate state
      uint256 afterStableBalance = curveToken.balanceOf(address(this));
      require(
        afterStableBalance > beforeBalance,
        'CFIHSC: No stable liquidity'
      );
    }

    // Handle pool
    uint256 poolAmount = amounts[2];

    // Update state
    if (poolAmount > 0) {
      curveToken.safeTransferFrom(payer, address(this), poolAmount);
    }

    // Validate state
    uint256 afterBalance = curveToken.balanceOf(address(this));
    require(afterBalance > beforeBalance, 'CFIFSC: No investment');

    // Record assets in Farm contract. They don't earn rewards.
    //
    // NOTE: {addAssets} must only be called from Investment CFolios. This
    // call is allowed without any investment.
    _cfolioFarm.addAssets(itemCFolio, afterBalance.sub(beforeBalance), 0);
  }

  /**
   * @dev See {CFolioItemHandlerFarm-_withdraw}
   *
   * Note: tokenId can be owned by a base SFT. In this case, the base SFT
   * cannot be locked.
   *
   * There is only need to update rewards if tokenId is part of an unlocked
   * base SFT.
   *
   * @param itemCFolio The address of the target CFolioItem cryptofolio
   * @param amounts The amounts, with the tokens being 2 * stable coin +
   *     pool token. Pool token must be specified, as pool tokens are held by
   *     this contract. If all stablecoin amounts are 0, then ypool token is withdrawn to the
   *     sender's wallet. If exactly one of the four stablecoin amounts is > 0,
   *     then pool token will be converted to the specified stablecoin. The amount in
   *     the array is the minimum amount of stablecoin tokens that must be
   *     withdrawn.
   */
  function _withdraw(address itemCFolio, uint256[] calldata amounts)
    internal
    override
  {
    // Validate input
    require(amounts.length == 3, 'CFIHSC: Amount length invalid');

    // Validate parameters
    uint256 poolAmount = amounts[2];
    require(poolAmount > 0, 'CFIHSC: pool amount is 0');

    // Get single coin and amount
    (uint256 stableCoinIndex, uint256 stableCoinAmount) = _getStableCoinInfo(
      amounts
    );

    // Keep track of how many pool tokens were sent
    uint256 balanceBefore = curveToken.balanceOf(address(this));

    // Update state
    if (stableCoinIndex != uint256(-1)) {
      // Call to external contract
      curveDeposit.remove_liquidity_one_coin(
        poolAmount,
        int128(stableCoinIndex),
        stableCoinAmount
      );

      address underlyingCoin = curveDeposit.coins(stableCoinIndex);
      uint256 underlyingCoinAmount = IERC20(underlyingCoin).balanceOf(
        address(this)
      );

      // Transfer stablecoins back to the sender
      IERC20(underlyingCoin).safeTransfer(_msgSender(), underlyingCoinAmount);
    } else {
      // No stablecoins were passed, sender is withdrawing pool tokens directly
      // Transfer pool tokens back to the sender
      curveToken.safeTransfer(_msgSender(), poolAmount);
    }

    // Valiate state
    uint256 balanceAfter = curveToken.balanceOf(address(this));
    require(balanceAfter < balanceBefore, 'Nothing withdrawn');

    // Record assets in Farm contract. They don't earn rewards.
    //
    // NOTE: {removeAssets} must only be called from Investment CFolios.
    _cfolioFarm.removeAssets(itemCFolio, balanceBefore.sub(balanceAfter), 0);
  }

  /**
   * @dev See {CFolioItemHandlerFarm-_verifyTransferTarget}
   */
  function _verifyTransferTarget(uint256 baseSftTokenId)
    internal
    view
    override
  {
    (, uint8 level) = _sftHolder.getTokenData(baseSftTokenId);

    require((LEVEL2BOIS & (uint256(1) << level)) > 0, 'CFIHSC: Bois only');
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICFolioItemHandler} via {CFolioItemHandlerFarm}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICFolioItemHandler-getAmounts}
   *
   * The returned token array is 2 stable coins + pool token. Tokens are held in
   * this contract as pool token, so the last item will be the amount of the pool token. The
   * stablecoin amounts are the amount that would be withdrawn if all
   * pool tokens were converted to the corresponding stablecoin upon withdrawal. This
   * value is calculated by Curve.
   */
  function getAmounts(address cfolioItem)
    external
    view
    override
    returns (uint256[] memory result)
  {
    result = new uint256[](3);

    uint256 wrappedAmount = _cfolioFarm.balanceOf(cfolioItem, 0);

    for (uint256 i = 0; i < 2; ++i) {
      result[i] = curveDeposit.calc_withdraw_one_coin(wrappedAmount, int128(i));
    }

    result[2] = wrappedAmount;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation details
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Get single coin and amount
   *
   * This is a helper function for {withdraw}. Per the documentation above, no
   * more than one stablecoin amount can be > 0. If more than one stablecoin
   * amount is specified, the revert condition below will be reached.
   *
   * If exactly one stablecoin amount is specified, then the return values will
   * be the index of that coin and its amount.
   *
   * If no stablecoin amounts are > 0, then a coin index of -1 is returned,
   * with a 0 amount.
   *
   * @param amounts The amounts array: 2 * stable coin + pool token
   *
   * @return stableCoinIndex The index of the stablecoin with amount > 0, or -1
   *     if all four stablecoin amounts are 0
   * @return stableCoinAmount The amount of the stablecoin, or 0 if all four
   *     stablecoin amounts are 0
   */
  function _getStableCoinInfo(uint256[] calldata amounts)
    private
    pure
    returns (uint256 stableCoinIndex, uint256 stableCoinAmount)
  {
    stableCoinIndex = uint256(-1);

    for (uint256 i = 0; i < 2; ++i) {
      if (amounts[i] > 0) {
        require(stableCoinIndex == uint256(-1), 'Multiple amounts > 0');
        stableCoinIndex = i;
        stableCoinAmount = amounts[i];
      }
    }
  }
}
