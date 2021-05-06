/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/interfaces/IERC1155.sol';
import '../../0xerc1155/interfaces/IERC20.sol';
import '../../0xerc1155/interfaces/IERC1155TokenReceiver.sol';
import '../../0xerc1155/utils/SafeMath.sol';

import './interfaces/ICFolioItemHandler.sol';
import './interfaces/ISFTEvaluator.sol';

import '../investment/interfaces/ICFolioFarm.sol'; // Wolves rewards
import '../token/interfaces/IWOWSERC1155.sol'; // SFT contract
import '../token/interfaces/IWOWSCryptofolio.sol';
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';
import '../utils/TokenIds.sol';

/**
 * @dev CFolioItemHandlerLP manages CFolioItems, minted in the SFT contract.
 *
 * Minting CFolioItem SFTs is implemented in the WOWSSFTMinter contract, which
 * mints the SFT in the WowsERC1155 contract and calls setupCFolio in here.
 *
 * Normaly CFolioItem SFTs are locked in the main TradeFloor contract to allow
 * trading or transfer into a Base SFT card's c-folio.
 *
 * CFolioItem SFTs only earn rewards if they are inside the cfolio of a base
 * NFT. We get called from main TradeFloor every time an CFolioItem gets
 * transfered and calculate the new rewardable LP amount based on the reward %
 * of the base NFT.
 */
