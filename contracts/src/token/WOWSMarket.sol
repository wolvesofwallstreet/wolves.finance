/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/access/AccessControl.sol';
import '../../0xerc1155/proxy/Initializable.sol';
import '../../0xerc1155/utils/Context.sol';

import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';

import './ERC1155Pausable.sol';

abstract contract OpenSeaProxyRegistry {
  mapping(address => address) public proxies;
}

/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Multi Token Standard.
 */
contract WOWSMarket is Initializable, Context, AccessControl, ERC1155Pausable {
  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Restrict approvals to OPERATOR_ROLE members
  bool private _tradingRestricted;

  //////////////////////////////////////////////////////////////////////////////
  // Roles
  //////////////////////////////////////////////////////////////////////////////

  // Only OPERATORS can approve when trading is restricted.
  //
  // Operator role is required to set approval for tokens. This prevents
  // auctions like OpenSea from selling the tokens. For example, selling of
  // cryptofolios by third parties is only allowed when the cryptofolio
  // locked in one of our TradeFloor contracts.
  bytes32 public constant OPERATOR_ROLE = 'OPERATOR_ROLE';

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Emitted when the state of restriction has updated
   *
   * @param tradingRestricted True if trading has been restricted, false
   * otherwise
   */
  event RestrictionUpdated(bool tradingRestricted);

  //////////////////////////////////////////////////////////////////////////////
  // OpenSea compatibility
  //////////////////////////////////////////////////////////////////////////////

  // bytes4(keccak256('contractURI()')) == 0xe8a3d485
  bytes4 private constant _INTERFACE_ID_CONTRACT_URI = 0xe8a3d485;

  // Contract metadata URI for getting information on how to display the
  // storefront in OpenSea
  string private _contractMetadataURI;

  // OpenSea per-account proxy registry. Used to whitelist Approvals and save
  // GAS.
  OpenSeaProxyRegistry private _openSeaProxyRegistry;

  // Deployer to give to OpenSea
  address private _deployer;

  // OpenSea events
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

  //////////////////////////////////////////////////////////////////////////////
  // Rarible compatibility
  //////////////////////////////////////////////////////////////////////////////

  /*
   * bytes4(keccak256('getFeeBps(uint256)')) == 0x0ebd4c7f
   * bytes4(keccak256('getFeeRecipients(uint256)')) == 0xb9c4d9fb
   *
   * => 0x0ebd4c7f ^ 0xb9c4d9fb == 0xb7799584
   */
  bytes4 private constant _INTERFACE_ID_FEES = 0xb7799584;

  address private _feeRecipient;
  uint256 private _fee;

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
   * @dev One time contract initializer
   *
   * @param addressRegistry Registry containing our system addresses
   * @param openSeaProxyRegistry The OpenSea proxy registry
   * @param name The token name shown in online marketplaces
   * @param symbol The token symbol shown in online marketplaces
   * @param contractMetadataURI The URI for contract metadata of the storefront
   */
  function initialize(
    IAddressRegistry addressRegistry,
    OpenSeaProxyRegistry openSeaProxyRegistry,
    string memory name,
    string memory symbol,
    string memory contractMetadataURI
  ) internal initializer {
    // Initialize {AccessControl}
    address admin = addressRegistry.getRegistryEntry(AddressBook.ADMIN_ACCOUNT);
    require(admin != address(0), 'No admin address');
    _setupRole(DEFAULT_ADMIN_ROLE, admin);

    // Initialize state
    _tradingRestricted = true;
    emit RestrictionUpdated(true);

    //
    // OpenSea initialization
    //

    // Initialize state
    _contractMetadataURI = contractMetadataURI;
    _openSeaProxyRegistry = openSeaProxyRegistry;
    _deployer = addressRegistry.getRegistryEntry(AddressBook.DEPLOYER);

    // OpenSea enable storefront editing
    emit OwnershipTransferred(address(0), _deployer);

    //
    // Rarible initialization
    //

    // Initialize state
    _feeRecipient = addressRegistry.getRegistryEntry(
      AddressBook.REWARD_HANDLER
    );
    _fee = 1000; // 10%

    // This event initializes Rarible storefront
    emit CreateERC1155_v1(_deployer, name, symbol);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155} via {ERC1155Pausable}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IERC1155-setApprovalForAll}.
   *
   * Override setApprovalForAll to be able to restrict to known operators.
   */
  function setApprovalForAll(address operator, bool approved)
    public
    virtual
    override
  {
    // Prevent auctions like OpenSea from selling this token. For example,
    // selling by third parties is only allowed for cryptofolios which are
    // locked in one of our TradeFloor contracts.
    require(
      !_tradingRestricted || hasRole(OPERATOR_ROLE, operator),
      'Forbidden'
    );

    // Call ancestor
    super.setApprovalForAll(operator, approved);
  }

  /**
   * @dev See {IERC1155-isApprovedForAll}.
   *
   * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-free listings.
   */
  function isApprovedForAll(address account, address operator)
    public
    view
    override
    returns (bool)
  {
    // Validate state
    require(address(_openSeaProxyRegistry) != address(0), 'No OS registry');

    if (!_tradingRestricted) {
      // Whitelist OpenSea proxy contract for easy trading
      OpenSeaProxyRegistry proxyRegistry = OpenSeaProxyRegistry(
        _openSeaProxyRegistry
      );
      if (proxyRegistry.proxies(account) == operator) {
        return true;
      }
    }

    // Call ancestor
    return super.isApprovedForAll(account, operator);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC165} via {ERC1155Pausable}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC165-supportsInterface}
   */
  function supportsInterface(bytes4 _interfaceID)
    public
    pure
    virtual
    override
    returns (bool)
  {
    // Register OpenSea contract URI interface
    if (_interfaceID == _INTERFACE_ID_CONTRACT_URI) {
      return true;
    }

    // Register rarible fee interface
    if (_interfaceID == _INTERFACE_ID_FEES) {
      return true;
    }

    // Call ancestor
    return super.supportsInterface(_interfaceID);
  }

  //////////////////////////////////////////////////////////////////////////////
  // OpenSea compatibility
  //////////////////////////////////////////////////////////////////////////////

  function isOwner() external view returns (bool) {
    return _msgSender() == owner();
  }

  function owner() public view returns (address) {
    return _deployer;
  }

  /**
   * @notice Opensea calls this fuction to get information about how to display
   * the storefront
   *
   * @return The full URI of the contract metadata
   */
  function contractURI() public view returns (string memory) {
    return _contractMetadataURI;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Rarible compatibility
  //////////////////////////////////////////////////////////////////////////////

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
  // Administrative functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Restrict trading to OPERATOR_ROLE (see setApprovalForAll)
   */
  function restrictTrading(bool restrict) external {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Validate state
    require(restrict != _tradingRestricted, 'No state update');

    // Update state
    _tradingRestricted = restrict;

    // Dispatch event
    emit RestrictionUpdated(restrict);
  }

  /**
   * @dev Set the Rarible fee
   *
   * @param fee The new fee
   */
  function setFee(uint256 fee) external {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Update state
    _fee = fee;
  }

  /**
   * @dev Set the Rarible fee recipient
   *
   * @param feeRecipient The new fee recipient
   */
  function setFeeRecipient(address feeRecipient) external {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Update state
    _feeRecipient = feeRecipient;
  }

  /**
   * @dev Set contract metadata URI
   *
   * @param newContractMetadataURI New contract metadata URI
   */
  function setContractMetadataURI(string memory newContractMetadataURI)
    external
  {
    // Validate access
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Update state
    _contractMetadataURI = newContractMetadataURI;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal minting interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @notice Mint `amount` of tokens of a given ID and emit an OpenSea event
   *
   * @param to The address to mint tokens to
   * @param tokenId Token ID to mint
   * @param amount The amount to be minted
   * @param data Data to pass if receiver is contract
   */
  function _mintAndEmit(
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) internal {
    // Call ancestor
    _mint(to, tokenId, amount, data);

    // Rarible needs to be informed about fees
    emit SecondarySaleFees(tokenId, getFeeRecipients(0), getFeeBps(0));
  }

  /**
   * @notice Mint tokens for each ID in tokenIds
   *
   * @param to The address to mint tokens to
   * @param tokenIds Array of IDs to mint
   * @param amounts Array of amount of tokens to mint per ID
   * @param data Data to pass if receiver is contract
   */
  function _batchMintAndEmit(
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) internal {
    // Validate parameters
    require(tokenIds.length == amounts.length, 'Invalid array lengths');

    // OpenSea only listens to TransferSingle event on mint
    for (uint256 i = 0; i < tokenIds.length; i++) {
      _mint(to, tokenIds[i], amounts[i], data);
    }
  }
}
