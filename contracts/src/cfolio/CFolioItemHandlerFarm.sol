/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/utils/Context.sol';

import '../../0xerc1155/interfaces/IERC1155.sol';
import '../../0xerc1155/utils/SafeMath.sol';

import '../investment/interfaces/ICFolioFarm.sol'; // WOWS rewards
import '../token/interfaces/IWOWSERC1155.sol'; // SFT contract
import '../token/interfaces/IWOWSCryptofolio.sol';
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';
import '../utils/TokenIds.sol';

import './interfaces/ICFolioItemHandler.sol';
import './interfaces/ISFTEvaluator.sol';

/**
 * @dev CFolioItemHandlerFarm manages CFolioItems, minted in the SFT contract.
 *
 * Minting CFolioItem SFTs is implemented in the WOWSSFTMinter contract, which
 * mints the SFT in the WowsERC1155 contract and calls setupCFolio in here.
 *
 * Normaly CFolioItem SFTs are locked in the main TradeFloor contract to allow
 * trading or transfer into a Base SFT card's c-folio.
 *
 * CFolioItem SFTs only earn rewards if they are inside the cfolio of a base
 * NFT. We get called from main TradeFloor every time an CFolioItem gets
 * transfered and calculate the new rewardable amount based on the reward %
 * of the base NFT.
 */