contract CFolioItemHandlerLP is ICFolioItemHandler {
  using SafeMath for uint256;
  using TokenIds for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // The SFT contract needed to check if the address is a c-folio
  IWOWSERC1155 private immutable _sftHolder;

  // The TradeFloor contract which provides c-folio NFTs. This TradeFloor
  // contract calls the IMinterCallback interface functions.
  address public immutable tradeFloor;

  // Only setup from SFT Minter allowed
  address public sftMinter;

  // The reward token
  IERC20 public immutable stakingToken;

  // SFT evaluator
  ISFTEvaluator public immutable sftEvaluator;

  // Reward emitter
  ICFolioFarm public immutable cfolioFarm;

  // Admin
  address public immutable admin;

  //////////////////////////////////////////////////////////////////////////////
  // Modifiers
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyTradeFloor {
    require(msg.sender == address(tradeFloor), 'TFCLP: only TF');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Constructs the CFolioItemHandlerLP
   *
   * We gather all current addresses from address registry into immutable vars.
   * If one of the relevant addresses changes, the contract has to be updated.
   * There is little state here, user state is completely handled in CFolioFarm.
   */
  constructor(IAddressRegistry addressRegistry) {
    // TradeFloor
    tradeFloor = addressRegistry.getRegistryEntry(
      AddressBook.TRADE_FLOOR_PROXY
    );

    // Admin
    admin = addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);

    // The SFT holder
    _sftHolder = IWOWSERC1155(
      addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER)
    );

    // The SFT minter
    sftMinter = addressRegistry.getRegistryEntry(AddressBook.SFT_MINTER);

    // SftEvaluator
    sftEvaluator = ISFTEvaluator(
      addressRegistry.getRegistryEntry(AddressBook.SFT_EVALUATOR_PROXY)
    );

    // The ERC-20 token we stake
    stakingToken = IERC20(
      addressRegistry.getRegistryEntry(AddressBook.UNISWAP_V2_PAIR)
    );

    // WOWS reward farm
    cfolioFarm = ICFolioFarm(
      addressRegistry.getRegistryEntry(AddressBook.WOLVES_REWARDS)
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICFolioItemCallback} via {ICFolioItemHandler}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICFolioItemCallback-onCFolioItemsTransferedFrom}
   */
  function onCFolioItemsTransferedFrom(
    address from,
    address to,
    uint256[] calldata, /* tokenIds*/
    address[] calldata /* cfolioHandlers*/
  ) external override onlyTradeFloor {
    // In case of transfer verify the target
    uint256 sftTokenId;

    if (
      to != address(0) &&
      (sftTokenId = _sftHolder.addressToTokenId(to)) != uint256(-1)
    ) {
      (, uint8 level) = _sftHolder.getTokenData(sftTokenId);
      require((LEVEL2WOLF & (uint256(1) << level)) > 0, 'CFIH: Wolves only');
      _updateRewards(to, sftEvaluator.rewardRate(sftTokenId));
    }

    if (
      from != address(0) &&
      (sftTokenId = _sftHolder.addressToTokenId(from)) != uint256(-1)
    ) _updateRewards(from, sftEvaluator.rewardRate(sftTokenId));
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICFolioItemHandler}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICFolioItemHandler-sftUpgrade}
   */
  function sftUpgrade(uint256 tokenId, uint32 newRate) external override {
    // Validate access
    require(msg.sender == address(sftEvaluator), 'Invalid caller');
    require(tokenId.isBaseCard(), 'Invalid token');

    // CFolio address
    address cfolio = _sftHolder.tokenIdToAddress(tokenId);

    // Update state
    _updateRewards(cfolio, newRate);
  }

  /**
   * @dev See {ICFolioItemHandler-setupCFolio}
   *
   * Note: We place a dummy ERC1155 token with id 0 into the CFolioItem's
   * c-folio. The reason is that we want to know if a c-folio item gets burned,
   * as burning an empty c-folio will result in no transfers. This prevents LP
   * tokens from becoming inaccessible.
   *
   * Refer to the Minimal ERC1155 section below to learn which functions are
   * needed for this.
   */
  function setupCFolio(
    address payer,
    uint256 sftTokenId,
    uint256[] calldata amounts
  ) external override {
    // Validate access
    require(msg.sender == sftMinter, 'Only SFTMinter');

    // Validate parameters
    address cFolio = _sftHolder.tokenIdToAddress(sftTokenId);
    require(cFolio != address(0), 'Invalid sftTokenId');

    // Verify that this function is called the first time
    try IWOWSCryptofolio(cFolio)._tradefloors(0) returns (address) {
      revert('CFIH: TradeFloor not empty');
    } catch {}

    if (amounts.length > 0 && amounts[0] > 0) {
      // Transfer LP token to this contract
      stakingToken.transferFrom(payer, address(this), amounts[0]);

      // Record assets in Farm contract. They don't earn rewards.
      // addAsset must only be called from Investment CFolios
      cfolioFarm.addAssets(cFolio, amounts[0]);
    }

    // Transfer a dummy NFT token to cFolio so we get informed if the cFolio
    // gets burned
    IERC1155TokenReceiver(cFolio).onERC1155Received(
      address(this),
      address(0),
      0,
      1,
      ''
    );
  }

  /**
   * @dev See {ICFolioItemCallback-deposit}
   *
   * Note: tokenId cannot be owned by a base SFT.
   *
   * There is no need to update any rewards.
   */
  function deposit(uint256 tokenId, uint256[] calldata amounts)
    external
    override
  {
    require(amounts.length == 1 && amounts[0] > 0, 'CFIH: invalid amount');
    IWOWSCryptofolio cFolio = _verifyAssetAccess(tokenId);

    // Transfer LP token to this contract
    stakingToken.transferFrom(msg.sender, address(this), amounts[0]);

    // Record assets in the Farm contract. They don't earn rewards.
    // addAssets must only be called from Investment CFolios
    cfolioFarm.addAssets(address(cFolio), amounts[0]);
  }

  /**
   * @dev See {ICFolioItemCallback-withdraw}
   *
   * Note: tokenId cannot be owned by a base SFT.
   *
   * There is no need to update any rewards.
   */
  function withdraw(uint256 tokenId, uint256[] calldata amounts)
    external
    override
  {
    require(amounts.length == 1 && amounts[0] > 0, 'CFIH: invalid amount');
    IWOWSCryptofolio cFolio = _verifyAssetAccess(tokenId);

    // Record assets in Farm contract. They don't earn rewards.
    // addAsset must only be called from Investment CFolios
    cfolioFarm.removeAssets(address(cFolio), amounts[0]);

    // Transfer LP token from this contract
    stakingToken.transferFrom(address(this), msg.sender, amounts[0]);
  }

  /**
   * @dev See {ICFolioItemCallback-getRewards}
   *
   * Note: tokenId must be a base SFT card
   *
   * We allow reward pull only for unlocked SFTs
   */
  function getRewards(address recipient, uint256 tokenId) external override {
    // Validate parameters
    require(tokenId.isBaseCard(), 'CFIH: Invalid tokenId');

    // Verify that tokenId has a valid cFolio address
    address cfolio = _sftHolder.tokenIdToAddress(tokenId);
    require(cfolio != address(0), 'Invalid c-folio address');

    // Verify that the tokenId is owned by msg.sender in the SFT contract.
    // This also verifies that the token is not locked in TradeFloor.
    require(
      IERC1155(address(_sftHolder)).balanceOf(msg.sender, tokenId) == 1,
      'CFHI: Access denied'
    );

    cfolioFarm.getReward(cfolio, recipient);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Maintanace
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Upgrade contract
   */
  function upgradeContract(CFolioItemHandlerLP newContract) external {
    // Validate access
    require(msg.sender == admin, 'Admin only');

    // Update state
    stakingToken.transfer(
      address(newContract),
      stakingToken.balanceOf(address(this))
    );
    selfdestruct(payable(address(newContract)));
  }

  /**
   * @dev Upgrade contract
   */
  function setMinter(address newMinter) external {
    // Validate access
    require(msg.sender == admin, 'Admin only');

    sftMinter = newMinter;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Minimal ERC1155 implementation (called from SFTBase CFolio)
  //////////////////////////////////////////////////////////////////////////////

  // We do nothing for our dummy burn tokenId
  function setApprovalForAll(address, bool) external {}

  // Check for length == 1, and then return always 1
  function balanceOfBatch(address[] calldata _owners, uint256[] calldata _ids)
    external
    pure
    returns (uint256[] memory)
  {
    require(_owners.length == 1 && _ids.length == 1, 'Length must be 1');

    uint256[] memory result = new uint256[](1);
    result[0] = 1;
    return result;
  }

  /**
   * @dev We don't allow burning non-empty c-folios
   */
  function burnBatch(
    address, /* account */
    uint256[] calldata tokenIds,
    uint256[] calldata
  ) external view {
    // Validate parameters
    require(tokenIds.length == 1, 'Length must be 1');

    // This call originates from the c-folio. We revert if there are investment
    // amounts left for this c-folio address.
    require(cfolioFarm.balanceOf(msg.sender) == 0, 'CFIH: not empty');
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Run through all cFolioItems collected in cFolio and
   * select the amount of LP tokens. Update cfolioFarm.
   */
  function _updateRewards(address cfolio, uint32 rate) private {
    // Get c-folio items of this base cFolio
    (uint256[] memory tokenIds, uint256 length) =
      IWOWSCryptofolio(cfolio).getCryptofolio(tradeFloor);

    // Calculate new reward amount
    uint256 newRewardAmount = 0;
    for (uint256 i = 0; i < length; ++i) {
      address secondaryCFolio = _sftHolder.tokenIdToAddress(tokenIds[i]);
      require(secondaryCFolio != address(0), 'CFIH: Invalid secondary cFolio');
      if (IWOWSCryptofolio(secondaryCFolio)._tradefloors(0) == address(this))
        newRewardAmount = newRewardAmount.add(
          cfolioFarm.balanceOf(secondaryCFolio)
        );
    }
    newRewardAmount = newRewardAmount.mul(rate).div(1E6);

    // Calculate existing reward amount
    uint256 exitingRewardAmount = cfolioFarm.balanceOf(cfolio);

    // Compare amounts and add/remove shares
    if (newRewardAmount > exitingRewardAmount)
      cfolioFarm.addShares(cfolio, newRewardAmount.sub(exitingRewardAmount));
    else if (newRewardAmount < exitingRewardAmount)
      cfolioFarm.removeShares(cfolio, exitingRewardAmount.sub(newRewardAmount));
  }

  /**
   * @dev Verifies if an asset access operation is allowed
   */
  function _verifyAssetAccess(uint256 tokenId)
    private
    view
    returns (IWOWSCryptofolio)
  {
    // Verify it's a cfolioItemTokenId
    require(tokenId.isCFolioCard(), 'CFHI: Not CFolioCard');

    // Verify that the tokenId is one of ours
    IWOWSCryptofolio cFolio =
      IWOWSCryptofolio(_sftHolder.tokenIdToAddress(tokenId));
    require(address(cFolio) != address(0), 'CFIH: Invalid cFolioTokenId');
    require(cFolio._tradefloors(0) == address(this), 'CFIH: Not our SFT');

    // Verify that the tokenId is owned by msg.sender in SFT contract.
    // This also verifies that the token is not locked in TradeFloor.
    require(
      IERC1155(address(_sftHolder)).balanceOf(msg.sender, tokenId) == 1,
      'CFHI: Access denied'
    );

    return cFolio;
  }
}
