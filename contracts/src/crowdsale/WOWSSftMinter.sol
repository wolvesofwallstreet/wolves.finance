/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/access/AccessControl.sol';
import '../../0xerc1155/interfaces/IERC20.sol';
import '../../0xerc1155/utils/SafeERC20.sol';
import '../../0xerc1155/utils/Context.sol';

import '../cfolio/interfaces/ICFolioItemHandler.sol';
import '../cfolio/interfaces/ISFTEvaluator.sol';
import '../investment/interfaces/IRewardHandler.sol';
import '../token/interfaces/IERC1155BurnMintable.sol';
import '../token/interfaces/ITradeFloor.sol';
import '../token/interfaces/IWOWSCryptofolio.sol';
import '../token/interfaces/IWOWSERC1155.sol';

import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';
import '../utils/TokenIds.sol';

contract WOWSSftMinter is Context, AccessControl {
  using TokenIds for uint256;
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // CFolio NFTs (baseCards)

  // PricePerlevel, customLevel start at 0xFF
  struct BaseLevelData {
    uint16 cap;
    uint256 price;
  }

  // BaseCard Info per level
  mapping(uint16 => BaseLevelData) private _baseLevelData;
  mapping(uint24 => uint16) private _baseCardsMinted;
  uint256 public nextCustomCardId = (1 << 32);

  // CFolioItem
  struct CFolioItemSft {
    ICFolioItemHandler handler;
    uint256 price;
    uint128 numMinted;
    uint128 maxMintable;
  }
  mapping(uint256 => CFolioItemSft) private cfolioItemSfts; // C-folio type to c-folio data
  ICFolioItemHandler[] private cfolioItemHandlers;
  uint256 public nextCFolioItemNft = (1 << 64);

  // The ERC1155 contract we are minting from
  IWOWSERC1155 private immutable _sftContract;

  // WOWS token contract
  IERC20 private immutable _wowsToken;

  // Reward handler which distributes WOWS
  IRewardHandler public rewardHandler;

  // TradeFloor Proxy contract
  address public tradeFloor;

  // SFTEvaluator to store the cfolioItemType
  ISFTEvaluator public sftEvaluator;

  // 1.0 of the rewards go to distribution
  uint32 private constant ALL = 1 * 1e6;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  // Emitted if a new SFT is minted
  event Mint(
    address indexed recipient,
    uint256 tokenId,
    uint256 price,
    uint256 cfolioType
  );

  // Emitted if base mint specifications (e.g. limits / price) have changed
  event BaseSpecChanged(uint256[] ids);

  // Emitted if cFolio mint specifications (e.g. limits / price) have changed
  event CFolioSpecChanged(uint256[] ids);

  // Emitted if the contract gets destroyed
  event Destruct();

  //////////////////////////////////////////////////////////////////////////////
  // Modifier
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()));
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Constructor
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Contruct WOWSSftMinter
   *
   * @param addressRegistry provides all immutables
   */
  constructor(IAddressRegistry addressRegistry) {
    // Access control (need admin for selfDestruct)
    _setupRole(
      DEFAULT_ADMIN_ROLE,
      addressRegistry.getRegistryEntry(AddressBook.ADMIN_ACCOUNT)
    );

    // Set immutable addresses
    _wowsToken = IERC20(
      addressRegistry.getRegistryEntry(AddressBook.WOWS_TOKEN)
    );

    _sftContract = IWOWSERC1155(
      addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER_PROXY)
    );
  }

  function initialize(IAddressRegistry addressRegistry) external {
    // Check for single entry
    require(address(rewardHandler) == address(0), 'WM: Already initialized');

    // Initialize state
    _setupRole(
      DEFAULT_ADMIN_ROLE,
      addressRegistry.getRegistryEntry(AddressBook.ADMIN_ACCOUNT)
    );

    rewardHandler = IRewardHandler(
      addressRegistry.getRegistryEntry(AddressBook.REWARD_HANDLER)
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // State modifiers
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Set prices for the given levels
   */
  function setBaseSpec(
    uint16[] calldata levels,
    uint16[] calldata caps,
    uint256[] calldata prices
  ) external onlyAdmin {
    // Validate parameters
    require(levels.length == prices.length, 'WM: Length mismatch');

    // Update state
    for (uint256 i = 0; i < levels.length; ++i) {
      _baseLevelData[levels[i]].cap = caps[i];
      _baseLevelData[levels[i]].price = prices[i];
    }
  }

  /**
   * @dev Set new reward handler
   *
   * RewardHandler is by concept upgradeable / see investment::Controller.sol.
   */
  function setRewardHandler(IRewardHandler newRewardHandler)
    external
    onlyAdmin
  {
    // Validate parameters
    require(address(newRewardHandler) != address(0), 'WM: Invalid RH');

    // Update state
    rewardHandler = newRewardHandler;
  }

  /**
   * @dev Set Trade Floor
   */
  function setTradeFloor(address tradeFloor_) external onlyAdmin {
    // Validate parameters
    require(tradeFloor_ != address(0), 'WM: Invalid TF');

    // Update state
    tradeFloor = tradeFloor_;
  }

  /**
   * @dev Set SFT evaluator
   */
  function setSFTEvaluator(ISFTEvaluator sftEvaluator_) external onlyAdmin {
    // Validate parameters
    require(address(sftEvaluator_) != address(0), 'WM: Invalid SFTE');

    // Update state
    sftEvaluator = sftEvaluator_;
  }

  /**
   * @dev Set the limitations, the price and the handlers for CFolioItem SFT's
   */
  function setCFolioSpec(
    uint256[] calldata cFolioTypes,
    address[] calldata handlers,
    uint128[] calldata maxMint,
    uint256[] calldata prices
  ) external onlyAdmin {
    // Validate parameters
    require(
      cFolioTypes.length == handlers.length &&
        handlers.length == maxMint.length &&
        maxMint.length == prices.length,
      'WM: Length mismatch'
    );

    // Update state
    for (uint256 i = 0; i < cFolioTypes.length; ++i) {
      CFolioItemSft storage cfi = cfolioItemSfts[cFolioTypes[i]];
      cfi.handler = ICFolioItemHandler(handlers[i]);
      cfi.maxMintable = maxMint[i];
      cfi.price = prices[i];

      uint256 j = 0;
      for (; j < cfolioItemHandlers.length; ++j) {
        if (address(cfolioItemHandlers[j]) == handlers[i]) break;
      }
      if (j == cfolioItemHandlers.length) {
        cfolioItemHandlers.push(ICFolioItemHandler(handlers[i]));
      }
    }
    emit CFolioSpecChanged(cFolioTypes);
  }

  /**
   * @dev upgrades state from an existing WOWSSFTMinter
   */
  function destructContract() external onlyAdmin {
    emit Destruct();

    // Disable high-impact Slither detector "suicidal" here. Slither explains
    // that "WOWSSftMinter.destructContract() allows anyone to destruct the
    // contract", which is not the case due to the {Ownable-onlyOwner} modifier.
    //
    // slither-disable-next-line suicidal
    selfdestruct(_msgSender());
  }

  /**
   * @dev Mint one of our stock card SFTs
   *
   * Approval of WOWS token required before the call.
   */
  function mintWowsSFT(
    address recipient,
    uint8 level,
    uint8 cardId
  ) external {
    // Validate parameters
    require(recipient != address(0), 'WM: Invalid recipient');

    // Load state
    uint256 price = _baseLevelData[level].price;
    (uint24 bcmId, uint16 minted) = _getBaseCardsMinted(level, cardId);

    // Validate state
    require(price > 0, 'WM: No price available');
    require(minted < _baseLevelData[level].cap, 'WM: No price available');

    // Calculate the tokenId
    uint256 baseTokenId = ((uint256(level) << 8) | cardId) << 16;

    _baseCardsMinted[bcmId]++;

    // Update state
    _mint(recipient, baseTokenId + minted, price, 0, '');
  }

  /**
   * @dev Mint a custom token
   *
   * Approval of WOWS token required before the call.
   */
  function mintCustomSFT(address recipient, uint8 level) external {
    // Validate parameters
    require(recipient != address(0), 'WM: Invalid recipient');

    // Load state
    uint256 price = _baseLevelData[uint16(level) << 8].price;

    // Validate state
    require(price > 0, 'WM: No price available');

    // Get the next free mintable custom card Id
    uint256 tokenId = nextCustomCardId++;

    // Custom baseToken only allowed < 64Bit
    require(tokenId.isBaseCard(), 'WM: Max tokenId reached');

    // Set card level
    _sftContract.setCustomCardLevel(tokenId, level);

    // Update state
    _mint(recipient, tokenId, price, 0, '');
  }

  /**
   * @dev Mint a CFolioItem token
   *
   * Approval of WOWS token required before the call.
   *
   * @param recipient Recipient of the SFT, unused if sftTokenId is != -1
   * @param cfolioItemType The item type of the SFT
   * @param sftTokenId If <> -1 recipient is the SFT c-folio / handler must be called
   * @param investAmounts Arguments needed for the handler (in general investments).
   * Investments may be zero if the user is just buying an SFT.
   */
  function mintCFolioItemSFT(
    address recipient,
    uint256 cfolioItemType,
    uint256 sftTokenId,
    uint256[] calldata investAmounts
  ) external {
    // Validate state
    require(tradeFloor != address(0), 'WM: TF not set');
    require(address(sftEvaluator) != address(0), 'WM: SFTE not set');

    // Validate parameters
    require(recipient != address(0), 'WM: Invalid recipient');

    // Load state
    CFolioItemSft storage sftData = cfolioItemSfts[cfolioItemType];

    // Validate state
    require(address(sftData.handler) != address(0), 'WM: Invalid type (CFI)');
    require(sftData.numMinted < sftData.maxMintable, 'WM: Sold out (CFI)');

    address sftCFolio = address(0);
    if (sftTokenId != uint256(-1)) {
      require(sftTokenId.isBaseCard(), 'WM: Invalid baseId');

      // Get the CFolio contract address, it will be the final recipient
      sftCFolio = _sftContract.tokenIdToAddress(sftTokenId);
      require(sftCFolio != address(0), 'WM: Bad baseId');

      // Intermediate owner of the minted SFT
      recipient = address(this);
    }

    uint256 tokenId = nextCFolioItemNft++;
    require(tokenId.isCFolioCard(), 'WM: Invalid cfiId');

    sftEvaluator.setCFolioItemType(tokenId, cfolioItemType);

    // Update state, mint SFT token
    sftData.numMinted += 1;
    _mint(
      recipient,
      tokenId,
      sftData.price,
      cfolioItemType,
      abi.encodePacked(sftData.handler)
    );

    if (investAmounts.length > 0) {
      ICFolioItemHandler(sftData.handler).deposit(
        sftTokenId,
        tokenId,
        investAmounts
      );
    }

    // If the SFT's c-folio is final recipient of c-folio item, we call the
    // handler and lock the c-folio item in the TradeFloor contract before we transfer
    // it to the SFT
    if (sftCFolio != address(0)) {
      // Lock the SFT into the TradeFloor contract
      IERC1155BurnMintable(address(_sftContract)).safeTransferFrom(
        address(this),
        sftCFolio,
        tokenId,
        1,
        ''
      );
    }
  }

  /**
   * @dev Claim rewards from all c-folio farms
   *
   * @param sftTokenId valid SFT tokenId, must not be locked in TF
   */
  function claimSFTRewards(uint256 sftTokenId) external {
    for (uint256 i = 0; i < cfolioItemHandlers.length; ++i) {
      cfolioItemHandlers[i].getRewards(msg.sender, sftTokenId);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // ERC1155Holder
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev We are a temorary token holder during CFolioToken mint step
   *
   * Only accept ERC1155 tokens during this setup.
   */
  function onERC1155Received(
    address operator,
    address,
    uint256,
    uint256,
    bytes memory
  ) external view returns (bytes4) {
    // Validate state
    require(operator == address(this), 'WM: Not allowed');

    // Call ancestor
    return this.onERC1155Received.selector;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Query prices for given levels
   */
  function getBaseSpec(uint8[] calldata levels, uint8[] calldata cardIds)
    external
    view
    returns (
      uint256[] memory prices,
      uint16[] memory numMinted,
      uint16[] memory maxMintable
    )
  {
    require(levels.length == cardIds.length, 'WM: Length mismatch');

    prices = new uint256[](levels.length);
    numMinted = new uint16[](levels.length);
    maxMintable = new uint16[](levels.length);

    for (uint256 i = 0; i < levels.length; ++i) {
      prices[i] = _baseLevelData[levels[i]].price;
      maxMintable[i] = _baseLevelData[levels[i]].cap;
      (, numMinted[i]) = _getBaseCardsMinted(levels[i], cardIds[i]);
    }
  }

  /**
   * @dev retrieve mint information about cfolioItem
   */
  function getCFolioSpec(uint256[] calldata cFolioTypes)
    external
    view
    returns (
      uint256[] memory prices,
      uint128[] memory numMinted,
      uint128[] memory maxMintable
    )
  {
    uint256 length = cFolioTypes.length;
    prices = new uint256[](length);
    numMinted = new uint128[](length);
    maxMintable = new uint128[](length);

    for (uint256 i; i < length; ++i) {
      CFolioItemSft storage cfi = cfolioItemSfts[cFolioTypes[i]];
      prices[i] = cfi.price;
      numMinted[i] = cfi.numMinted;
      maxMintable[i] = cfi.maxMintable;
    }
  }

  /**
   * @dev Get all tokenIds from SFT and TF contract owned by account.
   */
  function getTokenIds(address account)
    external
    view
    returns (uint256[] memory sftTokenIds, uint256[] memory tfTokenIds)
  {
    require(account != address(0), 'Null address');
    sftTokenIds = _sftContract.getTokenIds(account);
    tfTokenIds = ITradeFloor(tradeFloor).getTokenIds(account);
  }

  /**
   * @dev Get underlying information (cFolioItems / value) for given tokenIds.
   *
   * @param tokenIds the tokenIds information should be queried
   * @return result [%,MintTime,NumItems,[tokenId,type,numAssetValues,[assetValue]]]...
   */
  function getTokenInformation(uint256[] calldata tokenIds)
    external
    view
    returns (bytes memory result)
  {
    uint256[] memory cFolioItems;
    uint256[] memory oneCFolioItem = new uint256[](1);
    uint256 cfolioLength;
    uint256 rewardRate;
    uint256 timestamp;

    for (uint256 i = 0; i < tokenIds.length; ++i) {
      if (tokenIds[i].isBaseCard()) {
        // Only main TradeFloor supported
        uint256 sftTokenId = tokenIds[i].toSftTokenId();
        address cfolio = _sftContract.tokenIdToAddress(sftTokenId);
        if (address(cfolio) != address(0)) {
          uint256[] memory cfolioItems = _sftContract.getTokenIds(cfolio);
          cfolioLength = cfolioItems.length;
        } else {
          cFolioItems = oneCFolioItem;
          cfolioLength = 0;
        }

        rewardRate = sftEvaluator.rewardRate(tokenIds[i]);
        (timestamp, ) = _sftContract.getTokenData(sftTokenId);
      } else {
        oneCFolioItem[0] = tokenIds[i];
        cfolioLength = 1;
        cFolioItems = oneCFolioItem; // Reference, no copy
        rewardRate = 0;
        timestamp = 0;
      }

      result = abi.encodePacked(result, rewardRate, timestamp, cfolioLength);

      for (uint256 j = 0; j < cfolioLength; ++j) {
        uint256 sftTokenId = cFolioItems[j].toSftTokenId();
        uint256 cfolioType = sftEvaluator.getCFolioItemType(sftTokenId);
        uint256[] memory amounts;

        address cfolio = _sftContract.tokenIdToAddress(sftTokenId);
        if (address(cfolio) != address(0)) {
          address handler = IWOWSCryptofolio(cfolio).getHandler();
          amounts = ICFolioItemHandler(handler).getAmounts(cfolio);
        }

        result = abi.encodePacked(
          result,
          cFolioItems[j],
          cfolioType,
          amounts.length,
          amounts
        );
      }
    }
  }

  /**
   * @dev Get balances of given ERC20 addresses.
   */
  function getErc20Balances(address account, address[] calldata erc20)
    external
    view
    returns (uint256[] memory amounts)
  {
    amounts = new uint256[](erc20.length);
    for (uint256 i = 0; i < erc20.length; ++i)
      amounts[i] = erc20[i] == address(0)
        ? 0
        : IERC20(erc20[i]).balanceOf(account);
  }

  /**
   * @dev Get allowances of given ERC20 addresses.
   */
  function getErc20Allowances(
    address account,
    address[] calldata spender,
    address[] calldata erc20
  ) external view returns (uint256[] memory amounts) {
    // Validate parameters
    require(spender.length == erc20.length, 'Length mismatch');

    amounts = new uint256[](spender.length);
    for (uint256 i = 0; i < spender.length; ++i)
      amounts[i] = erc20[i] == address(0)
        ? 0
        : IERC20(erc20[i]).allowance(account, spender[i]);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal functionality
  //////////////////////////////////////////////////////////////////////////////

  function _mint(
    address recipient,
    uint256 tokenId,
    uint256 price,
    uint256 cfolioType,
    bytes memory data
  ) internal {
    // Transfer WOWS from user to reward handler
    if (price > 0)
      _wowsToken.safeTransferFrom(_msgSender(), address(rewardHandler), price);

    // Mint the token
    IERC1155BurnMintable(address(_sftContract)).mint(
      recipient,
      tokenId,
      1,
      data
    );

    // Distribute the rewards
    if (price > 0) rewardHandler.distribute2(recipient, price, ALL);

    // Log event
    emit Mint(recipient, tokenId, price, cfolioType);
  }

  /**
   * @dev Get the number of cards that have been minted
   *
   * @param level The level of cards to check
   * @param cardId The ID of cards to check
   *
   * @return bcmLevelId the idx for direct access to _baseCardsMinted
   * @return cardsMinted The number of cards that have been minted
   */
  function _getBaseCardsMinted(uint16 level, uint8 cardId)
    private
    view
    returns (uint24 bcmLevelId, uint16 cardsMinted)
  {
    bcmLevelId = (uint24(level) << 8) | cardId;
    cardsMinted = _baseCardsMinted[bcmLevelId];
  }
}