abstract contract CFolioItemHandlerFarm is ICFolioItemHandler, Context {
  using SafeMath for uint256;
  using TokenIds for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  // Route to SFT Minter. Need for getRewards access.
  address private immutable _sftMinter;

  // SFT evaluator
  ISFTEvaluator private immutable _sftEvaluator;

  // Reward emitter
  ICFolioFarmOwnable internal immutable _cfolioFarm;

  // Admin
  address private immutable _admin;

  // The SFT contract needed to check if the address is a c-folio
  IWOWSERC1155 internal immutable _sftHolder;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /*
   * @dev Emitted when the contract is contstructed
   *
   * @param admin The immutable admin address
   * @param sftHolder The immutable sftHolder address
   * @param sftMinter The immutable sftMinter address
   * @param sftEvaluator The immutable sftEvaluator address
   * @param cfolioFarm The immutable cfolioFarm address
   */
  event Constructed(
    address admin,
    address sftHolder,
    address sftMinter,
    address sftEvaluator,
    address cfolioFarm
  );

  /*
   * @dev Emitted when a reward is updated, either increased or decreased
   *
   * @param previousAmount The amount before updating the reward
   * @param newAmount The amount after updating the reward
   */
  event RewardUpdated(uint256 previousAmount, uint256 newAmount);

  /**
   * @dev Emitted when the contract is destructed
   *
   * @param thisContract The address of this contract
   */
  event CFolioItemHandlerDestructed(address thisContract);

  //////////////////////////////////////////////////////////////////////////////
  // Modifiers
  //////////////////////////////////////////////////////////////////////////////

  modifier onlySFTHolder() {
    require(_msgSender() == address(_sftHolder), 'CFHI: Only SFTH');
    _;
  }

  modifier onlyAdmin() {
    require(_msgSender() == _admin, 'CFIH: Only admin');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Constructs the CFolioItemHandlerFarm
   *
   * We gather all current addresses from address registry into immutable vars.
   * If one of the relevant addresses changes, the contract has to be updated.
   * There is little state here, user state is completely handled in CFolioFarm.
   */
  constructor(IAddressRegistry addressRegistry, bytes32 rewardFarmKey) {
    // Admin
    address admin = addressRegistry.getRegistryEntry(AddressBook.ADMIN_ACCOUNT);
    _admin = admin;

    // The SFT holder
    address sftHolder = addressRegistry.getRegistryEntry(
      AddressBook.SFT_HOLDER_PROXY
    );
    _sftHolder = IWOWSERC1155(sftHolder);

    // The SFT minter
    address sftMinter = addressRegistry.getRegistryEntry(
      AddressBook.SFT_MINTER_PROXY
    );
    _sftMinter = sftMinter;

    // SFT evaluator
    address sftEvaluator = addressRegistry.getRegistryEntry(
      AddressBook.SFT_EVALUATOR_PROXY
    );
    _sftEvaluator = ISFTEvaluator(sftEvaluator);

    // WOWS rewards
    address cfolioFarm = addressRegistry.getRegistryEntry(rewardFarmKey);
    _cfolioFarm = ICFolioFarmOwnable(cfolioFarm);

    emit Constructed(admin, sftHolder, sftMinter, sftEvaluator, cfolioFarm);
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
    uint256[] calldata tokenIds,
    address[] calldata cfolioHandlers
  ) external override onlySFTHolder {
    // In case of transfer verify the target
    uint256 sftTokenId;

    if (
      to != address(0) &&
      (sftTokenId = _sftHolder.addressToTokenId(to)) != uint256(-1)
    ) {
      _verifyTransferTarget(sftTokenId);
      _updateRewards(to, _sftEvaluator.rewardRate(sftTokenId));
    }
    if (
      from != address(0) &&
      (sftTokenId = _sftHolder.addressToTokenId(from)) != uint256(-1)
    ) {
      _updateRewards(from, _sftEvaluator.rewardRate(sftTokenId));
    }
    // Validate that cfolioItems are empty before we burn them
    if (to == address(0)) {
      require(
        tokenIds.length == cfolioHandlers.length,
        'CFIH: Length mismatch'
      );
      for (uint256 i = 0; i < tokenIds.length; ++i) {
        if (cfolioHandlers[i] == address(this)) {
          address cfolio = _sftHolder.tokenIdToAddress(tokenIds[i]);
          require(cfolio != address(0), 'CFIH: Invalid cfolio');
          require(_cfolioFarm.balanceOf(cfolio) == 0, 'CFIH: Not empty');
        }
      }
    }
  }

  /**
   * @dev See {ICFolioItemCallback-appendHash}
   */
  function appendHash(address cfolioItem, bytes calldata current)
    external
    view
    override
    returns (bytes memory)
  {
    return
      abi.encodePacked(
        current,
        address(this),
        _cfolioFarm.balanceOf(cfolioItem)
      );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICFolioItemHandler}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICFolioItemHandler-sftUpgrade}
   */
  function sftUpgrade(uint256 tokenId, uint32 newRate) external override {
    // Validate access
    require(_msgSender() == address(_sftEvaluator), 'CFIH: Invalid caller');
    require(tokenId.isBaseCard(), 'CFIH: Invalid token');

    // CFolio address
    address cfolio = _sftHolder.tokenIdToAddress(tokenId);

    // Update state
    _updateRewards(cfolio, newRate);
  }

  /**
   * @dev See {ICFolioItemHandler-deposit}
   *
   * Note: tokenId can be owned by a base SFT
   * In this case base SFT cannot be locked
   *
   * There is only need to update rewards if tokenId
   * is part of an unlocked base SFT
   */
  function deposit(
    address from,
    uint256 baseTokenId,
    uint256 tokenId,
    uint256[] calldata amounts
  ) external override {
    // allow fast lane from sftMinter
    if (_msgSender() != _sftMinter) {
      require(from == _msgSender(), 'CFIH: Invalid from');
    }

    // Validate parameters
    (address baseCFolio, address itemCFolio) = _verifyAssetAccess(
      from,
      baseTokenId,
      tokenId
    );

    // Call the implementation
    _deposit(itemCFolio, from, amounts);

    // Update rewards if CFI is inside cfolio
    if (baseCFolio != address(0))
      _updateRewards(baseCFolio, _sftEvaluator.rewardRate(baseTokenId));
  }

  /**
   * @dev See {ICFolioItemHandler-withdraw}
   *
   * Note: tokenId can be owned by a base SFT. In this case, the base SFT
   * cannot be locked.
   *
   * There is only need to update rewards if tokenId is part of an unlocked
   * base SFT.
   */
  function withdraw(
    uint256 baseTokenId,
    uint256 tokenId,
    uint256[] calldata amounts
  ) external override {
    // Validate parameters
    (address baseCFolio, address itemCFolio) = _verifyAssetAccess(
      _msgSender(),
      baseTokenId,
      tokenId
    );

    // Call the implementation
    _withdraw(itemCFolio, amounts);

    // Update rewards if CFI is inside cfolio
    if (baseCFolio != address(0))
      _updateRewards(baseCFolio, _sftEvaluator.rewardRate(baseTokenId));
  }

  /**
   * @dev See {ICFolioItemHandler-getRewards}
   *
   * Note: tokenId must be a base SFT card
   *
   * We allow reward pull only for unlocked SFTs.
   */
  function getRewards(address recipient, uint256 tokenId) external override {
    // Validate parameters
    require(recipient != address(0), 'CFIH: Invalid recipient');
    require(tokenId.isBaseCard(), 'CFIH: Invalid tokenId');

    // Verify that tokenId has a valid cFolio address
    uint256 sftTokenId = tokenId.toSftTokenId();
    address cfolio = _sftHolder.tokenIdToAddress(sftTokenId);
    require(cfolio != address(0), 'CFHI: No cfolio');

    // Verify that the tokenId is owned by msg.sender in case of direct
    // call or recipient in case of sftMinter call in the SFT contract.
    // This also verifies that the token is not locked in TradeFloor.
    require(
      IERC1155(address(_sftHolder)).balanceOf(_msgSender(), sftTokenId) == 1 ||
        (_msgSender() == _sftMinter &&
          IERC1155(address(_sftHolder)).balanceOf(recipient, sftTokenId) == 1),
      'CFHI: Forbidden'
    );

    _cfolioFarm.getReward(cfolio, recipient);
  }

  /**
   * @dev See {ICFolioItemHandler-getRewardInfo}
   */
  function getRewardInfo(uint256[] calldata tokenIds)
    external
    view
    override
    returns (bytes memory result)
  {
    uint256[5] memory uiData;

    // Get basic data once
    uiData = _cfolioFarm.getUIData(address(0));

    // total / rewardDuration / rewardPerDuration
    result = abi.encodePacked(uiData[0], uiData[2], uiData[3]);

    uint256 length = tokenIds.length;
    if (length > 0) {
      // Iterate through all tokenIds and collect reward info
      for (uint256 i = 0; i < length; ++i) {
        uint256 sftTokenId = tokenIds[i].toSftTokenId();
        uint256 share = 0;
        uint256 earned = 0;
        if (sftTokenId.isBaseCard()) {
          address cfolio = _sftHolder.tokenIdToAddress(sftTokenId);
          if (cfolio != address(0)) {
            uiData = _cfolioFarm.getUIData(cfolio);
            share = uiData[1];
            earned = uiData[4];
          }
        }
        result = abi.encodePacked(result, share, earned);
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Deposit amounts
   */
  function _deposit(
    address itemCFolio,
    address payer,
    uint256[] calldata amounts
  ) internal virtual;

  /**
   * @dev Withdraw amounts
   */
  function _withdraw(address itemCFolio, uint256[] calldata amounts)
    internal
    virtual;

  /**
   * @dev Verify if target base SFT is allowed
   */
  function _verifyTransferTarget(uint256 baseSftTokenId) internal virtual;

  //////////////////////////////////////////////////////////////////////////////
  // Maintanace
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Destruct implementation
   */
  function selfDestruct() external onlyAdmin {
    // Dispatch event
    emit CFolioItemHandlerDestructed(address(this));

    // Disable high-impact Slither detector "suicidal" here. Slither explains
    // that "CFolioItemHandlerFarm.selfDestruct() allows anyone to destruct the
    // contract", which is not the case due to the onlyAdmin modifier.
    //
    // slither-disable-next-line suicidal
    selfdestruct(payable(_admin));
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Run through all cFolioItems collected in cFolio and select the amount
   * of tokens. Update cfolioFarm.
   */
  function _updateRewards(address cfolio, uint32 rate) private {
    // Get c-folio items of this base cFolio
    uint256[] memory tokenIds = _sftHolder.getTokenIds(cfolio);
    uint256 length = tokenIds.length;

    // Marginal increase in gas per item is around 25K. Bounding items to 100
    // fits in sensible gas limits.
    require(length <= 100, 'CFIH: Too many items');

    // Calculate new reward amount
    uint256 newRewardAmount = 0;
    for (uint256 i = 0; i < length; ++i) {
      address secondaryCFolio = _sftHolder.tokenIdToAddress(tokenIds[i]);
      require(secondaryCFolio != address(0), 'CFIH: Invalid tokenId');
      if (IWOWSCryptofolio(secondaryCFolio).getHandler() == address(this))
        newRewardAmount = newRewardAmount.add(
          _cfolioFarm.balanceOf(secondaryCFolio)
        );
    }
    newRewardAmount = newRewardAmount.mul(rate).div(1E6);

    // Calculate existing reward amount
    uint256 exitingRewardAmount = _cfolioFarm.balanceOf(cfolio);

    // Compare amounts and add/remove shares
    if (newRewardAmount > exitingRewardAmount) {
      // Update state
      _cfolioFarm.addShares(cfolio, newRewardAmount.sub(exitingRewardAmount));

      // Dispatch event
      emit RewardUpdated(exitingRewardAmount, newRewardAmount);
    } else if (newRewardAmount < exitingRewardAmount) {
      // Update state
      _cfolioFarm.removeShares(
        cfolio,
        exitingRewardAmount.sub(newRewardAmount)
      );

      // Dispatch event
      emit RewardUpdated(exitingRewardAmount, newRewardAmount);
    }
  }

  /**
   * @dev Verifies if an asset access operation is allowed
   *
   * @param baseTokenId Base card tokenId or uint(-1)
   * @param cfolioItemTokenId CFolioItem tokenId handled by this contract
   *
   * A tokenId is "unlocked" if msg.sender is the owner of a tokenId in SFT
   * contract. If baseTokenId is uint(-1), cfolioItemTokenId has to be be
   * unlocked, otherwise baseTokenId has to be unlocked and the locked
   * cfolioItemTokenId has to be inside its c-folio.
   */
  function _verifyAssetAccess(
    address from,
    uint256 baseTokenId,
    uint256 cfolioItemTokenId
  ) private view returns (address, address) {
    // Verify it's a cfolioItemTokenId
    require(cfolioItemTokenId.isCFolioCard(), 'CFHI: Not cFolioCard');

    // Verify that the tokenId is one of ours
    address cFolio = _sftHolder.tokenIdToAddress(
      cfolioItemTokenId.toSftTokenId()
    );
    require(cFolio != address(0), 'CFIH: Invalid cFolioTokenId');
    require(
      IWOWSCryptofolio(cFolio).getHandler() == address(this),
      'CFIH: Not our SFT'
    );

    address baseCFolio = address(0);

    if (baseTokenId != uint256(-1)) {
      // Verify it's a c-folio base card
      require(baseTokenId.isBaseCard(), 'CFHI: Not baseCard');
      baseCFolio = _sftHolder.tokenIdToAddress(baseTokenId.toSftTokenId());
      require(baseCFolio != address(0), 'CFIH: Invalid baseCFolioTokenId');

      // Verify that the tokenId is owned by msg.sender in SFT contract.
      // This also verifies that the token is not locked in TradeFloor.
      require(
        IERC1155(address(_sftHolder)).balanceOf(from, baseTokenId) == 1,
        'CFHI: Access denied (B)'
      );

      // Verify that the cfiTokenId is owned by given baseCFolio.
      // In V2 we have unlocked CFIs in baseCfolio in contrast to V1

      require(
        IERC1155(address(_sftHolder)).balanceOf(
          baseCFolio,
          cfolioItemTokenId
        ) == 1,
        'CFHI: Access denied (CF)'
      );
    } else {
      // Verify that the tokenId is owned by msg.sender in SFT contract.
      // This also verifies that the token is not locked in TradeFloor.
      require(
        IERC1155(address(_sftHolder)).balanceOf(from, cfolioItemTokenId) == 1,
        'CFHI: Access denied'
      );
    }
    return (baseCFolio, cFolio);
  }
}
