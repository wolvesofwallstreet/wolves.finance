/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/presets/ERC1155PresetMinterPauser.sol';

import './interfaces/IERC1155Cryptofolio.sol';
import './WOWSErc1155TokenReceiver.sol';

/**
 * TODO's:
 * - generate unique address for token when first time minted.
 * - getter for the cryptofolio
 * - getter for token level / timestamp.
 * - check for mintable amount for wows cards.
 */

contract WOWSERC1155CryptoFolio is
  ERC1155PresetMinterPauser,
  IERC1155Cryptofolio
{
  bytes32 public constant TRADEFLOOR_ROLE = keccak256('TRADEFLOOR_ROLE');

  // special state for wows own cards
  struct WowsCard {
    uint16 cap;
    uint16 minted;
  }
  mapping(uint16 => WowsCard) private _wowsCards;

  // card state of custom NFT's
  struct CustomCard {
    string uri;
    uint8 level;
  }
  mapping(uint256 => CustomCard) private _customCards;
  uint256 private _customCardCount;

  // per token data
  struct TokenInfo {
    bool minted; // make sure we only mint 1
    uint64 timestamp;
  }
  mapping(uint256 => TokenInfo) private _tokenInfos;

  // mapping to store cryptofolio nft items
  mapping(uint256 => mapping(address => uint256[])) private _cryptofolios;

  // mapping tokenId -> generated address
  mapping(uint256 => address) private _tokenIdToAddress;

  // mapping generated address -> tokenId
  mapping(address => uint256) private _addressToTokenId;

  /* ======== CONSTRUCTOR ======== */

  /**
   * @dev uri is for WOWS predefined NFT's
   * The other token uri's must set separately
   */
  constructor(string memory _uri) ERC1155PresetMinterPauser(_uri) {
    // Setup wows card definition
    _wowsCards[(uint16(1) << 8) | 0].cap = 10; // Level 1 / Card 0
    _wowsCards[(uint16(1) << 8) | 1].cap = 10; // Level 1 / Card 1
    _wowsCards[(uint16(1) << 8) | 2].cap = 10; // Level 1 / Card 2
    _wowsCards[(uint16(1) << 8) | 3].cap = 10; // Level 1 / Card 3
  }

  /* ======== STATE MODIFING ======== */

  /**
   * @dev set the URI for either predefined cards or custom cards.
   * For changing the URI for predefined cards, tokenId 0 must be passed
   * Custom tokenId's (> 32 Bit range) get their own URI per tokenId.
   */

  function setURI(uint256 tokenId, string memory _uri) public {
    require(hasRole(MINTER_ROLE, _msgSender()), 'Only minter');
    require(tokenId == 0 || tokenId & 0xFFFFFFFF == 0, 'invalid tokenId');

    if (tokenId == 0) _setURI(_uri);
    else _customCards[tokenId].uri = _uri;
  }

  /**
   * @dev each custom card has an own level. Level will be used when
   * calculating rewards and raiding power.
   */
  function setCustomCardLevel(uint256 tokenId, uint8 cardLevel) public {
    require(hasRole(MINTER_ROLE, _msgSender()), 'Only minter');
    require(tokenId & 0xFFFFFFFF == 0, 'only for custom cards');
    _customCards[tokenId].level = cardLevel;
  }

  /**
   * @dev set the cap of a specific WOWS card.
   * Note that this function can be used to add a new card
   */
  function setWowsCardCap(
    uint8 level,
    uint8 cardId,
    uint16 newCap
  ) public {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');
    WowsCard storage card = _wowsCards[(uint16(level) << 8) | cardId];
    require(card.cap < newCap, 'Decrement forbidden');
    card.cap = newCap;
  }

  /**
   * @dev update our collection of tradeable cryptofolio items
   * This function is only allowed to be called from one if our pseudo TokenReceiver contracts
   */
  function onTokensReceived(
    address operator,
    uint256[] memory ids,
    uint256[] memory amounts
  ) external override {
    require(hasRole(TRADEFLOOR_ROLE, operator), 'Only traders');
    uint256 tokenId = _addressToTokenId[_msgSender()];
    require(_tokenIdToAddress[tokenId] == _msgSender(), 'Invalid caller');
    require(ids.length == amounts.length, 'Input lengths differ');

    uint256[] storage currentIds = _cryptofolios[tokenId][operator];
    // Check for first-time insert from this operator
    if (currentIds.length == 0)
      // Allow operator to withraw items on behalf of cryptofolio
      WOWSErc1155TokenReceiver(_msgSender()).setApproval(IERC1155(operator));

    for (uint256 iIds = 0; iIds < ids.length; ++iIds) {
      if (amounts[iIds] > 0) {
        uint256 id = ids[iIds];
        // search tokenId
        uint256 i = 0;
        for (; i < currentIds.length && currentIds[i] != id; ++i) i;
        // if token was not found, insert it
        if (i == currentIds.length) currentIds.push(id);
      }
    }
  }

  /*============== Getter ============= */

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
    WowsCard storage card = _wowsCards[uint16(level << 8) | cardId];
    return (card.cap, card.minted);
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
      WowsCard storage card = _wowsCards[uint16(level << 8) | cardIds[i]];
      result[i * 2] = card.cap;
      result[i * 2 + 1] = card.minted;
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
   * @dev return array of cryptofolio tokenIds
   * the tokenIds belong to the contract operator
   * a list of all known operators can be queried
   * by enumerating TRADER_ROLE addresses
   * @param tokenId the tokenId to query
   * @return ids tokenids in scope of operator
   * @return idsLength number of valid tokenids
   */
  function getCryptofolio(uint256 tokenId, address operator)
    external
    view
    returns (uint256[] memory ids, uint256 idsLength)
  {
    uint256[] storage current = _cryptofolios[tokenId][operator];
    uint256[] memory result = new uint256[](current.length);
    uint256 newLength;

    for (uint256 i = 0; i < current.length; ++i)
      if (current[i] != uint256(-1)) result[newLength++] = current[i];
    return (result, newLength);
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
    returns (bool, uint256)
  {
    uint16 levelCard = ((uint16(level) << 8) | cardId);
    uint16 cap = _wowsCards[levelCard].cap;

    uint256 tokenId = uint32(levelCard) << 16;
    while (cap > 0) {
      if (!_tokenInfos[tokenId].minted) return (true, tokenId);
      --cap;
    }
    return (false, uint256(-1));
  }

  /**
   * @dev return the next mintable custon card id
   */
  function getNextMintableCustomToken() external view returns (uint256) {
    require(_customCardCount + 0x100000000 > _customCardCount, 'math overflow');
    return _customCardCount + 0x100000000;
  }

  /*============== internal ==============*/

  function _cryptofolioEmpty(uint256 tokenId) internal view returns (bool) {
    //ToDo
    return tokenId != 0;
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
      TokenInfo storage tokenInfo = _tokenInfos[tokenId];
      if (from == address(0)) {
        // minting
        require(!tokenInfo.minted, 'Already minted');
        tokenInfo.minted = true;
        // solhint-disable-next-line not-rely-on-time
        tokenInfo.timestamp = uint64(block.timestamp);
        // create a new ERC1155TokenReceiver
        if (_tokenIdToAddress[tokenId] == address(0))
          _tokenIdToAddress[tokenId] = address(new WOWSErc1155TokenReceiver());
        _addressToTokenId[_tokenIdToAddress[tokenId]] = tokenId;
        // increment the minted count for this card
        if (tokenId <= 0xFFFFFFFF)
          _wowsCards[uint16(tokenId >> 16)].minted += 1;
        else ++_customCardCount;
      } else if (to == address(0)) {
        // burn
        // We don't allow burn of non-empty cryptofolios
        require(_cryptofolioEmpty(tokenId), 'Cryptofolio not empty');
        // make token mintable again
        tokenInfo.minted = false;
        // decrement the minted count for this card
        if (tokenId <= 0xFFFFFFFF)
          _wowsCards[uint16(tokenId >> 16)].minted -= 1;
      }
    }
  }
}
