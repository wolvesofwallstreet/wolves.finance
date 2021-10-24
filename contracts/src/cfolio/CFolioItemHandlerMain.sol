/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../token/interfaces/IWOWSERC1155.sol';
import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';

import './interfaces/ICFolioItemHandler.sol';

/**
 * @dev CFolioItemHandlerMain handles all CFolioItems and collects investments.
 *
 * Minting CFolioItem SFTs is implemented in the WOWSSFTMinter contract.
 */
abstract contract CFolioItemHandlerMain is ICFolioItemHandler {
  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  // Admin
  address private immutable _admin;

  // The SFT contract needed for address conversion
  IWOWSERC1155 private immutable _sftContract;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // amounts from sidechains for hash generation
  // tokenid => (slotId => amount))
  mapping(uint256 => mapping(uint256 => uint256)) public externalAmonts;

  // sidechain address => [slotId per subId]
  struct Sidechain {
    bool registered;
    uint256[] slotIds;
  }
  mapping(address => Sidechain) public sidechains;

  // number of slotIds generated
  uint256 public numSlotIds;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Emitted when the contract is constructed
   *
   * @param admin The address of the admin
   * @param sftContract The address of the sftContract
   */
  event Constructed(address admin, address sftContract);

  /**
   * @dev Emitted when a sidechain is registered
   *
   * @param sidechain The address of the admin
   */
  event SidechainRegistered(address sidechain);

  /**
   * @dev Emitted when the contract is destructed
   *
   * @param thisContract The address of this contract
   */
  event CFolioItemHandlerDestructed(address thisContract);

  //////////////////////////////////////////////////////////////////////////////
  // Modifiers
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyAdmin() {
    require(msg.sender == _admin, 'CFIH: Only admin');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Constructs the CFolioItemHandlerDummy
   */
  constructor(IAddressRegistry addressRegistry) {
    // Admin
    address admin = addressRegistry.getRegistryEntry(AddressBook.ADMIN_ACCOUNT);
    _admin = admin;

    address sftContract = addressRegistry.getRegistryEntry(
      AddressBook.SFT_HOLDER_PROXY
    );
    _sftContract = IWOWSERC1155(sftContract);

    emit Constructed(admin, sftContract);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICFolioItemCallback} via {ICFolioItemHandler}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICFolioItemCallback-onCFolioItemsTransferedFrom}
   */
  function onCFolioItemsTransferedFrom(
    address, /* from*/
    address, /* to*/
    uint256[] calldata, /* tokenIds*/
    address[] calldata /* cfolioHandlers*/
  ) external override {}

  /**
   * @dev See {ICFolioItemCallback-appendHash}
   */
  function appendHash(address cfolioItem, bytes calldata current)
    external
    view
    override
    returns (bytes memory)
  {
    uint256 tokenId = _sftContract.addressToTokenId(cfolioItem);
    require(tokenId != uint256(-1), 'CFIH: Invalid cfi');

    uint256[] memory balances = new uint256[](numSlotIds);
    for (uint256 i = 0; i < numSlotIds; ++i)
      balances[i] = externalAmonts[tokenId][i];

    return abi.encodePacked(current, address(this), balances);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ICFolioItemHandler}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ICFolioItemHandler-sftUpgrade}
   */
  function sftUpgrade(
    uint256, /*tokenId*/
    uint32 /*newRate*/
  ) external pure override {}

  /**
   * @dev See {ICFolioItemHandler-deposit}
   */
  function deposit(
    address, /* from*/
    uint256, /* baseTokenId*/
    uint256, /* tokenId*/
    uint256, /* slotId*/
    uint256[] calldata /* amounts*/
  ) external pure override {
    revert('CFIH: Not implemented');
  }

  /**
   * @dev See {ICFolioItemHandler-withdraw}
   */
  function withdraw(
    uint256, /* baseTokenId*/
    uint256, /* tokenId*/
    uint256, /* slotId*/
    uint256[] calldata /* amounts*/
  ) external pure override {
    revert('CFIH: Not implemented');
  }

  /**
   * @dev See {ICFolioItemHandler-update}
   */
  function update(uint256 tokenId, uint256[] calldata amounts)
    external
    override
  {
    Sidechain storage sidechain = sidechains[msg.sender];
    require(sidechain.registered, 'CFIH: Not registered');
    uint256[] storage sIds = sidechain.slotIds;

    while (sIds.length < amounts.length) sIds.push(numSlotIds++);

    require(sIds.length == amounts.length, 'CFIH: Length mismatch');

    for (uint256 i = 0; i < amounts.length; ++i) {
      if (amounts[i] == 0) delete (externalAmonts[tokenId][sIds[i]]);
      else externalAmonts[tokenId][sIds[i]] = amounts[i];
    }
  }

  /**
   * @dev See {ICFolioItemHandler-getRewards}
   */
  function getRewards(
    address, /* owner*/
    address, /* recipient*/
    uint256 /* tokenId*/
  ) external override {}

  /**
   * @dev See {ICFolioItemHandler-getRewardInfo}
   */
  function getRewardInfo(
    uint256[] calldata /* tokenIds*/
  ) external pure override returns (bytes memory result) {
    return '';
  }

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

  /**
   * @dev Register a sidechain
   */
  function registerSidechain(address sideChain) external onlyAdmin {
    sidechains[sideChain].registered = true;

    // Dispatch event
    emit SidechainRegistered(sideChain);
  }
}
