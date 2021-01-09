/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/GSN/Context.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import 'contracts/interfaces/uniswap/IUniswapV2Router02.sol';

interface IERC20WolfMintable is IERC20 {
  function mint(address account, uint256 amount) external returns (bool);

  function enableUniV2Pair(bool enable) external;
}

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether. This contract implements
 * such functionality in its most fundamental form and can be extended to provide additional
 * functionality and/or custom behavior.
 * The external interface represents the basic interface for purchasing tokens, and conforms
 * the base architecture for crowdsales. It is *not* intended to be modified / overridden.
 * The internal interface conforms the extensible and modifiable surface of crowdsales. Override
 * the methods to add functionality. Consider using 'super' where appropriate to concatenate
 * behavior.
 */
contract Crowdsale is Context, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20WolfMintable;

  // The token being sold
  IERC20WolfMintable private _token;

  // Address where funds are collected
  address payable private _wallet;

  // How many token units a buyer gets per wei.
  // The rate is the conversion between wei and the smallest and indivisible token unit.
  // So, if you are using a rate of 1 with a ERC20Detailed token with 3 decimals called TOK
  // 1 wei will give you 1 unit, or 0.001 TOK.
  uint256 private _rate;

  // Amount of wei raised
  uint256 private _weiRaised;

  uint256 private _cap;
  uint256 private _wallet_cap;

  uint256 private _openingTime;
  uint256 private _closingTime;

  // locked tokens (in token * decimals)
  mapping(address => uint256) private _lockedTokens;

  // per wallet investment (in wei)
  mapping(address => uint256) private _wallet_invest;

  /**
   * Event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokensPurchased(
    address indexed purchaser,
    address indexed beneficiary,
    uint256 value,
    uint256 amount
  );

  /**
   * Event for add liquidity logging
   * @param amountToken how many token were added
   * @param amountETH how many ETH were added
   * @param liquidity how many pool tokens were created
   */
  event LiquidityAdded(
    uint256 amountToken,
    uint256 amountETH,
    uint256 liquidity
  );

  /**
   * Event for claim logging
   * @param amountClaimed how many token were claimed
   */
  event TokensClaimed(address indexed beneficiary, uint256 amountClaimed);

  // Uniswap Router for providing liquidity
  IUniswapV2Router02 private constant _uniV2Router =
    IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

  // our target is providing 1125 WOLF + 75ETH initially
  // into the UNISwapv2 liquidity pool
  uint256 private constant _tokenForLp = 1125;
  uint256 private constant _ethForLp = 75;

  /**
   * @dev Reverts if not in crowdsale time range.
   */
  modifier onlyWhileOpen {
    require(isOpen(), 'not open');
    _;
  }

  /**
   * @param rate Number of token units a buyer gets per wei
   * @dev The rate is the conversion between wei and the smallest and indivisible
   * token unit. So, if you are using a rate of 1 with a ERC20Detailed token
   * with 3 decimals called TOK, 1 wei will give you 1 unit, or 0.001 TOK.
   * @param wallet Address where collected funds will be forwarded to
   * @param token Address of the token being sold
   * @param cap Max amount of wei to be contributed
   * @param wallet_cap Max amount of wei to be contributed per wallet
   * @param openingTime Crowdsale opening time
   * @param closingTime Crowdsale closing time
   */
  constructor(
    uint256 rate,
    address payable wallet,
    IERC20WolfMintable token,
    uint256 cap,
    uint256 wallet_cap,
    uint256 openingTime,
    uint256 closingTime
  ) {
    require(rate > 0, 'rate is 0');
    require(wallet != address(0), 'wallet is the zero address');
    require(address(token) != address(0), 'token is the zero address');
    require(cap > 0, 'cap is 0');
    // solhint-disable-next-line not-rely-on-time
    require(
      openingTime >= block.timestamp,
      'opening time is before current time'
    );
    // solhint-disable-next-line max-line-length
    require(closingTime > openingTime, 'opening time > closing time');

    _rate = rate;
    _wallet = wallet;
    _token = token;
    _cap = cap;
    _wallet_cap = wallet_cap;
    _openingTime = openingTime;
    _closingTime = closingTime;
  }

  /**
   * @dev fallback function ***DO NOT OVERRIDE***
   * Note that other contracts will transfer funds with a base gas stipend
   * of 2300, which is not enough to call buyTokens. Consider calling
   * buyTokens directly when purchasing tokens from a contract.
   */
  receive() external payable {
    buyTokens(_msgSender());
  }

  /**
   * @return the token being sold.
   */
  function token() public view returns (IERC20) {
    return _token;
  }

  /**
   * @return the address where funds are collected.
   */
  function wallet() public view returns (address payable) {
    return _wallet;
  }

  /**
   * @return the number of token units a buyer gets per wei.
   */
  function rate() public view returns (uint256) {
    return _rate;
  }

  /**
   * @return the amount of wei raised.
   */
  function weiRaised() public view returns (uint256) {
    return _weiRaised;
  }

  /**
   * @return the cap of the crowdsale.
   */
  function cap() public view returns (uint256) {
    return _cap;
  }

  /**
   * @return the cap per wallet of the crowdsale.
   */
  function wallet_cap() public view returns (uint256) {
    return _wallet_cap;
  }

  /**
   * @dev Checks whether the cap has been reached.
   * @return Whether the cap was reached
   */
  function capReached() public view returns (bool) {
    return weiRaised() >= _cap;
  }

  /**
   * @return the crowdsale opening time.
   */
  function openingTime() public view returns (uint256) {
    return _openingTime;
  }

  /**
   * @return the crowdsale closing time.
   */
  function closingTime() public view returns (uint256) {
    return _closingTime;
  }

  /**
   * @return true if the crowdsale is open, false otherwise.
   */
  function isOpen() public view returns (bool) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp >= _openingTime && block.timestamp <= _closingTime;
  }

  /**
   * @dev Checks whether the period in which the crowdsale is open has already elapsed.
   * @return Whether crowdsale period has elapsed
   */
  function hasClosed() public view returns (bool) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp > _closingTime;
  }

  /**
   * @dev Provide a collection of UI relevant values to reduce # of queries
   * @return ethRaised : amount eth raised (wei)
   *         timeOpen: time presale opens (unix timestamp seconds)
   *         timeClose: time presale closes (unix timestamp seconds)
   *         timeNow: current time (unix timestamp seconds)
   *         userEthAmount: amount of ETH in users wallet (wei)
   *         userEthInvest: amount of ETH users has already spend (wei)
   *         userTokenAmount: amount of token hold by user (token::decimals)
   *         userTokenLocked: amount of token users has locked (token::decimals)
   */
  function getStates(address beneficiary)
    public
    view
    returns (
      uint256 ethRaised,
      uint256 timeOpen,
      uint256 timeClose,
      uint256 timeNow,
      uint256 userEthAmount,
      uint256 userEthInvested,
      uint256 userTokenAmount,
      uint256 userTokenLocked
    )
  {
    uint256 ethAmount = beneficiary == address(0) ? 0 : beneficiary.balance;
    uint256 tokenAmount =
      beneficiary == address(0) ? 0 : _token.balanceOf(beneficiary);
    uint256 ethInvest = _wallet_invest[beneficiary];
    uint256 lockedToken = _lockedTokens[beneficiary];

    return (
      _weiRaised,
      _openingTime,
      _closingTime,
      block.timestamp,
      ethAmount,
      ethInvest,
      tokenAmount,
      lockedToken
    );
  }

  /**
   * @dev low level token purchase ***DO NOT OVERRIDE***
   * This function has a non-reentrancy guard, so it shouldn't be called by
   * another `nonReentrant` function.
   * @param beneficiary Recipient of the token purchase
   */
  function buyTokens(address beneficiary) public payable nonReentrant {
    uint256 weiAmount = msg.value;
    _preValidatePurchase(beneficiary, weiAmount);

    // calculate token amount to be created
    uint256 tokens = _getTokenAmount(weiAmount);

    // update state
    _weiRaised = _weiRaised.add(weiAmount);
    _wallet_invest[beneficiary] = _wallet_invest[beneficiary].add(weiAmount);
    _lockedTokens[beneficiary] = _lockedTokens[beneficiary].add(tokens);

    _processPurchase(beneficiary, tokens);
    emit TokensPurchased(_msgSender(), beneficiary, weiAmount, tokens);

    _updatePurchasingState(beneficiary, weiAmount);

    _forwardFunds();
    _postValidatePurchase(beneficiary, weiAmount);
  }

  /**
   * @dev claim tokens which were locked in buy step
   */
  function claimTokens() external {
    require(_lockedTokens[msg.sender] > 0, '');
    uint256 amount = _lockedTokens[msg.sender];
    _lockedTokens[msg.sender] = 0;

    _token.transfer(msg.sender, amount);
    emit TokensClaimed(msg.sender, amount);
  }

  /**
   * @dev finalize presale / create liquidity pool
   */
  function finalizePresale() external {
    require(hasClosed(), 'not closed');

    uint256 ethBalance = address(this).balance;
    require(ethBalance > 0, 'no eth balance');

    // Calculate how many token we add into liquidity pool
    uint256 tokenToLp = (ethBalance.mul(_tokenForLp)).div(_ethForLp);

    // Mint token we spend
    require(_token.mint(address(this), tokenToLp), 'minting failed');

    // Add Liquidity, receiver of pool tokens is _wallet
    _token.approve(address(_uniV2Router), tokenToLp);
    (uint256 amountToken, uint256 amountETH, uint256 liquidity) =
      _uniV2Router.addLiquidityETH{ value: ethBalance }(
        address(_token),
        tokenToLp,
        tokenToLp,
        ethBalance,
        _wallet,
        block.timestamp + 86400
      );
    emit LiquidityAdded(amountToken, amountETH, liquidity);

    // finally whitelist uniV2 LP pool on token contract
    _token.enableUniV2Pair(true);
  }

  function testSetTimes() public {
    _openingTime = block.timestamp + 300;
    _closingTime = block.timestamp + 600;
    _token.enableUniV2Pair(false);
  }

  /**
   * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
   * Use `super` in contracts that inherit from Crowdsale to extend their validations.
   * Example from CappedCrowdsale.sol's _preValidatePurchase method:
   *     super._preValidatePurchase(beneficiary, weiAmount);
   *     require(weiRaised().add(weiAmount) <= cap);
   * @param beneficiary Address performing the token purchase
   * @param weiAmount Value in wei involved in the purchase
   */
  function _preValidatePurchase(address beneficiary, uint256 weiAmount)
    internal
    view
    onlyWhileOpen
  {
    require(beneficiary != address(0), 'beneficiary is the zero address');
    require(weiAmount != 0, 'weiAmount is 0');
    require(weiRaised().add(weiAmount) <= _cap, 'cap exceeded');
    require(
      _wallet_invest[beneficiary].add(weiAmount) <= _wallet_cap,
      'wallet-cap exceeded'
    );

    // silence state mutability warning without generating bytecode - see
    // https://github.com/ethereum/solidity/issues/2691
    this;
  }

  /**
   * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid
   * conditions are not met.
   * @param beneficiary Address performing the token purchase
   * @param weiAmount Value in wei involved in the purchase
   */
  function _postValidatePurchase(address beneficiary, uint256 weiAmount)
    internal
    view
  {
    // solhint-disable-previous-line no-empty-blocks
  }

  /**
   * @dev Executed when a purchase has been validated and is ready to be executed. Doesn't necessarily emit/send
   * tokens.
   * @param beneficiary Address receiving the tokens
   * @param tokenAmount Number of tokens to be purchased
   */
  function _processPurchase(address beneficiary, uint256 tokenAmount) internal {
    require(_token.mint(address(this), tokenAmount), 'minting failed');
    // prevent unused var warning
    beneficiary;
  }

  /**
   * @dev Override for extensions that require an internal state to check for validity (current user contributions,
   * etc.)
   * @param beneficiary Address receiving the tokens
   * @param weiAmount Value in wei involved in the purchase
   */
  function _updatePurchasingState(address beneficiary, uint256 weiAmount)
    internal
  {
    // solhint-disable-previous-line no-empty-blocks
  }

  /**
   * @dev Override to extend the way in which ether is converted to tokens.
   * @param weiAmount Value in wei to be converted into tokens
   * @return Number of tokens that can be purchased with the specified _weiAmount
   */
  function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
    return weiAmount.mul(_rate);
  }

  /**
   * @dev Determines how ETH is stored/forwarded on purchases.
   */
  function _forwardFunds() internal {
    _wallet.transfer(msg.value.div(2));
  }
}
