/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Context.sol';

import '../cfolio/interfaces/ICFolioItemHandler.sol';
import '../cfolio/interfaces/ISFTEvaluator.sol';
import '../investment/interfaces/IRewardHandler.sol';
import '../token/interfaces/IERC1155BurnMintable.sol';
import '../token/interfaces/IWOWSCryptofolio.sol';
import '../token/interfaces/IWOWSERC1155.sol';
import '../utils/TokenIds.sol';

contract WOWSSftMinter is Context, Ownable {
  using TokenIds for uint256;
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // PricePerlevel, customLevel start at 0xFF
  mapping(uint16 => uint256) public _pricePerLevel;

  struct CFolioItemSft {
    ICFolioItemHandler handler;
    uint256 price;
    uint128 numMinted;
    uint128 maxMintable;
  }
  mapping(uint256 => CFolioItemSft) public cfolioItemSfts; // C-folio type to c-folio data

  uint256 public nextCFolioItemNft = 0x10000000000000000;

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

  // Set while minting CFolioToken
  bool private _setupCFolio;

  // 1.0 of the rewards go to distribution
  uint32 private constant ALL = 1 * 1e6;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  event Mint(
    address indexed recipient,
    uint256 tokenId,
    uint256 price,
    uint256 cfolioType
  );

  //////////////////////////////////////////////////////////////////////////////
  // Constructor
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Contruct WOWSSftMinter
   *
   * @param owner Owner of this contract
   * @param wowsToken The WOWS ERC-20 token contract
   * @param rewardHandler_ Handler which distributes
   * @param sftContract Cryptofolio SFT source
   */
  constructor(
    address owner,
    IERC20 wowsToken,
    IRewardHandler rewardHandler_,
    IWOWSERC1155 sftContract
  ) {
    // Validate parameters
    require(owner != address(0), 'O: 0 address');
    require(address(wowsToken) != address(0), 'WT: 0 address');
    require(address(rewardHandler_) != address(0), 'RH: 0 address');
    require(address(sftContract) != address(0), 'SFT: 0 address');

    // Initialize {Ownable}
    transferOwnership(owner);

    // Initialize state
    _sftContract = sftContract;
    _wowsToken = wowsToken;
    rewardHandler = rewardHandler_;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State modifiers
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Set prices for the given levels
   */
  function setPrices(uint16[] memory levels, uint256[] memory prices)
    external
    onlyOwner
  {
    // Validate parameters
    require(levels.length == prices.length, 'Length mismatch');

    // Update state
    for (uint256 i = 0; i < levels.length; ++i)
      _pricePerLevel[levels[i]] = prices[i];
  }

  /**
   * @dev Set new reward handler
   *
   * RewardHandler is by concept upgradeable / see investment::Controller.sol.
   */
  function setRewardHandler(IRewardHandler newRewardHandler)
    external
    onlyOwner
  {
    // Update state
    rewardHandler = newRewardHandler;
  }

  /**
   * @dev Set Trade Floor
   */
  function setTradeFloor(address tradeFloor_) external onlyOwner {
    // Validate parameters
    require(tradeFloor_ != address(0), 'Invalid TF');

    // Update state
    tradeFloor = tradeFloor_;
  }

  /**
   * @dev Set Trade Floor
   */
  function setSFTEvaluator(ISFTEvaluator sftEvaluator_) external onlyOwner {
    // Validate parameters
    require(address(sftEvaluator_) != address(0), 'Invalid TF');

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
  ) external onlyOwner {
    // Validate parameters
    require(
      cFolioTypes.length == handlers.length &&
        handlers.length == maxMint.length &&
        maxMint.length == prices.length,
      'Length mismatch'
    );

    // Update state
    for (uint256 i = 0; i < cFolioTypes.length; ++i) {
      CFolioItemSft storage cfi = cfolioItemSfts[cFolioTypes[i]];
      cfi.handler = ICFolioItemHandler(handlers[i]);
      cfi.maxMintable = maxMint[i];
      cfi.price = prices[i];
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
      numMinted[i] = cfi.numMinted;
      maxMintable[i] = cfi.maxMintable;
    }
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
    require(recipient != address(0), 'Invalid recipient');

    // Load state
    uint256 price = _pricePerLevel[level];

    // Validate state
    require(price > 0, 'No price available');

    // Get the next free mintable token for level / cardId
    (bool success, uint256 tokenId) =
      _sftContract.getNextMintableTokenId(level, cardId);
    require(success, 'Unsufficient cards');

    // Update state
    _mint(recipient, tokenId, price, 0);
  }

  /**
   * @dev Mint a custom token
   *
   * Approval of WOWS token required before the call.
   */
  function mintCustomSFT(
    address recipient,
    uint8 level,
    string memory uri
  ) external {
    // Validate parameters
    require(recipient != address(0), 'Invalid recipient');

    // Load state
    uint256 price = _pricePerLevel[0x100 + level];

    // Validate state
    require(price > 0, 'No price available');

    // Get the next free mintable token for level / cardId
    uint256 tokenId = _sftContract.getNextMintableCustomToken();

    // Custom baseToken only allowed < 64Bit
    require(tokenId.isBaseCard(), 'Max tokenId reached');

    // Set card level and uri
    _sftContract.setCustomCardLevel(tokenId, level);
    _sftContract.setCustomURI(tokenId, uri);

    // Update state
    _mint(recipient, tokenId, price, 0);
  }

  /**
   * @dev Mint a CFolioItem token
   *
   * Approval of WOWS token required before the call.
   *
   * Post-condition: `_setupCFolio` must be false.
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
    require(!_setupCFolio, 'Already setting up');
    require(tradeFloor != address(0), 'TF not set');
    require(address(sftEvaluator) != address(0), 'SFTE not set');

    // Validate parameters
    require(recipient != address(0), 'Invalid recipient');

    // Load state
    CFolioItemSft storage sftData = cfolioItemSfts[cfolioItemType];

    // Validate state
    require(address(sftData.handler) != address(0), 'CFI Minter: Invalid type');
    require(sftData.numMinted < sftData.maxMintable, 'CFI Minter: sold out');

    address sftCFolio = address(0);
    if (sftTokenId != uint256(-1)) {
      require(sftTokenId.isBaseCard(), 'Invalid sftTokenId');

      // Get the CFolio contract address, it will be the final recipient
      sftCFolio = _sftContract.tokenIdToAddress(sftTokenId);
      require(sftCFolio != address(0), 'Bad sftTokenId');

      // Intermediate owner of the minted SFT
      recipient = address(this);

      // Allow this contract to be an ERC1155 holder
      _setupCFolio = true;
    }

    uint256 tokenId = nextCFolioItemNft++;
    require(tokenId.isCFolioCard(), 'Invalid cfolioItem tokenId');

    sftEvaluator.setCFolioItemType(tokenId, cfolioItemType);

    // Update state, mint SFT token
    _mint(recipient, tokenId, sftData.price, cfolioItemType);

    // Let CFolioHandler setup the new minted token
    sftData.handler.setupCFolio(_msgSender(), tokenId, investAmounts);

    // Check-effects-interaction not needed, as `_setupCFolio` can't be mutated
    // outside this function.

    // If the SFT's c-folio is final recipient of c-folio item, we call the
    // handler and lock the SFT in the TradeFloor contract before we transfer
    // it to the SFT
    if (sftCFolio != address(0)) {
      // Lock the SFT into the TradeFloor contract
      IERC1155BurnMintable(address(_sftContract)).safeTransferFrom(
        address(this),
        tradeFloor,
        tokenId,
        1,
        abi.encodePacked(sftCFolio)
      );

      // Reset the temporary state which allows holding ERC1155 token
      _setupCFolio = false;
    }
  }

  /**
   * @dev See {IWOWSSftMinter-tradeFloorTokenId}.
   */
  function tradeFloorTokenId(uint256 sftTokenId)
    external
    view
    returns (uint256)
  {
    bytes memory hashData;
    uint256[] memory tokenIds;
    uint256 tokenIdsLength;
    if (sftTokenId.isBaseCard()) {
      // It's a base card, calculate hash using all cfolioItems
      address cfolio = _sftContract.tokenIdToAddress(sftTokenId);
      require(cfolio != address(0), 'WSM: src token invalid');
      (tokenIds, tokenIdsLength) = IWOWSCryptofolio(cfolio).getCryptofolio(
        address(this)
      );
      hashData = abi.encodePacked(address(this), sftTokenId);
    } else {
      // It's a cfolioItem itself, only calculate unerlying value
      tokenIds = new uint256[](1);
      tokenIds[0] = sftTokenId;
      tokenIdsLength = 1;
    }

    // Run through all cfolioItems and add let their single CFolioItemHandler
    // append hashable data
    for (uint256 i = 0; i < tokenIdsLength; ++i) {
      address cfolio = _sftContract.tokenIdToAddress(tokenIds[i]);
      require(cfolio != address(0), 'WSM: item token invalid');

      address handler = IWOWSCryptofolio(cfolio)._tradefloors(0);
      require(handler != address(0), 'WSM: item handler invalid');

      hashData = ICFolioItemCallback(handler).appendHash(cfolio, hashData);
    }

    uint256 hashNum = uint256(keccak256(hashData));
    return (hashNum ^ (hashNum << 128)).maskHash() | sftTokenId;
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
    address,
    address,
    uint256,
    uint256,
    bytes memory
  ) external view returns (bytes4) {
    // Validate state
    require(_setupCFolio, 'Only during setup');

    // Call ancestor
    return this.onERC1155Received.selector;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Query prices for given levels
   */
  function getPrices(uint16[] memory levels)
    external
    view
    returns (uint256[] memory)
  {
    uint256[] memory result = new uint256[](levels.length);
    for (uint256 i = 0; i < levels.length; ++i)
      result[i] = _pricePerLevel[levels[i]];
    return result;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal functionality
  //////////////////////////////////////////////////////////////////////////////

  function _mint(
    address recipient,
    uint256 tokenId,
    uint256 price,
    uint256 cfolioType
  ) internal {
    // Transfer WOWS from user to reward handler
    if (price > 0)
      _wowsToken.safeTransferFrom(_msgSender(), address(rewardHandler), price);

    // Mint the token
    IERC1155BurnMintable(address(_sftContract)).mint(recipient, tokenId, 1, '');

    // Distribute the rewards
    if (price > 0) rewardHandler.distribute2(recipient, price, ALL);

    // Log event
    emit Mint(recipient, tokenId, price, cfolioType);
  }
}
