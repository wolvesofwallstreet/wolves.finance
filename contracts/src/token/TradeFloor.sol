/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/interfaces/IERC20.sol';
import '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';

import '../token/interfaces/IWOWSERC1155.sol';
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';

import './interfaces/IMinterCallback.sol';
import './interfaces/ITradeFloor.sol';
import './WOWSMinterPauser.sol';

abstract contract OpenSeaProxyRegistry {
  mapping(address => address) public proxies;
}

/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Multi Token Standard, including the Metadata URI extension.
 *
 * This contract is an extension of the minter preset. It accepts the address
 * of the contract minting the token via the ERC-1155 data parameter. When
 * the token is transferred or burned, the minter is notified.
 */
contract TradeFloor is WOWSMinterPauser, ERC1155Holder {
  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Mapping from minted token ID to minting contract
   *
   * Token IDs are approved for a minting contract upon minting. The token ID
   * is then exclusive to that contract, and can't be reused by a different
   * minting contract.
   */
  mapping(uint256 => address) private _tokenIdToMinter;

  /**
   * @dev Per token information, used to cap NFT's and
   * to allow querying a list of NFT's owned by an address
   */

  // using a stuct allows us to work byRef
  struct ListKey {
    uint64 index;
  }

  // Per token information
  struct TokenInfo {
    bool minted; // Make sure we only mint 1
    ListKey listKey; // Next tokenId in the owner linkedList
  }
  mapping(uint64 => TokenInfo) private _tokenInfos;

  // Mapping owner -> first owned token
  //
  // Note that we work 1 based here because of initialization
  // e.g. firstId == 1 links to tokenId 0;
  struct Owned {
    uint64 count;
    ListKey listKey; // First tokenId in linked list
  }
  mapping(address => Owned) private _owned;

  //The registry to get the required addreeses from
  IAddressRegistry private immutable _addressRegistry;

  // Our SFT contract, needed to check for locked transfers
  IWOWSERC1155 private immutable _sftHolder;

  // solhint-disable-next-line const-name-snakecase
  string public constant name = 'Wolves of Wall Street - C-Folio NFTs';
  // solhint-disable-next-line const-name-snakecase
  string public constant symbol = 'WOWSCFNFT';

  // Only OPERATORS can approve when trading is restricted
  bytes32 public constant OPERATOR_ROLE = keccak256('OPERATOR_ROLE');

  // OpenSea Compatibility
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

  // Rarible compatibility
  /*
   * bytes4(keccak256('getFeeBps(uint256)')) == 0x0ebd4c7f
   * bytes4(keccak256('getFeeRecipients(uint256)')) == 0xb9c4d9fb
   *
   * => 0x0ebd4c7f ^ 0xb9c4d9fb == 0xb7799584
   */
  bytes4 private constant _INTERFACE_ID_FEES = 0xb7799584;
  uint256 private _fee;
  address private _feeRecipient;

  // Restrict approvals to OPERATOR_ROLE members
  bool private _tradingRestricted;

  // OpenSea per-account proxy registry.
  // Used to whitelist Approvals and save GAS
  OpenSeaProxyRegistry private immutable _openSeaProxyRegistry;

  // Rarible events
  // solhint-disable-next-line event-name-camelcase
  event CreateERC1155_v1(address indexed creator, string name, string symbol);
  event SecondarySaleFees(
    uint256 tokenId,
    address payable[] recipients,
    uint256[] bps
  );

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Construct the contract
   *
   * @param addressRegistry registry containing our system addresses
   *
   * Note: Pause operation in this context. Only calls from Proxy allowed
   */
  constructor(
    IAddressRegistry addressRegistry,
    OpenSeaProxyRegistry openSeaProxyRegistry
  ) {
    // Initialize {AccessControl}
    address marketingWallet =
      addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);
    _setupRole(DEFAULT_ADMIN_ROLE, marketingWallet);

    // Immutable, visible for all contexts
    _addressRegistry = addressRegistry;

    // Immutable, visible for all contexts
    _sftHolder = IWOWSERC1155(
      addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER)
    );

    // Immutable, visible for all contexts
    _openSeaProxyRegistry = openSeaProxyRegistry;

    // pause this instance
    _pause(true);
  }

  /**
   * @dev One time contract initializer
   *
   * @param tokenUriPrefix The ERC-1155 metadata URI Prefix
   * @param contractUri The contract metadata URI
   */
  function initialize(string memory tokenUriPrefix, string memory contractUri)
    public
  {
    require(_feeRecipient == address(0), 'already initialized');
    // Set tokenURIPrefix
    _setBaseMetadataURI(tokenUriPrefix);

    // Initialize {AccessControl}
    address marketingWallet =
      _addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);
    _setupRole(DEFAULT_ADMIN_ROLE, marketingWallet);

    _feeRecipient = _addressRegistry.getRegistryEntry(
      AddressBook.REWARD_HANDLER
    );
    _fee = 1000; // 10%

    _setContractMetadataURI(contractUri);

    // Rarible: Need a real wallet for setting up storefront
    address deployer = _addressRegistry.getRegistryEntry(AddressBook.DEPLOYER);
    // This event initializes Rarible storefront
    emit CreateERC1155_v1(deployer, name, symbol);
    // OpenSea enable storefront editing
    emit OwnershipTransferred(address(0), deployer);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Get the minter of a given token
   *
   * @param tokenId the token ID to check
   *
   * @return minter Address of the minter of the token, or address(0) if the
   * token is not minted
   */
  function getMinter(uint256 tokenId) public view returns (address minter) {
    return _tokenIdToMinter[tokenId];
  }

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
  // Minting interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Creates `amount` new tokens for `to`, of token type `tokenId`.
   *
   * See {ERC1155-_mint}.
   *
   * Requirements:
   *
   * - The caller must have the `MINTER_ROLE`.
   */
  function mint(
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) public virtual override {
    // Only tokenIds >= 64 Bit allowed
    require((tokenId >> 64) != 0, 'TokenId reserved');

    // Translate parameter
    address minter = _getAddress(data);
    require(minter != address(0), 'Invalid minter from user data');

    // Update state
    _onMint(minter, tokenId);

    // Call ancestor
    super.mint(to, tokenId, amount, data);
  }

  /**
   * @dev Batched variant of {mint}.
   */
  function mintBatch(
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) public virtual override {
    // Translate parameter
    address minter = _getAddress(data);
    require(minter != address(0), 'Invalid minter in data');

    // Update state
    for (uint256 i = 0; i < tokenIds.length; i++) {
      // Only tokenIds >= 64 Bit allowed
      require((tokenIds[i] >> 64) != 0, 'TokenId reserved');
      _onMint(minter, tokenIds[i]);
    }

    // Call ancestor
    super.mintBatch(to, tokenIds, amounts, data);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Burning interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155MintBurn-_burn}.
   */
  function burn(
    address account,
    uint256 tokenId,
    uint256 amount
  ) public override {
    // Validate parameters
    require(account != address(0), 'Invalid zero address');

    // Call ancestor
    super.burn(account, tokenId, amount);

    uint256[] memory tokenIds = new uint256[](1);
    uint256[] memory amounts = new uint256[](1);
    tokenIds[0] = tokenId;
    amounts[0] = amount;

    _onTransfer(account, address(0), tokenIds, amounts, '');
  }

  /**
   * @dev See {ERC1155MintBurn-_batchBurn}.
   */
  function burnBatch(
    address account,
    uint256[] memory tokenIds,
    uint256[] memory amounts
  ) public virtual override {
    // Validate parameters
    require(account != address(0), 'Invalid zero address');
    require(tokenIds.length == amounts.length, "Lengths don't match");

    // Call parent
    super.burnBatch(account, tokenIds, amounts);
    // Perform internal handling
    _onTransfer(account, address(0), tokenIds, amounts, '');
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155}
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
  ) public override {
    // Validate parameters
    require(from != address(0), "Can't transfer from zero address");
    require(to != address(0), "Can't transfer to zero address");

    // Call parent
    super.safeTransferFrom(from, to, tokenId, amount, data);

    uint256[] memory tokenIds = new uint256[](1);
    uint256[] memory amounts = new uint256[](1);
    tokenIds[0] = tokenId;
    amounts[0] = amount;

    _onTransfer(from, to, tokenIds, amounts, data);
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
  ) public override {
    // Validate parameters
    require(from != address(0), "Can't transfer from zero address");
    require(to != address(0), "Can't transfer to zero address");
    require(tokenIds.length == amounts.length, "Lengths don't match");

    // Call parent
    super.safeBatchTransferFrom(from, to, tokenIds, amounts, data);

    _onTransfer(from, to, tokenIds, amounts, data);
  }

  /**
   * Override setApprovalForAll to be able to restrict to known operators.
   */
  function setApprovalForAll(address operator, bool approved)
    public
    virtual
    override
  {
    require(
      !_tradingRestricted || hasRole(OPERATOR_ROLE, operator),
      'forbidden'
    );
    super.setApprovalForAll(operator, approved);
  }

  /**
   * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-free listings.
   */
  function isApprovedForAll(address account, address operator)
    public
    view
    override
    returns (bool)
  {
    if (!_tradingRestricted && address(_openSeaProxyRegistry) != address(0)) {
      // Whitelist OpenSea proxy contract for easy trading.
      OpenSeaProxyRegistry proxyRegistry =
        OpenSeaProxyRegistry(_openSeaProxyRegistry);
      if (proxyRegistry.proxies(account) == operator) {
        return true;
      }
    }
    return super.isApprovedForAll(account, operator);
  }

  /**
   * @notice overrideable hook for single transfers.
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) internal override {
    // Note: from must not be checked because in locked state owner is this contract.
    require(_notLocked(to), 'destination locked');
    super._beforeTokenTransfer(operator, from, to, tokenId, amount, data);
  }

  /**
   * @notice overrideable hook for batch transfers.
   */
  function _beforeBatchTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) internal override {
    // Note: from must not be checked because in locked state owner is this contract.
    require(_notLocked(to), 'destination locked');
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
  // Implementation of {IERC1155MetadataURI}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC1155MetadataURI-uri}.
   *
   * Revert for unminted SFT NFTs
   */
  function uri(uint256 tokenId) public view override returns (string memory) {
    // Validate state
    require(
      (tokenId >> 64) > 0 || _tokenInfos[uint64(tokenId)].minted,
      'Token not minted'
    );

    return _uri(tokenId, 0);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Rarible Fees and events
  //////////////////////////////////////////////////////////////////////////////

  function setFee(uint256 fee) external {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Update state
    _fee = fee;
  }

  function setFeeRecipient(address feeRecipient) external {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Update state
    _feeRecipient = feeRecipient;
  }

  function getFeeRecipients(uint256)
    public
    view
    returns (address payable[] memory)
  {
    // Return value
    address payable[] memory recipients = new address payable[](1);

    // Load state
    recipients[0] = payable(_feeRecipient);
    return recipients;
  }

  function getFeeBps(uint256) public view returns (uint256[] memory) {
    // Return value
    uint256[] memory bps = new uint256[](1);

    // Load state
    bps[0] = _fee;

    return bps;
  }

  //////////////////////////////////////////////////////////////////////////////
  // OpenSea compatibility
  //////////////////////////////////////////////////////////////////////////////

  function isOwner() external view returns (bool) {
    return _msgSender() == owner();
  }

  function owner() public view returns (address) {
    return _addressRegistry.getRegistryEntry(AddressBook.DEPLOYER);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Hooks
  //////////////////////////////////////////////////////////////////////////////

  function onERC1155Received(
    address operator,
    address from,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) public override returns (bytes4) {
    // Update state
    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = amount;
    _onTokensReceived(from, tokenIds, amounts);

    return super.onERC1155Received(operator, from, tokenId, amount, data);
  }

  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) public override returns (bytes4) {
    _onTokensReceived(from, tokenIds, amounts);

    // This contract supports safe ERC-1155 transfers
    return
      super.onERC1155BatchReceived(operator, from, tokenIds, amounts, data);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Administrative functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155Metadata-setBaseMetadataURI}.
   */
  function setBaseMetadataURI(string memory baseMetadataURI) external {
    // Access control
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Access denied');
    // Set state
    _setBaseMetadataURI(baseMetadataURI);
  }

  /**
   * @dev Set contract metadata URI
   */
  function setContractMetadataURI(string memory newContractUri) public {
    // Access control
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    _setContractMetadataURI(newContractUri);
  }

  /**
   * @dev Register interfaces
   */
  function supportsInterface(bytes4 _interfaceID)
    public
    pure
    virtual
    override(WOWSMinterPauser, ERC1155Holder)
    returns (bool)
  {
    // Register rarible fee interface
    if (_interfaceID == _INTERFACE_ID_FEES) {
      return true;
    }
    return super.supportsInterface(_interfaceID);
  }

  /**
   * @dev Withdraw tokenAddress ERC20token to destination
   * tokenAddress cannot be rewardToken.
   * TODO: provide the possibility to swap into WOWS
   *
   * @param tokenAddress the address of the token to transfer
   */
  function collectGarbage(address tokenAddress) external {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admins');

    // Transfer token to msg.sender
    uint256 amountToken = IERC20(tokenAddress).balanceOf(address(this));
    if (amountToken > 0)
      IERC20(tokenAddress).transfer(_msgSender(), amountToken);
  }

  /**
   * remove before mainnet deploy
   */
  function testSelfDestroy() external {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admins');
    selfdestruct(_msgSender());
  }

  /**
   * Restrict trading to OPERATOR_ROLE (see setApprovalForAll)
   */
  function restrictTrading(bool restrict) external {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admins');
    _tradingRestricted = restrict;
  }

  /**
   * Set the minter of an c-folio Item. This has to be done
   * if for example a tradefloorclient has to be updated.
   */
  function setMinter(
    uint256 tokenId,
    uint256 num,
    address newMinter
  ) external {
    require(hasRole(MINTER_ROLE, _msgSender()), 'Only minter');
    require(tokenId >= 0x10000000000000000, 'Only tfclients tokenIds');

    for (uint256 i = tokenId; i < tokenId + num; ++i) {
      address currentMinter = _tokenIdToMinter[tokenId];
      if (currentMinter != address(0)) {
        require(currentMinter == _msgSender(), 'setMinter: Forbidden');
        _tokenIdToMinter[tokenId] = newMinter;
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

  function _onTransfer(
    address from,
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) private {
    // Count tokenIds < 64 Bit
    uint256 length = tokenIds.length;
    uint256 numSft = 0;

    uint256 numMinters = 0;
    address[] memory minters = new address[](length);

    // Invoke callbacks / count SFT's
    for (uint256 i = 0; i < length; i++) {
      uint256 tokenId = tokenIds[i];

      // Unstake SFT on burn
      if ((tokenId >> 64) == 0) {
        ++numSft;
        _relinkOwner(from, to, uint64(tokenId));
      } else {
        address minter = _tokenIdToMinter[tokenId];
        require(minter != address(0), 'Token has no minter');
        // Collect all minter we have tokenIds for
        uint256 j = 0;
        while (j < numMinters && minters[j] != minter) ++j;
        if (j == numMinters) {
          minters[numMinters++] = minter;
        }
      }
    }

    // Notify minters so they cab update internaly state
    for (uint256 i = 0; i < numMinters; ++i) {
      IMinterCallback(minters[i]).onTransferFrom(
        _msgSender(),
        from,
        to,
        tokenIds,
        amounts,
        data
      );
    }

    // Unstake SFTs if required
    if (to == address(0) && numSft > 0) {
      uint256[] memory unstakeIds = new uint256[](numSft);
      uint256[] memory unstakeAmounts = new uint256[](numSft);

      for (uint256 i = 0; i < tokenIds.length; ++i) {
        uint256 tokenId = tokenIds[i];
        if ((tokenId >> 64) == 0) {
          unstakeIds[--numSft] = tokenId;
          unstakeAmounts[numSft] = 1;
        }
      }
      // Load address
      IERC1155 sftContract =
        IERC1155(_addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER));

      sftContract.safeBatchTransferFrom(
        address(this),
        _msgSender(),
        unstakeIds,
        unstakeAmounts,
        ''
      );
    } else if (numSft > 0) {
      // Prevent transfer from SFT into cfolio
      require(
        _sftHolder.addressToTokenId(to) == uint256(-1),
        'TF: SFT -> CFolio not allowed'
      );
    }
  }

  /**
   * @dev Update the state of this contract when `minter` mints `tokenId`
   *
   * Reverts if the token has already been minted by a different minting
   * contract.
   *
   * @param minter The contract doing the minting
   * @param tokenId The token ID being minted
   */
  function _onMint(address minter, uint256 tokenId) private {
    bool tokenMinted = (_tokenIdToMinter[tokenId] != address(0));

    if (tokenMinted) {
      // Token has been minted before, require match
      require(
        _tokenIdToMinter[tokenId] == minter,
        'Token minted by different minter'
      );
    } else {
      // Token hasn't been minted before, record minter
      _tokenIdToMinter[tokenId] = minter;
    }
  }

  /**
   * @dev SFT Token arrived, provide a NFT
   */
  function _onTokensReceived(
    address from,
    uint256[] memory tokenIds,
    uint256[] memory amounts
  ) private {
    // We only support tokens from our SFT Holder contract
    require(
      _msgSender() == _addressRegistry.getRegistryEntry(AddressBook.SFT_HOLDER),
      'Invald sender'
    );

    // Validate parameters
    require(tokenIds.length == amounts.length, 'Lengths mismatch');

    // Update state
    for (uint256 i = 0; i < tokenIds.length; ++i) {
      uint256 tokenId = tokenIds[i];
      require((tokenId >> 64) == 0, 'Invalid TokenId');
      require(amounts[i] == 1, 'Amount != 1 not alowed');
      require(
        _tokenInfos[uint64(tokenId)].minted == false,
        'Token already minted'
      );
      _relinkOwner(address(0), from, uint64(tokenId));
      // OpenSea only listens to TransferSingle event on mint
      _mint(from, tokenId, 1, '');
      // Even the tokenId has not changed we fire URI to
      // let clients know that Metadata has to be refreshed
      emit URI(uri(tokenId), tokenId);
      // Rarible needs to be informed abiut fees
      emit SecondarySaleFees(tokenId, getFeeRecipients(0), getFeeBps(0));
    }
  }

  /**
   * @dev Ownership change -> update linked list owner -> tokenId
   *
   * linkKeys are 1 based where tokenIds are 0-based.
   */
  function _relinkOwner(
    address from,
    address to,
    uint64 tokenId
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
      uint64 count = fromList.count;

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
      _tokenInfos[uint64(tokenId)].minted = true;
    } else {
      _tokenInfos[uint64(tokenId)].minted = false;
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
   * @dev Check if the address is a c-folio from a locked SFT
   *
   * @param test the address to test
   *
   * If sftHolder returns a valid tokenId, it must be < 64bit.
   * Even Cryptofolio supports multiple Tradefloors, the main
   * SFT lock handling happens only in this contract instance.
   */
  function _notLocked(address test) private view returns (bool) {
    uint256 tokenId;
    return
      test == address(0) ||
      (tokenId = _sftHolder.addressToTokenId(test)) == uint256(-1) ||
      _tokenInfos[uint64(tokenId)].minted == false;
  }
}
