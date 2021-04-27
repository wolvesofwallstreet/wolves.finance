/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/interfaces/IERC20.sol';
import '../../0xerc1155/utils/SafeMath.sol';

import '../investment/interfaces/ICFolioFarm.sol'; // Wolves rewards
import '../token/interfaces/IERC1155BurnMintable.sol'; // Tradefloor
import '../token/interfaces/ITradeFloor.sol'; // Tradefloor
import '../token/interfaces/IWOWSERC1155.sol'; // SFT contract
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';

import './interfaces/ISFTEvaluator.sol';
import './interfaces/ITradeFloorClient.sol'; // Callbacks into this contract

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
  using SafeMath for uint256;

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

  // The number of NFT tokens we allocate for this client
  uint16 public numTradeFloorTokenIds;

  // The reward token
  IERC20 public immutable stakingToken;

  // SFT evaluator
  ISFTEvaluator public immutable sftEvaluator;

  // Rewarder
  ICFolioFarm public immutable cfolioFarm;

  // Admin
  address public immutable admin;

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

  /**
   * @dev Emitted when the number of allocated token IDs changes
   *
   * @param newCount The new number of NFT tokens we have allocated for this client
   */
  event TokenIdCountChanged(uint256 newCount);

  //////////////////////////////////////////////////////////////////////////////
  // Modifier
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyTradeFloor {
    require(msg.sender == address(tradeFloor), 'TFCLP: only TF');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Construct the contract
   *
   * @param addressRegistry registry containing our system addresses
   * We will use SFTHolder and Rewardhandler from this registry
   * @param tradeFloor_ The tradeFloor which manages our NFT representations
   * @param tradeFloorTokenId_ our base c-folio tokenId in tradeFloor contract
   * c-folio tokenIds must be >= 0x10000000000000000;
   * @param numTradeFloorTokenIds_ Number of tokenIds to allocate
   *
   * Note: Pause operation in this context. Only calls from Proxy allowed
   */
  constructor(
    IAddressRegistry addressRegistry,
    ITradeFloorBurnMint tradeFloor_,
    uint256 tradeFloorTokenId_,
    uint16 numTradeFloorTokenIds_
  ) {
    // The SFT holder
    _sftHolder = IWOWSERC1155(
      addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER)
    );

    // Admin
    admin = addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);

    // SftEvaluator
    sftEvaluator = ISFTEvaluator(
      addressRegistry.getRegistryEntry(AddressBook.SFT_EVALUATOR_PROXY)
    );

    // The ERC20 token we stake
    stakingToken = IERC20(
      addressRegistry.getRegistryEntry(AddressBook.UNISWAP_V2_PAIR)
    );

    // WOWS reward farm
    cfolioFarm = ICFolioFarm(
      addressRegistry.getRegistryEntry(AddressBook.WOLVES_REWARDS)
    );

    // The tradeFloor we are interacting with
    tradeFloor = tradeFloor_;

    // Fixed base tokenId for this investment contract
    tradeFloorTokenId = tradeFloorTokenId_;

    // Fixed number of tokenIds for this investment contract
    numTradeFloorTokenIds = numTradeFloorTokenIds_;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Setters
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Increase possible tokenIds for this contract
   */
  function setNumTokenIds(uint16 newCount) external {
    // Validate access
    require(msg.sender == admin, 'TFCLP: admin only');

    // Validate parameters
    require(newCount > numTradeFloorTokenIds, 'TFCLP: increase only');

    // Update state
    numTradeFloorTokenIds = newCount;

    // Dispatch events
    emit TokenIdCountChanged(newCount);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev deposits amount stakingToken into this contract
   *
   * @notice rewardToken. msg.sender has to be approved this contract to pull
   *
   * @param recipient will receive the nft's
   * @param tokenId the tokenId to mint
   * @param amount the fungible amount to mint
   */
  function deposit(
    address recipient,
    uint256 tokenId,
    uint256 amount
  ) external {
    // Validate parameters
    require(_verifyTokenId(tokenId), 'TFCLP: wrong tokenId');

    // Revert if recipient is not a valid target
    _transferAllowed(recipient);

    // Transfer LP token to this contract
    stakingToken.transferFrom(msg.sender, address(this), amount);

    // Mint tradeFloor NFT's into recipient
    tradeFloor.mint(recipient, tokenId, amount, _toBytes(address(this)));

    // Only parts of the investment are inserted into rewardhandler
    // in case recipient is an SFT
    // Note: transfers into locked SFT's are reverted in TF contract
    uint32 rewardRate = 0;
    uint256 sftTokenId = _sftHolder.addressToTokenId(recipient);
    if (sftTokenId != uint256(-1)) {
      rewardRate = sftEvaluator.rewardRate(sftTokenId);
      uint256 rewardAmount = amount.mul(rewardRate).div(1E6);
      cfolioFarm.addShares(recipient, rewardAmount);
    }

    // Dispatch events
    emit Deposit(msg.sender, recipient, amount, rewardRate);
  }

  /**
   * @dev Upgrade contract callback, call if this contract gets upgraded
   */
  function upgradeContract(TradeFloorClientLP newContract) external {
    // Valid access
    require(msg.sender == admin, 'Admin only');

    // Validate parameters
    require(
      newContract.tradeFloorTokenId() == tradeFloorTokenId,
      'tokenId mismatch'
    );

    // Update state
    stakingToken.transfer(
      address(newContract),
      stakingToken.balanceOf(address(this))
    );
    tradeFloor.setMinter(
      tradeFloorTokenId,
      numTradeFloorTokenIds,
      address(newContract)
    );

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
  function sftUpgrade(uint256 tokenId, uint32 newRate) external override {
    // Validate access
    require(msg.sender == address(sftEvaluator), 'Invalid caller');

    // CFolio address
    address cfolio = _sftHolder.tokenIdToAddress(tokenId);

    _updateRewards(cfolio, newRate);
  }

  /**
   * @dev Called from Tradefloor when tokens have been transfered.
   *
   * See {IMinterCallback-_onTransferFrom}.
   *
   * We have to transfer / remove reward shares here depending on whether
   * `from` or `to` are a c-folio or not.
   */
  function onTransferFrom(
    address caller,
    address from,
    address to,
    uint256[] calldata tokenIds,
    uint256[] calldata amounts,
    bytes calldata /* data*/
  ) external override onlyTradeFloor {
    // Validate parameters
    require(tokenIds.length == amounts.length, 'TFCLP: length mismatch');

    // In case of transfer verify the target
    if (to != address(0)) _transferAllowed(to);

    // Sum amount of tokens which get transfered
    uint256 amountTransfered = 0;
    for (uint256 i = 0; i < tokenIds.length; ++i) {
      if (_verifyTokenId(tokenIds[i]))
        amountTransfered = amountTransfered.add(amounts[i]);
    }

    uint256 sftTokenId;
    if (to == address(0)) {
      // Transfer lpTokens back to to recipient
      stakingToken.transfer(caller, amountTransfered);
    } else if ((sftTokenId = _sftHolder.addressToTokenId(to)) != uint256(-1)) {
      _updateRewards(to, sftEvaluator.rewardRate(sftTokenId));
    }
    if ((sftTokenId = _sftHolder.addressToTokenId(from)) != uint256(-1))
      _updateRewards(from, sftEvaluator.rewardRate(sftTokenId));
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  function _toBytes(address addr) private pure returns (bytes memory) {
    return abi.encodePacked(addr);
  }

  function _verifyTokenId(uint256 tokenId) private view returns (bool) {
    return
      tokenId >= tradeFloorTokenId &&
      tokenId < tradeFloorTokenId + numTradeFloorTokenIds;
  }

  /**
   * @dev Reverts if NFT's from this contract can not be transfered to recipient.
   */
  function _transferAllowed(address recipient) private view {
    // Validate parameters
    require(recipient != address(0), 'TFCLP: null address');

    // This NFT handler is only allowed for wolves
    uint256 sftTokenId = _sftHolder.addressToTokenId(recipient);
    if (sftTokenId != uint256(-1)) {
      (, uint8 level) = _sftHolder.getTokenData(sftTokenId);
      require((LEVEL2WOLF & (uint256(1) << level)) > 0, 'TFCLP: Wolves only');
    }
  }

  function _updateRewards(address cfolio, uint32 newRate) private {
    // count NFT available
    uint256 tokenIdEnd = tradeFloorTokenId + numTradeFloorTokenIds;
    uint256 newRewardAmount = 0;
    for (uint256 i = tradeFloorTokenId; i < tokenIdEnd; ++i)
      newRewardAmount = newRewardAmount.add(tradeFloor.balanceOf(cfolio, i));
    if (newRewardAmount > 0) {
      newRewardAmount = newRewardAmount.mul(newRate).div(1E6);
      uint256 exitingRewardAmount = cfolioFarm.balanceOf(cfolio);
      if (newRewardAmount > exitingRewardAmount)
        cfolioFarm.addShares(cfolio, newRewardAmount.sub(exitingRewardAmount));
      else
        cfolioFarm.removeShares(
          cfolio,
          exitingRewardAmount.sub(newRewardAmount)
        );
    }
  }
}
