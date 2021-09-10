/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/interfaces/IERC20.sol';
import '../../0xerc1155/proxy/Initializable.sol';
import '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';
import '../../0xerc1155/tokens/ERC1155/ERC1155Metadata.sol';

import '../token/interfaces/IWOWSCryptofolio.sol';
import '../token/interfaces/IWOWSERC1155.sol';
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';
import '../utils/TokenIds.sol';

import './interfaces/ICFolioItemCallback.sol';
import './WOWSMarketMinterPauser.sol';

/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Multi Token Standard, including the Metadata URI extension.
 *
 * This contract is an extension of the minter preset. It accepts the address
 * of the contract minting the token via the ERC-1155 data parameter. When
 * the token is transferred or burned, the minter is notified.
 *
 * Token ID allocation:
 *
 *   - 32Bit Stock Cards
 *   - 32Bit Custom Cards
 *   - Remaining CFolio NFTs
 */
contract TradeFloor is ERC1155Metadata, WOWSMarketMinterPauser, ERC1155Holder {
  using TokenIds for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  string private constant _NAME = 'Wolves of Wall Street - C-Folio NFTs';
  string private constant _SYMBOL = 'WOWSCFNFT';

  //////////////////////////////////////////////////////////////////////////////
  // Modifier
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyAdmins() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');
    _;
  }

  modifier notNull(address adr) {
    require(adr != address(0), 'Null address');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Per token information, used to cap NFT's and to allow querying a list
   * of NFT's owned by an address
   */
  struct ListKey {
    uint256 index;
  }

  // Per token information
  struct TokenInfo {
    bool minted; // Make sure we only mint 1
    ListKey listKey; // Next tokenId in the owner linkedList
  }
  mapping(uint256 => TokenInfo) private _tokenInfos;

  // Mapping owner -> first owned token
  //
  // Note that we work 1 based here because of initialization
  // e.g. firstId == 1 links to tokenId 0;
  struct Owned {
    uint256 count;
    ListKey listKey; // First tokenId in linked list
  }
  mapping(address => Owned) private _owned;

  // Our SFT contract, needed to check for locked transfers
  IWOWSERC1155 private immutable _sftHolder;

  // Our CFolioItemBridge contract, needed to get hashed tokenId
  address private immutable _cfiBridge;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Construct the contract
   *
   * @param addressRegistry Registry containing our system addresses
   *
   * Note: Pause operation in this context. Only calls from Proxy allowed.
   */
  constructor(IAddressRegistry addressRegistry) {
    // Immutable, visible for all contexts
    _sftHolder = IWOWSERC1155(
      _getAddressRegistryAddress(addressRegistry, AddressBook.SFT_HOLDER)
    );

    // Immutable, visible for all contexts
    _cfiBridge = _getAddressRegistryAddress(
      addressRegistry,
      AddressBook.CFOLIOITEM_BRIDGE_PROXY
    );
  }

  /**
   * @dev One time contract initializer
   *
   * @param addressRegistry Registry containing our system addresses
   * @param openSeaProxyRegistry The OpenSea proxy registry
   * @param tokenUriPrefix The ERC-1155 metadata URI Prefix
   * @param contractMetadataURI The URI for contract metadata of the storefront
   */
  function initialize(
    IAddressRegistry addressRegistry,
    OpenSeaProxyRegistry openSeaProxyRegistry,
    string memory tokenUriPrefix,
    string memory contractMetadataURI
  ) public initializer {
    // Initialize ancestor
    super.initialize(
      addressRegistry,
      openSeaProxyRegistry,
      _NAME,
      _SYMBOL,
      contractMetadataURI
    );

    // Initialize {ERC1155Metadata}
    _setBaseMetadataURI(tokenUriPrefix);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Return list of tokenIds owned by `account`
   */
  function getTokenIds(address account)
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

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155} via {WOWSMarketMinterPauser}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC1155-safeTransferFrom}.
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes calldata data
  ) public override notNull(from) notNull(to) {
    // Call parent
    super.safeTransferFrom(from, to, tokenId, amount, data);

    uint256[] memory tokenIds = new uint256[](1);
    uint256[] memory amounts = new uint256[](1);
    tokenIds[0] = tokenId;
    amounts[0] = amount;

    _onTransfer(from, to, tokenIds);
  }

  /**
   * @dev See {IERC1155-safeBatchTransferFrom}.
   */
  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] calldata tokenIds,
    uint256[] calldata amounts,
    bytes calldata data
  ) public override notNull(from) notNull(to) {
    // Validate parameters
    require(tokenIds.length == amounts.length, "Lengths don't match");

    // Call parent
    super.safeBatchTransferFrom(from, to, tokenIds, amounts, data);

    _onTransfer(from, to, tokenIds);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155Metadata}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC1155Metadata-uri}.
   *
   * Revert for unminted SFT NFTs.
   */
  function uri(uint256 tokenId) public view override returns (string memory) {
    // Validate state
    require(_tokenInfos[tokenId].minted, 'Not minted');

    // Load state
    return _uri(tokenId, 0);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {WOWSMarketMinterPauser}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155MintBurn-_burn}.
   */
  function burn(
    address account,
    uint256 tokenId,
    uint256 amount
  ) public override notNull(account) {
    // Call ancestor
    super.burn(account, tokenId, amount);

    // Perform internal handling
    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;
    _onTransfer(account, address(0), tokenIds);
  }

  /**
   * @dev See {ERC1155MintBurn-_batchBurn}.
   */
  function burnBatch(
    address account,
    uint256[] calldata tokenIds,
    uint256[] calldata amounts
  ) public virtual override notNull(account) {
    // Validate parameters
    require(tokenIds.length == amounts.length, "Lengths don't match");

    // Call ancestor
    super.burnBatch(account, tokenIds, amounts);

    // Perform internal handling
    _onTransfer(account, address(0), tokenIds);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155TokenReceiver} via {ERC1155Holder}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC1155TokenReceiver-onERC1155Received}
   */
  function onERC1155Received(
    address operator,
    address from,
    uint256 tokenId,
    uint256 amount,
    bytes calldata data
  ) public override returns (bytes4) {
    // Handle tokens
    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = amount;
    _onTokensReceived(from, tokenIds, amounts, data);

    // Call ancestor
    return super.onERC1155Received(operator, from, tokenId, amount, data);
  }

  /**
   * @dev See {IERC1155TokenReceiver-onERC1155BatchReceived}
   */
  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes calldata data
  ) public override returns (bytes4) {
    // Handle tokens
    _onTokensReceived(from, tokenIds, amounts, data);

    // Call ancestor
    return
      super.onERC1155BatchReceived(operator, from, tokenIds, amounts, data);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC165}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC165-supportsInterface}
   *
   * This function is necessary due to diamond inheritance.
   */
  function supportsInterface(bytes4 _interfaceID)
    public
    pure
    virtual
    override(ERC1155Metadata, WOWSMarket, ERC1155Holder)
    returns (bool)
  {
    // Call ancestors
    if (ERC1155Metadata.supportsInterface(_interfaceID)) return true;
    if (WOWSMarket.supportsInterface(_interfaceID)) return true;
    if (ERC1155Holder.supportsInterface(_interfaceID)) return true;

    return false;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Administrative functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155Metadata-setBaseMetadataURI}.
   */
  function setBaseMetadataURI(string memory baseMetadataURI)
    external
    onlyAdmins
  {
    // Set state
    _setBaseMetadataURI(baseMetadataURI);
  }

  /**
   * @dev Withdraw tokenAddress ERC20token to destination
   *
   * A future improvement would be to swap the token into WOWS.
   *
   * @param tokenAddress the address of the token to transfer. Cannot be
   * rewardToken.
   */
  function collectGarbage(address tokenAddress) external onlyAdmins {
    // Transfer token to msg.sender
    uint256 amountToken = IERC20(tokenAddress).balanceOf(address(this));
    if (amountToken > 0)
      IERC20(tokenAddress).transfer(_msgSender(), amountToken);
  }

  /**
   * @dev Move all TF CFolioItems inside CFolios to CFolioItemBridge
   */
  function migrate(uint256[] calldata tokenIds) external onlyAdmins {
    uint256 length = tokenIds.length;
    uint256[] memory cfiTokenIds;
    uint256 cfiLength;
    address cfolio;

    for (uint256 i = 0; i < length; ++i) {
      if (tokenIds[i].isBaseCard()) {
        cfolio = _sftHolder.tokenIdToAddress(tokenIds[i]);
        require(cfolio != address(0), 'Invalid');
        (cfiTokenIds, cfiLength) = IWOWSCryptofolio(cfolio).getCryptofolio(
          address(this)
        );
        for (uint256 j = 0; j < cfiLength; ++j) {
          // Burn CFI (which transfers sft)
          _burn(cfolio, cfiTokenIds[j], 1);
          _relinkOwner(cfolio, address(0), cfiTokenIds[j], uint256(-1));

          // Transfer the SFT cFolio (currently owned by us) to cfiBridge
          WOWSMarketMinterPauser(address(_sftHolder)).safeTransferFrom(
            address(this),
            _cfiBridge,
            cfiTokenIds[j].toSftTokenId(),
            1,
            abi.encodePacked(cfolio)
          );
        }
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  function _onTransfer(
    address from,
    address to,
    uint256[] memory tokenIds
  ) private {
    // Before all NFTs are migrated, users could have cfolioItems from this
    // contract in cfolio. Because burning is not recorded in cfih's anymore,
    // we have to disallow it. Next line can be removed after migration.
    require(
      from == address(0) || _sftHolder.addressToTokenId(from) == uint256(-1),
      'TF: Forbidden'
    );

    // Count SFT tokenIds
    uint256 length = tokenIds.length;
    // Relink owner
    for (uint256 i = 0; i < length; ++i) {
      _relinkOwner(from, to, tokenIds[i], uint256(-1));
    }

    // On Burn we need to transfer SFT ownership back
    if (to == address(0)) {
      uint256[] memory sftTokenIds = new uint256[](length);
      uint256[] memory amounts = new uint256[](length);
      for (uint256 i = 0; i < length; ++i) {
        uint256 tokenId = tokenIds[i];
        sftTokenIds[i] = tokenId.toSftTokenId();
        amounts[i] = 1;
      }

      WOWSMarketMinterPauser(address(_sftHolder)).safeBatchTransferFrom(
        address(this),
        _msgSender(),
        sftTokenIds,
        amounts,
        ''
      );
    }
  }

  /**
   * @dev SFT token arrived, provide an NFT
   */
  function _onTokensReceived(
    address from,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) private {
    // We only support tokens from our SFT Holder contract
    require(_msgSender() == address(_sftHolder), 'TF: Invalid sender');

    // Validate parameters
    require(tokenIds.length == amounts.length, 'TF: Lengths mismatch');

    // To save gas we allow minting directly into a given recipient
    address sftRecipient;
    if (data.length == 20) {
      sftRecipient = _getAddress(data);
      require(sftRecipient != address(0), 'TF: invalid recipient');
    } else sftRecipient = from;

    // Update state
    uint256[] memory mintedTokenIds = new uint256[](tokenIds.length);
    for (uint256 i = 0; i < tokenIds.length; ++i) {
      require(amounts[i] == 1, 'Amount != 1 not allowed');

      uint256 mintedTokenId = _hashedTokenId(tokenIds[i]);
      mintedTokenIds[i] = mintedTokenId;
    }
    _batchMintAndEmit(sftRecipient, mintedTokenIds, amounts, data);

    _onTransfer(address(0), sftRecipient, mintedTokenIds);
  }

  /**
   * @dev Ownership change -> update linked list owner -> tokenId
   *
   * If tokenIdNew is != uint256(-1) this function executes an
   * ownership transfer of "from" from tokenId to tokenIdNew
   * In this case "to" must be set to 0.
   */
  function _relinkOwner(
    address from,
    address to,
    uint256 tokenId,
    uint256 tokenIdNew
  ) internal {
    // Load state
    TokenInfo storage tokenInfo = _tokenInfos[tokenId];

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

      if (tokenIdNew == uint256(-1)) {
        // Unlink prev -> tokenId
        key.index = tokenInfo.listKey.index;
        // Decrement count
        fromList.count--;
      } else {
        // replace tokenId -> tokenIdNew
        key.index = tokenIdNew;
        TokenInfo storage tokenInfoNew = _tokenInfos[tokenIdNew];
        require(!tokenInfoNew.minted, 'Must not be minted');
        tokenInfoNew.listKey.index = tokenInfo.listKey.index;
        tokenInfoNew.minted = true;
      }
      // Unlink tokenId -> next
      tokenInfo.listKey.index = 0;
      require(tokenInfo.minted, 'Must be minted');
      tokenInfo.minted = false;
    }

    // Update state
    if (to != address(0)) {
      Owned storage toList = _owned[to];
      tokenInfo.listKey.index = toList.listKey.index;
      require(!tokenInfo.minted, 'Must not be minted');
      tokenInfo.minted = true;
      toList.listKey.index = tokenId;
      toList.count++;
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

  /**
   * @dev Save contract size by wrappng external call into an internal
   */
  function _getAddressRegistryAddress(IAddressRegistry reg, bytes32 data)
    private
    view
    returns (address)
  {
    return reg.getRegistryEntry(data);
  }

  /**
   * @dev Save contract size by wrappng external call into an internal
   */
  function _addressToTokenId(address tokenAddress)
    private
    view
    returns (uint256)
  {
    return _sftHolder.addressToTokenId(tokenAddress);
  }

  /**
   * @dev Calculate a 128-bit hash for making tokenIds unique to underlying asset
   *
   * @param sftTokenId The tokenId from SFT contract from that we use the first 128 bit
   * TokenIds in SFT contract are limited to max 128 Bit in WowsSftMinter contract.
   */
  function _hashedTokenId(uint256 sftTokenId) private view returns (uint256) {
    bytes memory hashData;
    uint256[] memory tokenIds;
    uint256 tokenIdsLength;
    if (sftTokenId.isBaseCard()) {
      // It's a base card, calculate hash using all cfolioItems
      address cfolio = _sftHolder.tokenIdToAddress(sftTokenId);
      require(cfolio != address(0), 'TF: src token invalid');
      (tokenIds, tokenIdsLength) = IWOWSCryptofolio(cfolio).getCryptofolio(
        _cfiBridge
      );
      hashData = abi.encodePacked(address(this), sftTokenId);
    } else {
      // It's a cfolioItem itself, only calculate underlying value
      tokenIds = new uint256[](1);
      tokenIds[0] = sftTokenId;
      tokenIdsLength = 1;
    }

    // Run through all cfolioItems and let their single CFolioItemHandler
    // append hashable data
    for (uint256 i = 0; i < tokenIdsLength; ++i) {
      address cfolio = _sftHolder.tokenIdToAddress(tokenIds[i].toSftTokenId());
      require(cfolio != address(0), 'TF: item token invalid');

      address handler = IWOWSCryptofolio(cfolio)._tradefloors(0);
      require(handler != address(0), 'TF: item handler invalid');

      hashData = ICFolioItemCallback(handler).appendHash(cfolio, hashData);
    }

    uint256 hashNum = uint256(keccak256(hashData));
    return (hashNum ^ (hashNum << 128)).maskHash() | sftTokenId;
  }
}
