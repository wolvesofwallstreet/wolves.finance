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
import './interfaces/ISftEvaluator.sol';

import '../token/interfaces/ITradeFloor.sol'; // Tradefloor
import '../token/interfaces/IERC1155BurnMintable.sol'; // Tradefloor
import '../token/interfaces/IWOWSERC1155.sol'; // SFT contract
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';

interface ITradeFloorBurnMint is ITradeFloor, IERC1155BurnMintable {}

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
contract TradeFloorClientLP is ITradeFloorClient {
  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // The SFT contract needed to check if address is c-folio
  IWOWSERC1155 private immutable _sftHolder;

  // The tradeFloor contract which provides c-folio NFTs
  // This tradeFloor contract calls this IMinterCallback interface functions
  ITradeFloorBurnMint public immutable tradeFloor;

  // The fungible NFT tokenId minted in tradeFloor contract
  // We mint 1:1 incoming LP <-> NFT but only reward a part
  uint256 public immutable tradeFloorTokenId;

  // The reward token
  IERC20 public immutable stakingToken;

  // SFT evaluator
  ISftEvaluator public immutable sftEvaluator;

  // admin
  address public immutable admin;

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
    ITradeFloorBurnMint tradeFloor_,
    uint256 tradeFloorTokenId_
  ) {
    // The SFT holder
    _sftHolder = IWOWSERC1155(
      addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER)
    );
    // admin
    admin = addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);
    // TODO: SftEvaluator
    // addressRegistry.getRegistryEntry(AddressBook.SFT_EVALUATOR);
    sftEvaluator = ISftEvaluator(address(0));

    // The ERC20 token we stake
    stakingToken = stakingToken_;
    // The tradeFloor we are interacting with
    tradeFloor = tradeFloor_;
    // Fixed tokenId for this investment contract
    tradeFloorTokenId = tradeFloorTokenId_;
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

  /**
   * @dev upgrade contract callback, call if this contract gets upgraded
   */
  function upgradeContract(TradeFloorClientLP newContract) external {
    require(msg.sender == admin, 'admin only');
    require(
      newContract.tradeFloorTokenId() == tradeFloorTokenId,
      'tokenId mismatch'
    );

    stakingToken.transfer(
      address(newContract),
      stakingToken.balanceOf(address(this))
    );
    tradeFloor.setMinter(tradeFloorTokenId, address(newContract));

    selfdestruct(payable(address(newContract)));
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of ITradefloorClient
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev sftUpgrade callback, called from SFT evaluator contract if
   * the value of an SFT has (potentially) changed.
   *
   * For this contract we will add more shares into the reward contract.
   */
  function sftUpgrade(
    // solhint-disable-next-line no-unused-vars
    uint256 tokenId,
    // solhint-disable-next-line no-unused-vars
    uint32 prevRate,
    // solhint-disable-next-line no-unused-vars
    uint32 newRate
  ) external override {
    require(msg.sender == address(sftEvaluator), 'invalid caller');
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
    stakingToken.transfer(recipient, amount);

    // TODO: handle rewards
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  function _toBytes(address addr) private pure returns (bytes memory) {
    return abi.encodePacked(addr);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Events
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
