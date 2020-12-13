/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20Capped.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

import 'contracts/interfaces/uniswap/IUniswapV2Router02.sol';
import 'contracts/interfaces/uniswap/IUniswapV2Factory.sol';
import 'contracts/interfaces/uniswap/IUniswapV2Pair.sol';

contract WolfToken is ERC20Capped, AccessControl {
  /**
   * @dev The ERC 20 token name used by wallets to identify the token
   */
  string private constant TOKEN_NAME = 'Wolf Token';

  /**
   * @dev The ERC 20 token symbol used as an abbreviation of the token, such
   * as BTC, ETH, AUG or SJCX.
   */
  string private constant TOKEN_SYMBOL = 'WOW';

  /**
   * @dev The number of decimal places to which the token will be calculated.
   * The most common number of decimals to consider is 18.
   */
  uint8 private constant TOKEN_DECIMALS = 18;

  /**
   * @dev 60.000 tokens maximal supply
   */
  uint256 private constant MAX_SUPPLY = 60000 * 1e18;

  /**
   * @dev Role to allow minting of new tokens
   */
  bytes32 public constant MINTER_ROLE = 'minter_role';

  IUniswapV2Factory private constant _uniV2Factory =
    IUniswapV2Factory(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);
  IUniswapV2Router02 private constant _uniV2Router =
    IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

  address public immutable _uniV2Pair;

  /**
   * @dev If true, this pair is blocked
   */
  mapping(address => bool) _uniV2Blacklist;
  uint256 _uniV2PairsScanned = _uniV2Factory.allPairsLength();

  /**
   * @dev Construct a token instance
   *
   * @param _teamWallet The team wallet to receive initial supply
   */
  constructor(address _teamWallet)
    ERC20Capped(MAX_SUPPLY)
    ERC20(TOKEN_NAME, TOKEN_SYMBOL)
  {
    // Initialize ERC20 base
    _setupDecimals(TOKEN_DECIMALS);

    /*
     * Mint 9875 into teams wallet
     *
     *   1.) 500 tokens * 15 month = 7500 team rewards
     *   2.) 1375 token for development costs (audits / bug-bounty ...)
     *   3.) 1000 token for marketing (influencer / design ...)
     */
    _mint(_teamWallet, 9875 * 1e18);

    // Multi-sig teamwallet has initial admin rights, eg for adding minters
    _setupRole(DEFAULT_ADMIN_ROLE, _teamWallet);

    // Create the UniV2 liquidity pool
    address weth = _uniV2Router.WETH();
    _uniV2Pair = _uniV2Factory.createPair(address(this), weth);
    _updateUniV2Blacklist();
  }

  /**
   * @dev Mint tokens
   *
   * @param account The account to receive the tokens
   * @param amount The amount to mint
   *
   * @return True if successful, reverts on failure
   */
  function mint(address account, uint256 amount) external returns (bool) {
    // Mint is only allowed by addresses with minter role
    require(hasRole(MINTER_ROLE, msg.sender), 'Only minters allowed');

    _mint(account, amount);

    return true;
  }

  /**
   * @dev Remove ETH/WOLF univ2 pair address from blacklist
   *
   * @param enable True to enable the univ2 pair, false to disable
   */
  function enableUniV2Pair(bool enable) external {
    require(hasRole(MINTER_ROLE, msg.sender));
    _uniV2Blacklist[_uniV2Pair] = !enable;
  }

  /**
   * @dev Remove univ2 pair address from blacklist
   *
   * @param pairAddress The address of the univ2 pair
   */
  function enableUniV2Pair(address pairAddress) external {
    require(
      hasRole(MINTER_ROLE, msg.sender) ||
        hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
    );
    _uniV2Blacklist[pairAddress] = false;
  }

  /**
   * @dev Add univ2 pair address to blacklist
   */
  function disableUniV2Pair(address pairAddress) external {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender));
    _uniV2Blacklist[pairAddress] = true;
  }

  /**
   * @dev Request the state of the univ2 pair address
   */
  function isUniV2PairEnabled(address pairAddress)
    external
    view
    returns (bool)
  {
    return !_uniV2Blacklist[pairAddress];
  }

  /**
   * @dev Override to prevent creation of uniswap LP's with WOLF token
   */
  function _transfer(
    address sender,
    address recipient,
    uint256 amount
  ) internal override {
    // Minters are always allowed to transfer
    _updateUniV2Blacklist();
    require(
      hasRole(MINTER_ROLE, sender) || !_uniV2Blacklist[recipient],
      'forbidden'
    );
    super._transfer(sender, recipient, amount);
  }

  /**
   * Update _uniV2Blacklist by scanning all new pairs listed in UniswapV2,
   * and blacklist all WOLF related pairs by default.
   * Only minter and admin role are allowed to enable initial blacklisted
   * pairs. Goal is to let us initialize uniV2 pairs with a ratio defined
   * from concept.
   */
  function _updateUniV2Blacklist() internal {
    // Scan new UniV2Pairs
    uint256 newPairCount = _uniV2Factory.allPairsLength();
    if (newPairCount > _uniV2PairsScanned) {
      for (
        uint256 current = _uniV2PairsScanned;
        current < newPairCount;
        current++
      ) {
        IUniswapV2Pair pair = IUniswapV2Pair(_uniV2Factory.allPairs(current));
        if (pair.token0() == address(this) || pair.token1() == address(this))
          _uniV2Blacklist[address(pair)] = true;
      }
      _uniV2PairsScanned = newPairCount;
    }
  }
}
