/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/interfaces/IERC20.sol';

import './interfaces/ITradefloorClient.sol'; // Callbacks into this contract

import '../token/interfaces/IERC1155BurnMintable.sol'; // Tradefloor
import '../token/interfaces/IWOWSERC1155.sol'; // SFT contract
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';
  //curve interfaces 
import './interfaces/CurveDepositInterface.sol';
import './interfaces/CurveGaugeInterface.sol';
import './interfaces/CurveMinterInterface.sol';
import './interfaces/YTokenInterface.sol';



/**
 * @dev Contract which handles Liquidity Pool token staking.
 *
 * This contract expects LP tokens and will in return provide
 * 1:1 LP Token NFT's from the TradingFloor.
 * In case the recipient is an SFT Cryptofolio, we add shares
 * to the Rewardpool depending the value of the Cryptofolio.
 *
 * No rewards are provided if the recipient is not a c-folio
 *
 * We only implement deposit(), transfer and burn are performed
 * with burning / transfering the TF NFT's in TF contract
 */
contract TradeFloorClientLP is ITradefloorClient {
  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // The SFT contract needed to check if address is c-folio
  IWOWSERC1155 private immutable _sftHolder;

  // The tradeFloor contract which provides c-folio NFTs
  // This tradeFloor contract calls this IMinterCallback interface functions
  IERC1155BurnMintable public immutable tradeFloor;

  // The fungible NFT tokenId minted in tradeFloor contract
  // We mint 1:1 incoming LP <-> NFT but only reward a part
  uint256 public immutable tradeFloorTokenId;

  // The reward token
  IERC20 public immutable stakingToken;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Construct the contract
   *
   * @param addressRegistry registry containing our system addresses
   * We will use SFTHolder and Rewardhandler from this registry
   * @param stakingToken_ The token we stake in this contract
   * @param tradeFloor_ The tradeFloor which manages our NFT representations
   * @param tradeFloorTokenId_ our fixed c-folio tokenId in tradeFloor contract
   * c-folio tokenIds must be >= 0x10000000000000000;
   *
   * Note: Pause operation in this context. Only calls from Proxy allowed
   */
  constructor(
    IAddressRegistry addressRegistry,
    IERC20 stakingToken_,
    IERC1155BurnMintable tradeFloor_,
    uint256 tradeFloorTokenId_
  ) {
    // The SFT holder
    _sftHolder = IWOWSERC1155(
      addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER)
    );
    // The ERC20 token we stake
    stakingToken = stakingToken_;
    // The tradeFloor we are interacting with
    tradeFloor = tradeFloor_;
    // Fixed tokenId for this investment contract
    tradeFloorTokenId = tradeFloorTokenId_;
  }

  //curve deposit, please remove this after checking If I was doin it right way
   function YCurveDeposit(uint256[4] memory _amounts) public {
        address[4] memory stablecoins = ICurveFi_DepositY(curveFi_Deposit).underlying_coins();

        for (uint256 i = 0; i < stablecoins.length; i++) {
            IERC20(stablecoins[i]).safeTransferFrom(_msgSender(), address(this), _amounts[i]);
            IERC20(stablecoins[i]).safeApprove(curveFi_Deposit, _amounts[i]);
        }

        //Step 1 - deposit stablecoins and get Curve.Fi LP tokens
        ICurveFi_DepositY(curveFi_Deposit).add_liquidity(_amounts, 0); //0 to mint all Curve has to 

        //Step 2 - stake Curve LP tokens into Gauge and get CRV rewards
        //uint256 curveLPBalance = IERC20(curveFi_LPToken).balanceOf(address(this));

        // IERC20(curveFi_LPToken).safeApprove(curveFi_LPGauge, curveLPBalance);
        // ICurveFi_Gauge(curveFi_LPGauge).deposit(curveLPBalance);

        //Step 3 - get all the rewards (and make whatever you need with them)
        crvTokenClaim();
        uint256 crvAmount = IERC20(curveFi_CRVToken).balanceOf(address(this));
        IERC20(curveFi_CRVToken).safeTransfer(_msgSender(), crvAmount);
    }
    function YCurveWithdraw(uint256[4] memory _amounts) public {
        address[4] memory stablecoins = ICurveFi_DepositY(curveFi_Deposit).underlying_coins();

        //Step 1 - Calculate amount of Curve LP-tokens to unstake
        uint256 nWithdraw;
        uint256 i;
        for (i = 0; i < stablecoins.length; i++) {
            nWithdraw = nWithdraw.add(normalize(stablecoins[i], _amounts[i]));
        }
        uint256 withdrawShares = calculateShares(nWithdraw);

        //Check if you can re-use unstaked LP tokens
        uint256 notStaked = curveLPTokenUnstaked();
        if (notStaked > 0) {
            withdrawShares = withdrawShares.sub(notStaked);
        }

        //Step 2 - Unstake Curve LP tokens from Gauge
        //ICurveFi_Gauge(curveFi_LPGauge).withdraw(withdrawShares);
    
        //Step 3 - Withdraw stablecoins from CurveDeposit
        // IERC20(curveFi_LPToken).safeApprove(curveFi_Deposit, withdrawShares);
        // ICurveFi_DepositY(curveFi_Deposit).remove_liquidity_imbalance(_amounts, withdrawShares);
        
    }

  
  //////////////////////////////////////////////////////////////////////////////
  // Interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev deposits amount stakingToken into this contract
   *
   * @notice rewardToken. msg.sender has to be approved this contract to pull
   */
  function deposit(address recipient, uint256 amount) external {
    // Transfer LP token to this contract
    stakingToken.transferFrom(msg.sender, address(this), amount);
    // mint tradeFloor NFT's into recipient
    tradeFloor.mint(
      recipient,
      tradeFloorTokenId,
      amount,
      _toBytes(address(this))
    );

    // only parts of the investment are inserted into rewardhandler
    // in case recipient is an SFT
    // Note: transfers into locked SFT's are reverted in TF contract
    uint32 rewardRate = 0;
    if (_sftHolder.addressToTokenId(recipient) != uint256(-1)) {
      // 1.) TODO: get the reward % by calling the card evaluator contract
      // 2.) TODO: invest the % into the reward contract / logic
    }
    emit Deposit(msg.sender, recipient, amount, rewardRate);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of ITradefloorClient
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev upgrade callback, called from SFT evaluator contract if
   * the value of an SFT has (potentially) changed.
   *
   * For this contract we will add more shares into the reward contract.
   */
  function upgrade(uint256 tokenId) external override {
    tokenId;
    // TODO: adjust rewardrate
  }

  /**
   * @dev Called from Tradefloor of tokens have been transfered.
   *
   * See {IMinterCallback-_onTransferFrom}.
   *
   * We have to transfer / remove reward shares here
   * depending if from / to is a c-folio or not
   */
  function onTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 amount
  ) external override {
    // TODO: transfer elements from -> to
    // -> remove / add reward share in case from/to is c-folio
  }

  /**
   * @dev Called from Tradefloor if tokens have been burned.
   *
   * See {IMinterCallback-_onBurn}.
   *
   * We have to remove reward shares here, and payout underlying
   * assets. Pending rewards can be left inside SFT.
   */
  function onBurn(
    address recipient,
    address, /* account*/
    uint256 tokenId,
    uint256 amount
  ) external override {
    require(msg.sender == address(tradeFloor), 'onBurn: only TF');
    require(tokenId == tradeFloorTokenId, 'onBurn: wrong tokenId');

    // Transfer lpTokens back to to recipient
    stakingToken.transferFrom(address(this), recipient, amount);

    // TODO: handle rewards
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  function _toBytes(address addr) private pure returns (bytes memory) {
    return abi.encodePacked(addr);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  event Deposit(
    address indexed user,
    address indexed recipient,
    uint256 amount,
    uint32 rewardRate
  );
  event Withdraw(
    address indexed user,
    address indexed recipient,
    uint256 amount,
    uint32 rewardRate
  );
}
