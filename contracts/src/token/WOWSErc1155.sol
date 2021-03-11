/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/presets/ERC1155PresetMinterPauser.sol';
import '@openzeppelin/contracts/proxy/Clones.sol';

import './interfaces/IWOWSERC1155.sol';
import './WOWSCryptofolio.sol';

/**
 * TODO's:
 * implement transfer and burn helpers for cryptofolio items
 */

contract WOWSERC1155 is ERC1155PresetMinterPauser, IWOWSERC1155 {
  // Used to restict calls to TRADEFLOOR but also to collect all TRADEFLOORS
  bytes32 public constant TRADEFLOOR_ROLE = keccak256('TRADEFLOOR_ROLE');
  // Used to restict calls to TRADEFLOOR but also to collect all TRADEFLOORS
  bytes32 public constant OPERATOR_ROLE = keccak256('OPERATOR_ROLE');

  // cap per card for each level
  mapping(uint8 => uint16) private _wowsLevelCap;

  // how many cards have been minted
  mapping(uint16 => uint16) private _wowsCardsMinted;

  // card state of custom NFT's
  struct CustomCard {
    string uri;
    uint8 level;
  }
  mapping(uint256 => CustomCard) private _customCards;
  uint256 private _customCardCount;

  struct ListKey {
    uint256 index;
  }

  // per token data
  struct TokenInfo {
    bool minted; // make sure we only mint 1
    uint64 timestamp;
    ListKey listKey; // next tokenId in the owner linkedList
  }
  mapping(uint256 => TokenInfo) private _tokenInfos;

  // mapping tokenId -> generated address
  mapping(uint256 => address) private _tokenIdToAddress;

  // mapping generated address -> tokenId
  mapping(address => uint256) private _addressToTokenId;

  // mapping owner -> first owned token
  // note that we work 1 based here because of initialization
  // e.g. firstId == 1 links to tokenId 0;
  struct Owned {
    uint256 count;
    ListKey listKey; // first tokenId in linked list
  }
  mapping(address => Owned) private _owned;

  // our master blueprint tokenreceiver class
  address private _masterTokenReceiver;

  /* ======== CONSTRUCTOR ======== */

  /**
   * @dev uri is for WOWS predefined NFT's
   * The other token uri's must set separately
   */
  constructor(string memory _uri) ERC1155PresetMinterPauser(_uri) {
    // Setup wows card definition
    _wowsLevelCap[0] = 100;
    _wowsLevelCap[1] = 60;
    _wowsLevelCap[2] = 40;
    _wowsLevelCap[3] = 20;

    // create our mastercopy for all minimal per token proxy contracts.
    _masterTokenReceiver = address(new WOWSCryptofolio{ salt: 0x0 }());
  }

  /* ======== STATE MODIFING ======== */

  /**
   * @dev set the URI for either predefined cards or custom cards.
   * For changing the URI for predefined cards, tokenId 0 must be passed
   * Custom tokenId's (> 32 Bit range) get their own URI per tokenId.
   */

  function setURI(uint256 tokenId, string memory _uri) public override {
    require(hasRole(MINTER_ROLE, _msgSender()), 'Only minter');
    require(tokenId == 0 || tokenId & 0xFFFFFFFF == 0, 'invalid tokenId');

    if (tokenId == 0) _setURI(_uri);
    else _customCards[tokenId].uri = _uri;
  }

  /**
   * @dev each custom card has an own level. Level will be used when
   * calculating rewards and raiding power.
   */
  function setCustomCardLevel(uint256 tokenId, uint8 cardLevel)
    public
    override
  {
    require(hasRole(MINTER_ROLE, _msgSender()), 'Only minter');
    require(tokenId & 0xFFFFFFFF == 0, 'only for custom cards');
    _customCards[tokenId].level = cardLevel;
  }

  /**
   * @dev set the cap of a specific WOWS level.
   * Note that this function can be used to add a new card
   */
  function setWowsLevelCaps(uint8[] memory levels, uint16[] memory newCaps)
    public
  {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');
    require(levels.length == newCaps.length, 'Only admin');
    for (uint256 i = 0; i < levels.length; ++i) {
      require(_wowsLevelCap[levels[i]] < newCaps[i], 'Decrement forbidden');
      _wowsLevelCap[levels[i]] = newCaps[i];
    }
  }

  /**
   * @dev Prevent auctions like OpenSea to sell this thoken
   * Selling by third party are only allowed for cryptofolios
   * which are locked in one of our TradingFloor contracts
   */
  function setApprovalForAll(address operator, bool approved)
    public
    virtual
    override
  {
    require(hasRole(OPERATOR_ROLE, operator), 'Only Operators');
    super.setApprovalForAll(operator, approved);
  }

  /*============== GETTER ============= */

  /**
   * @dev See {IERC1155MetadataURI-uri}.
   * @return url to metadata json file
   * For custom token the uri is thought to be a full url without placeholders.
   * For our wows token a tokenid placeholder is expected, and the id
   * is of the metadata is tokenId >> 16 because 16Bit tken share the same metadata / image.
   */
  function uri(uint256 tokenId)
    external
    view
    virtual
    override(ERC1155)
    returns (string memory)
  {
    if (tokenId > 0xFFFFFFFF)
      // custom token
      return _customCards[tokenId].uri;
    // super currently not working because of OZ external definition
    return ERC1155(this).uri(0);
  }

  /**
   * @dev Evaluate the tokenId from reference address
   * a cross check is required because tokenid 0 is valid.
   * @param tokenAddress address to convert
   * @return tokenId in case of success, uint256(-1) in case of error
   */
  function addressToTokenId(address tokenAddress)
    external
    view
    override
    returns (uint256)
  {
    uint256 tokenId = _addressToTokenId[tokenAddress];
    return _tokenIdToAddress[tokenId] == tokenAddress ? tokenId : uint256(-1);
  }

  /**
   * @dev Evaluate address from given tokenId
   * @param tokenId tokenId to convert
   * @return address. address(0) must be interpreted as not existing
   */
  function tokenIdToAddress(uint256 tokenId)
    external
    view
    override
    returns (address)
  {
    return _tokenIdToAddress[tokenId];
  }

  /**
   * @dev return information about a wows card
   * @param level the level of the card
   * @param cardId the id of the card
   * @return cap max mintable cards
   * @return minted already minted cards
   */
  function getCardData(uint8 level, uint8 cardId)
    external
    view
    returns (uint16 cap, uint16 minted)
  {
    return (
      _wowsLevelCap[level],
      _wowsCardsMinted[uint16(level << 8) | cardId]
    );
  }

  /**
   * @dev return information about a wows card
   * @param level the level of the card
   * @param cardIds a list of card ids to query
   * @return capMintedPair array of 16 Bit, cap,minted,...
   */
  function getCardDataBatch(uint8 level, uint8[] memory cardIds)
    external
    view
    returns (uint16[] memory capMintedPair)
  {
    uint16[] memory result = new uint16[](cardIds.length * 2);
    for (uint256 i = 0; i < cardIds.length; ++i) {
      result[i * 2] = _wowsLevelCap[level];
      result[i * 2 + 1] = _wowsCardsMinted[uint16(level << 8) | cardIds[i]];
    }
    return result;
  }

  /**
   * @dev return the level and the mint timestamp of tokenId
   * @param tokenId the tokenId to query
   * @return mintTimestamp the timestamp token was minted
   * @return level the level token belongs to
   */
  function getTokenData(uint256 tokenId)
    external
    view
    returns (uint64 mintTimestamp, uint8 level)
  {
    uint8 _level =
      (tokenId > 0xFFFFFFFF)
        ? _customCards[tokenId].level
        : uint8(tokenId >> 24);
    return (_tokenInfos[tokenId].timestamp, _level);
  }

  /**
   * @dev return the level and the mint timestamp of tokenId
   */
  function isTradeFloor(address account) external view override returns (bool) {
    return hasRole(TRADEFLOOR_ROLE, account);
  }

  /**
   * @dev return the next mintable tokenId of a card
   * @param level the level of the card
   * @param cardId the id of the card
   * @return bool true if a free tokenId was found
   * @return uint256 the first free tokenId
   */
  function getNextMintableTokenId(uint8 level, uint8 cardId)
    external
    view
    override
    returns (bool, uint256)
  {
    uint16 levelCard = ((uint16(level) << 8) | cardId);
    uint256 tokenId = uint32(levelCard) << 16;
    uint256 tokenIdEnd = tokenId + _wowsLevelCap[level];

    for (; tokenId < tokenIdEnd; ++tokenId)
      if (!_tokenInfos[tokenId].minted) return (true, tokenId);
    return (false, uint256(-1));
  }

  /**
   * @dev return the next mintable custon card id
   */
  function getNextMintableCustomToken()
    external
    view
    override
    returns (uint256)
  {
    require(_customCardCount + 0x100000000 > _customCardCount, 'math overflow');
    return _customCardCount + 0x100000000;
  }

  /**
   * @dev return list of tokenIds owned by account
   */
  function gettTokenIds(address account)
    external
    view
    returns (uint256[] memory)
  {
    Owned storage list = _owned[account];
    uint256[] memory result = new uint256[](list.count);
    ListKey storage key = list.listKey;
    for (uint256 i = 0; i < list.count; ++i) {
      result[i] = key.index;
      key = _tokenInfos[key.index].listKey;
    }
    return result;
  }

  /*============== internal ==============*/

  /**
   * @dev ownership change -> update linked list owner -> tokenId
   * linkKeys are 1 based where tokenIds are 0-based
   */
  function _relinkOwner(
    address from,
    address to,
    uint256 tokenId
  ) internal {
    TokenInfo storage tokenInfo = _tokenInfos[tokenId];

    // remove tokenId from List
    if (from != address(0)) {
      Owned storage fromList = _owned[from];
      require(fromList.count > 0, 'Count mismatch');
      ListKey storage key = fromList.listKey;
      uint256 count = fromList.count;
      // search the token which links to tokenId
      for (; count > 0 && key.index != tokenId; --count)
        key = _tokenInfos[key.index].listKey;
      require(key.index == tokenId, 'key mismatch');
      // unlink prev -> tokenId
      key.index = tokenInfo.listKey.index;
      // unlink tokenId -> next
      tokenInfo.listKey.index = 0;
      // decrement count
      fromList.count--;
    }

    if (to != address(0)) {
      Owned storage toList = _owned[to];
      tokenInfo.listKey.index = toList.listKey.index;
      toList.listKey.index = tokenId;
      toList.count++;
    }
  }

  /**
   * @dev hook overwrite of ERC1155PresetMinterPauser::_beforeTokenTransfer;
   * will be called on all mint / burn / transfer [batch] functions
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override(ERC1155PresetMinterPauser) {
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

    require(ids.length == amounts.length, 'Length mismatch');

    for (uint256 i = 0; i < ids.length; ++i) {
      // we have only NFT's in this contract
      require(amounts[i] == 1, 'Amount != 1');
      uint256 tokenId = ids[i];
      address tokenAddress = _tokenIdToAddress[tokenId];
      TokenInfo storage tokenInfo = _tokenInfos[tokenId];
      if (from == address(0)) {
        // minting
        require(!tokenInfo.minted, 'Already minted');
        tokenInfo.minted = true;
        // solhint-disable-next-line not-rely-on-time
        tokenInfo.timestamp = uint64(block.timestamp);
        // create a new WOWSCryptofolio by cloning masterTokenReciver
        // the clone itself is a minimal delegate proxy.
        if (tokenAddress == address(0)) {
          tokenAddress = Clones.clone(_masterTokenReceiver);
          _tokenIdToAddress[tokenId] = tokenAddress;
          WOWSCryptofolio(tokenAddress).initialize();
        }
        _addressToTokenId[tokenAddress] = tokenId;
        // increment the minted count for this card
        if (tokenId <= 0xFFFFFFFF) _wowsCardsMinted[uint16(tokenId >> 16)] += 1;
        else ++_customCardCount;
      } else if (to == address(0)) {
        // burn
        // make sure underlying assets gets burned
        WOWSCryptofolio(tokenAddress).burn();
        // make token mintable again
        tokenInfo.minted = false;
        // decrement the minted count for this card
        if (tokenId <= 0xFFFFFFFF) _wowsCardsMinted[uint16(tokenId >> 16)] -= 1;
      }
      // Signal ownership change in Cryptofolio
      WOWSCryptofolio(tokenAddress).setOwner(to);
      // Reflect ownership change in our linked list
      _relinkOwner(from, to, tokenId);
    }
  }
}
