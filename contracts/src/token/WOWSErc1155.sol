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
import '../cfolio/interfaces/ICFolioItemHandler.sol';
import '../utils/TokenIds.sol';

contract WOWSERC1155 is IWOWSERC1155, WOWSMinterPauser {
  using TokenIds for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  // Operator role is required to set approval for tokens. This prevents
  // auctions like OpenSea from selling the tokens. Selling by third parties
  // is only allowed for cryptofolios which are locked in one of our TradeFloor
  // contracts.
  bytes32 public constant OPERATOR_ROLE = 'OPERATOR_ROLE';

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Card state of custom NFT's
  mapping(uint256 => uint8) private _customLevels;
  string private _customMetadataURI;

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
  // Note that we work 1-based here because of initialization
  // e.g. firstId == 1 links to tokenId 0
  struct Owned {
    uint256 count;
    ListKey listKey; // First tokenId in linked list
  }
  mapping(address => Owned) private _owned;

  // Our master cryptofolio used for clones
  address private immutable _cryptofolio;
  string private _cfolioMetadataURI;

  //////////////////////////////////////////////////////////////////////////////
  // Modifier
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'SFT: Only admin');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev URI is for WOWS predefined NFT's
   *
   * The other token URI's must be set separately.
   */
  constructor(address owner, address cryptofolio) {
    _cryptofolio = cryptofolio;
    // Initialize {AccessControl}
    _setupRole(DEFAULT_ADMIN_ROLE, owner);
  }

  function initialize(
    address owner,
    string calldata baseMetadataURI,
    string calldata customMetadataURI,
    string calldata cfolioMetadataURI,
    string calldata contractMetadataURI
  ) public {
    // Check for one time initialization
    require(
      getRoleMemberCount(DEFAULT_ADMIN_ROLE) == 0,
      'SFT: Already initialized'
    );

    // Initialize {AccessControl}
    _setupRole(DEFAULT_ADMIN_ROLE, owner);

    // Metadata
    _setBaseMetadataURI(baseMetadataURI);
    _setContractMetadataURI(contractMetadataURI);
    _cfolioMetadataURI = cfolioMetadataURI;
    _customMetadataURI = customMetadataURI;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IWOWSERC1155}
  //////////////////////////////////////////////////////////////////////////////

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
   * @dev See {IWOWSERC1155-setBaseMetadataURI}.
   */
  function setBaseMetadataURI(string calldata baseMetadataURI)
    external
    override
    onlyAdmin
  {
    // Set state
    _setBaseMetadataURI(baseMetadataURI);
  }

  /**
   * @dev See {IWOWSERC1155-setCustomMetadataURI}.
   */
  function setCustomMetadataURI(string calldata customMetadataURI)
    external
    override
    onlyAdmin
  {
    // Set state
    _customMetadataURI = customMetadataURI;
  }

  /**
   * @dev See {IWOWSERC1155-setCFolioMetadataURI}.
   */
  function setCFolioMetadataURI(string calldata cfolioMetadataURI)
    external
    override
    onlyAdmin
  {
    // Set state
    _cfolioMetadataURI = cfolioMetadataURI;
  }

  /**
   * @dev See {IWOWSERC1155-setContractMetadataURI}.
   */
  function setContractMetadataURI(string memory contractMetadataURI)
    external
    override
    onlyAdmin
  {
    // Set state
    _setContractMetadataURI(contractMetadataURI);
  }

  /**
   * @dev See {IWOWSERC1155-setCustomCardLevel}.
   */
  function setCustomCardLevel(uint256 tokenId, uint8 cardLevel)
    public
    override
  {
    // Access control
    require(hasRole(MINTER_ROLE, _msgSender()), 'SFT: Only minter');

    // Validate parameter
    require(!tokenId.isCustomCard(), 'SFT: Only custom cards');

    // Update state
    _customLevels[tokenId] = cardLevel;
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
    if (tokenId.isStockCard()) {
      return _uri('', tokenId >> 16, 4);
    } else if (tokenId.isCustomCard()) {
      return _uri(_customMetadataURI, tokenId, 0);
    } else {
      return _uri(_cfolioMetadataURI, tokenId, 0);
    }
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
    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1;

    _tokenTransfered(from, to, tokenIds, amounts, data);

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
    _tokenTransfered(from, to, tokenIds, amounts, data);

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
   * @dev See {IWOWSERC1155-getTokenIds}.
   */
  function getTokenIds(address account)
    public
    view
    override
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
  // Internal functionality
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Handles transfer of an SFT token
   */
  function _tokenTransfered(
    address from,
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) private {
    uint256 tokenIdsLength = tokenIds.length;
    uint256 numUniqueCFolioHandlers = 0;
    address[] memory uniqueCFolioHandlers = new address[](tokenIdsLength);
    address[] memory cFolioHandlers = new address[](tokenIdsLength);

    for (uint256 i = 0; i < tokenIdsLength; ++i) {
      // We have only NFTs in this contract
      require(amounts[i] == 1, 'Amount != 1');

      uint256 tokenId = tokenIds[i];

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
          IWOWSCryptofolio(tokenAddress).initialize(tokenId.isBaseCard());
          if (tokenId.isCFolioCard()) {
            require(data.length == 20, 'SFT: Invalid data');
            address handler = _getAddress(data);
            require(handler != address(0), 'SFT: Invalid address');
            IWOWSCryptofolio(tokenAddress).setHandler(handler);
          }
        }
        _addressToTokenId[tokenAddress] = tokenId;
      }
      // Burning
      else if (to == address(0)) {
        // Make sure underlying assets gets burned
        if (tokenId.isBaseCard()) {
          uint256[] memory cfolioItems = getTokenIds(tokenAddress);
          uint256 length = cfolioItems.length;
          if (length > 0) {
            uint256[] memory cfolioAmounts = new uint256[](length);
            for (uint256 j = 0; j < length; ++j) cfolioAmounts[j] = 1;
            _batchBurn(tokenAddress, cfolioItems, cfolioAmounts);
          }
        }
        // Make token mintable again
        tokenInfo.minted = false;
      }

      // Signal ownership change in Cryptofolio
      IWOWSCryptofolio(tokenAddress).setOwner(to);

      if (!tokenId.isBaseCard()) {
        address handler = IWOWSCryptofolio(tokenAddress).getHandler();
        uint256 iter = numUniqueCFolioHandlers;
        while (iter > 0 && uniqueCFolioHandlers[iter - 1] != handler) --iter;
        if (iter == 0) {
          require(handler != address(0), 'SFTE: Invalid handler');
          uniqueCFolioHandlers[numUniqueCFolioHandlers++] = handler;
        }
        cFolioHandlers[i] = handler;
      }

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
    for (uint256 i = 0; i < numUniqueCFolioHandlers; ++i) {
      ICFolioItemHandler(uniqueCFolioHandlers[i]).onCFolioItemsTransferedFrom(
        from,
        to,
        tokenIds,
        cFolioHandlers
      );
    }
  }

  /**
   * @dev Get the level of a given token
   *
   * @param tokenId The ID of the token
   *
   * @return level The level of the token
   */
  function _getLevel(uint256 tokenId) private view returns (uint8 level) {
    if (tokenId.isCustomCard()) {
      level = _customLevels[tokenId];
    } else {
      level = uint8(tokenId >> 24);
    }
  }

  /**
   * @dev Get the address from the user data parameter
   *
   * @param data Per ERC-1155, the data parameter is additional data with no
   * specified format, and is sent unaltered in the call to
   * {IERC1155Receiver-onERC1155Received} on the receiver of the minted token.
   */
  function _getAddress(bytes memory data) public pure returns (address addr) {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      addr := mload(add(data, 20))
    }
  }
}
