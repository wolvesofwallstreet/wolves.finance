/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/proxy/Clones.sol';

import './interfaces/IWOWSCryptofolio.sol';
import './interfaces/IWOWSERC1155.sol';
import './WOWSMinterPauser.sol';
import '../utils/TokenIds.sol';

/**
 * TODO's:
 * implement transfer and burn helpers for cryptofolio items
 */
contract WOWSERC1155 is IWOWSERC1155, WOWSMinterPauser {
  using TokenIds for uint256;
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  // Used to restict calls to TRADEFLOOR but also to collect all TRADEFLOORS
  bytes32 public constant TRADEFLOOR_ROLE = keccak256('TRADEFLOOR_ROLE');

  // Used to restict calls to TRADEFLOOR but also to collect all TRADEFLOORS
  bytes32 public constant OPERATOR_ROLE = keccak256('OPERATOR_ROLE');

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Cap per card for each level
  mapping(uint8 => uint16) private _wowsLevelCap;

  // How many cards have been minted
  mapping(uint16 => uint16) private _wowsCardsMinted;

  // Card state of custom NFT's
  struct CustomCard {
    string uri;
    uint8 level;
  }
  mapping(uint256 => CustomCard) private _customCards;
  uint256 private _customCardCount;

  struct ListKey {
    uint256 index;
  }

  // Per-token data
  struct TokenInfo {
    bool minted; // Make sure we only mint 1
    uint64 timestamp;
    ListKey listKey; // Next tokenId in the owner linkedList
  }
  mapping(uint256 => TokenInfo) private _tokenInfos;

  // Mapping tokenId -> generated address
  mapping(uint256 => address) private _tokenIdToAddress;

  // Mapping generated address -> tokenId
  mapping(address => uint256) private _addressToTokenId;

  // Mapping owner -> first owned token
  //
  // Note that we work 1 based here because of initialization
  // e.g. firstId == 1 links to tokenId 0;
  struct Owned {
    uint256 count;
    ListKey listKey; // First tokenId in linked list
  }
  mapping(address => Owned) private _owned;

  // Our master cryptofolio used for clones
  address private _cryptofolio;

  //////////////////////////////////////////////////////////////////////////////
  // Constructor
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev URI is for WOWS predefined NFT's
   *
   * The other token URI's must be set separately.
   */
  constructor(
    address owner,
    address cryptofolio,
    string memory baseMetadataURI,
    string memory contractMetadataURI
  ) {
    // Initialize {AccessControl}
    _setupRole(DEFAULT_ADMIN_ROLE, owner);

    // Setup wows card definition
    _wowsLevelCap[0] = 20;
    _wowsLevelCap[1] = 20;
    _wowsLevelCap[4] = 20;
    _wowsLevelCap[5] = 20;

    // Our clone blueprint cryptofolio.
    _cryptofolio = cryptofolio;

    // MetaData
    _setBaseMetadataURI(baseMetadataURI);
    _setContractMetadataURI(contractMetadataURI);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IWOWSERC1155}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IWOWSERC1155-isTradeFloor}.
   */
  function isTradeFloor(address account) external view override returns (bool) {
    return hasRole(TRADEFLOOR_ROLE, account);
  }

  /**
   * @dev See {IWOWSERC1155-addressToTokenId}.
   */
  function addressToTokenId(address tokenAddress)
    external
    view
    override
    returns (uint256)
  {
    // Load state
    uint256 tokenId = _addressToTokenId[tokenAddress];

    // Error case: token ID isn't known
    if (_tokenIdToAddress[tokenId] != tokenAddress) {
      return uint256(-1);
    }

    // Success
    return tokenId;
  }

  /**
   * @dev See {IWOWSERC1155-tokenIdToAddress}.
   */
  function tokenIdToAddress(uint256 tokenId)
    external
    view
    override
    returns (address)
  {
    // Load state
    return _tokenIdToAddress[tokenId];
  }

  /**
   * @dev See {IWOWSERC1155-getNextMintableTokenId}.
   */
  function getNextMintableTokenId(uint8 level, uint8 cardId)
    external
    view
    override
    returns (bool, uint256)
  {
    // Encode token ID
    uint256 tokenId = _encodeTokenId(level, cardId);

    // Load state
    uint256 tokenIdEnd = tokenId + _wowsLevelCap[level];

    // Search state
    for (; tokenId < tokenIdEnd; ++tokenId) {
      if (!_tokenInfos[tokenId].minted) {
        // Success
        return (true, tokenId);
      }
    }

    // Error case: no free token ID
    return (false, uint256(-1));
  }

  /**
   * @dev See {IWOWSERC1155-getNextMintableCustomToken}.
   */
  function getNextMintableCustomToken()
    external
    view
    override
    returns (uint256)
  {
    // Validate state
    require(_customCardCount + 0x100000000 > _customCardCount, 'math overflow');

    // Encode token ID
    return _customCardCount + 0x100000000;
  }

  /**
   * @dev See {IWOWSERC1155-setBaseMetadataURI}.
   */
  function setBaseMetadataURI(string memory baseMetadataURI) external override {
    // Access control
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Access denied');

    // Set state
    _setBaseMetadataURI(baseMetadataURI);
  }

  /**
   * @dev See {IWOWSERC1155-setContractMetadataURI}.
   */
  function setContractMetadataURI(string memory contractMetadataURI)
    external
    override
  {
    // Access control
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Access denied');

    // Set state
    _setContractMetadataURI(contractMetadataURI);
  }

  /**
   * @dev See {IWOWSERC1155-setCustomURI}.
   */
  function setCustomURI(uint256 tokenId, string memory customURI)
    public
    override
  {
    // Access control
    require(hasRole(MINTER_ROLE, _msgSender()), 'Access denied');

    // Validate parameters
    require(!tokenId.isStockCard(), 'Only custom cards');

    // Update state
    _customCards[tokenId].uri = customURI;
  }

  /**
   * @dev See {IWOWSERC1155-setCustomCardLevel}.
   */
  function setCustomCardLevel(uint256 tokenId, uint8 cardLevel)
    public
    override
  {
    // Access control
    require(hasRole(MINTER_ROLE, _msgSender()), 'Only minter');

    // Validate parameter
    require(!tokenId.isStockCard(), 'Only custom cards');

    // Update state
    _customCards[tokenId].level = cardLevel;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC1155-setApprovalForAll}.
   */
  function setApprovalForAll(address operator, bool approved)
    public
    virtual
    override
  {
    // Prevent auctions like OpenSea from selling this token. Selling by third
    // parties is only allowed for cryptofolios which are locked in one of our
    // TradeFloor contracts.
    require(hasRole(OPERATOR_ROLE, operator), 'Only Operators');

    // Call ancestor
    super.setApprovalForAll(operator, approved);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155MetadataURI}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC1155MetadataURI-uri}.
   *
   * For custom tokens the URI is thought to be a full URL without
   * placeholders. For our WOWS token a tokenId placeholder is expected, and
   * the ID is tokenId >> 16 because 16-bit then shares the same
   * metadata / image.
   */
  function uri(uint256 tokenId)
    public
    view
    virtual
    override
    returns (string memory)
  {
    // Custom token
    if (!tokenId.isStockCard()) {
      if (bytes(_customCards[tokenId].uri).length == 0) {
        return _uri(tokenId, 0);
      } else {
        return _customCards[tokenId].uri;
      }
    }

    // WOWS token
    return _uri(tokenId >> 16, 4);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC1155} via {WOWSMinterPauser}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155-_beforeTokenTransfer}.
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) internal virtual override {
    // Perform action
    _tokenTransfered(from, to, tokenId, amount);
    // Call ancestor
    super._beforeTokenTransfer(operator, from, to, tokenId, amount, data);
  }

  /**
   * @dev See {ERC1155-_beforeBatchTokenTransfer}.
   */
  function _beforeBatchTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override {
    // Validate parameters
    require(tokenIds.length == amounts.length, 'Length mismatch');

    // Process tokens being transferred
    uint256 length = tokenIds.length;
    for (uint256 i = 0; i < length; ++i) {
      _tokenTransfered(from, to, tokenIds[i], amounts[i]);
    }

    // Call ancestor
    super._beforeBatchTokenTransfer(
      operator,
      from,
      to,
      tokenIds,
      amounts,
      data
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Return information about a wows card
   *
   * NOTE: The implementation in the initial deployment was incorrect. If you
   * are interacting with contract 0x64B3342dB643f3Fb4da5781b6D09B44Ab4668dE4,
   * you must use {getCardDataBatch}!
   *
   * @param level The level of the card
   * @param cardId The id of the card
   *
   * @return cap Max mintable cards
   * @return minted Already minted cards
   */
  function getCardData(uint8 level, uint8 cardId)
    external
    view
    returns (uint16 cap, uint16 minted)
  {
    // Load state
    return (_wowsLevelCap[level], _getCardsMinted(level, cardId));
  }

  /**
   * @dev Return information about a wows card
   *
   * @param levels The levels of the card to query
   * @param cardIds A list of card ids to query
   *
   * @return capMintedPair Array of 16 Bit, cap,minted,...
   */
  function getCardDataBatch(uint8[] memory levels, uint8[] memory cardIds)
    external
    view
    returns (uint16[] memory capMintedPair)
  {
    // Validate parameters
    require(levels.length == cardIds.length, 'Length mismatch');

    // Return value
    uint16[] memory result = new uint16[](cardIds.length * 2);

    // Load state
    for (uint256 i = 0; i < cardIds.length; ++i) {
      // Record cap
      result[i * 2] = _wowsLevelCap[levels[i]];

      // Record minted
      result[i * 2 + 1] = _getCardsMinted(levels[i], cardIds[i]);
    }

    return result;
  }

  /**
   * @dev See {IWOWSERC1155-getTokenData}.
   */
  function getTokenData(uint256 tokenId)
    external
    view
    override
    returns (uint64 mintTimestamp, uint8 level)
  {
    // Decode token ID
    uint8 _level = _getLevel(tokenId);

    // Load state
    return (_tokenInfos[tokenId].timestamp, _level);
  }

  /**
   * @dev Return list of tokenIds owned by `account`
   */
  function getTokenIds(address account)
    external
    view
    returns (uint256[] memory)
  {
    // Load state
    Owned storage list = _owned[account];

    // Return value
    uint256[] memory result = new uint256[](list.count);

    // Search state
    ListKey storage key = list.listKey;
    for (uint256 i = 0; i < list.count; ++i) {
      result[i] = key.index;
      key = _tokenInfos[key.index].listKey;
    }

    return result;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State modifiers
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Set the cap of a specific WOWS level
   *
   * Note that this function can be used to add a new card.
   */
  function setWowsLevelCaps(uint8[] memory levels, uint16[] memory newCaps)
    public
  {
    // Access control
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Validate parameters
    require(levels.length == newCaps.length, "Lengths don't match");

    // Update state
    for (uint256 i = 0; i < levels.length; ++i) {
      require(_wowsLevelCap[levels[i]] < newCaps[i], 'Decrement forbidden');
      _wowsLevelCap[levels[i]] = newCaps[i];
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal functionality
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Handles transfer of an SFT token
   */
  function _tokenTransfered(
    address from,
    address to,
    uint256 tokenId,
    uint256 amount
  ) private {
    // We have only NFT's in this contract
    require(amount == 1, 'Amount != 1');

    // Load state
    address tokenAddress = _tokenIdToAddress[tokenId];
    TokenInfo storage tokenInfo = _tokenInfos[tokenId];

    // Minting
    if (from == address(0)) {
      // Validate state
      require(!tokenInfo.minted, 'Already minted');

      // Update state
      tokenInfo.minted = true;
      // solhint-disable-next-line not-rely-on-time
      tokenInfo.timestamp = uint64(block.timestamp);
      // Create a new WOWSCryptofolio by cloning masterTokenReceiver
      // The clone itself is a minimal delegate proxy.
      if (tokenAddress == address(0)) {
        tokenAddress = Clones.clone(_cryptofolio);
        _tokenIdToAddress[tokenId] = tokenAddress;
        IWOWSCryptofolio(tokenAddress).initialize();
      }
      _addressToTokenId[tokenAddress] = tokenId;

      // Increment the minted count for this card
      if (tokenId.isBaseCard()) {
        if (tokenId.isStockCard()) {
          _wowsCardsMinted[uint16(tokenId >> 16)] += 1;
        } else {
          ++_customCardCount;
        }
      }
    }
    // Burning
    else if (to == address(0)) {
      // Make sure underlying assets gets burned
      IWOWSCryptofolio(tokenAddress).burn();

      // Make token mintable again
      tokenInfo.minted = false;

      // Decrement the minted count for this card
      if (tokenId.isStockCard()) {
        _wowsCardsMinted[uint16(tokenId >> 16)] -= 1;
      }
    }

    // Signal ownership change in Cryptofolio
    IWOWSCryptofolio(tokenAddress).setOwner(to);

    // Remove tokenId from List
    if (from != address(0)) {
      // Load state
      Owned storage fromList = _owned[from];

      // Validate state
      require(fromList.count > 0, 'Count mismatch');

      ListKey storage key = fromList.listKey;
      uint256 count = fromList.count;

      // Search the token which links to tokenId
      for (; count > 0 && key.index != tokenId; --count)
        key = _tokenInfos[key.index].listKey;
      require(key.index == tokenId, 'Key mismatch');

      // Unlink prev -> tokenId
      key.index = tokenInfo.listKey.index;
      // Unlink tokenId -> next
      tokenInfo.listKey.index = 0;
      // Decrement count
      fromList.count--;
    }

    // Update state
    if (to != address(0)) {
      Owned storage toList = _owned[to];
      tokenInfo.listKey.index = toList.listKey.index;
      toList.listKey.index = tokenId;
      toList.count++;
    }
  }

  /**
   * @dev Utility function to encode a level and card ID into a token ID
   *
   * @param level The level of the card
   * @param cardId The ID of the card
   *
   * @return tokenId The encoded token ID
   */
  function _encodeTokenId(uint8 level, uint8 cardId)
    private
    pure
    returns (uint256 tokenId)
  {
    uint16 levelCard = (uint16(level) << 8) | cardId;
    tokenId = uint32(levelCard) << 16;
  }

  /**
   * @dev Get the number of cards that have been minted
   *
   * @param level The level of cards to check
   * @param cardId The ID of cards to check
   *
   * @return cardsMinted The number of cards that have been minted
   */
  function _getCardsMinted(uint8 level, uint8 cardId)
    private
    view
    returns (uint16 cardsMinted)
  {
    uint16 levelCard = (uint16(level) << 8) | cardId;
    cardsMinted = _wowsCardsMinted[levelCard];
  }

  /**
   * @dev Get the level of a given token
   *
   * @param tokenId The ID of the token
   *
   * @return level The level of the token
   */
  function _getLevel(uint256 tokenId) private view returns (uint8 level) {
    if (!tokenId.isStockCard()) {
      level = _customCards[tokenId].level;
    } else {
      level = uint8(tokenId >> 24);
    }
  }
}
