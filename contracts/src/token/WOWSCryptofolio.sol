/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import './interfaces/IERC1155BurnMintable.sol';
import './interfaces/IWOWSCryptofolio.sol';
import './interfaces/IWOWSERC1155.sol';

contract WOWSCryptofolio is IWOWSCryptofolio {
  // Our NFT token parent
  IWOWSERC1155 private _deployer;
  // The owner of the NFT token parent
  address private _owner;
  // mapping of cryptofolio items owned by this
  mapping(address => uint256[]) private _cryptofolios;
  // list of all known tradefloors
  address[] private _tradefloors;

  /*=========== EVENTS ==========*/

  /**
   * @dev Triggered if sft receives new tokens from operator
   */
  event CryptoFolioAdded(
    address indexed sft,
    address indexed operator,
    uint256[] ids,
    uint256[] amounts
  );

  /*=========== INITIALIZER ==========*/

  function initialize() external {
    require(address(_deployer) == address(0), 'CF: Already initialized');
    _deployer = IWOWSERC1155(msg.sender);
  }

  /*============ STATE MODIFIER ===============*/

  /**
   * @dev setOwner is called if ownership of the parent NFT has changed
   * the newOwner is allowed to transfer / burn cryptofolio items.
   * Make sure, that allowance is removed from previous owner
   */
  function setOwner(address newOwner) external override {
    require(msg.sender == address(_deployer), 'CF: Only deployer');
    for (uint256 i = 0; i < _tradefloors.length; ++i) {
      if (_owner != address(0))
        IERC1155(_tradefloors[i]).setApprovalForAll(_owner, false);
      if (newOwner != address(0))
        IERC1155(_tradefloors[i]).setApprovalForAll(newOwner, true);
    }
    _owner = newOwner;
  }

  /**
   * @dev allow owner (of parent NFT) to approve external operators
   * to transfer our cryptofolio items
   */
  function setApprovalForAll(address operator, bool allow) external override {
    require(msg.sender == _owner, 'CF: Only owner');
    for (uint256 i = 0; i < _tradefloors.length; ++i) {
      IERC1155(_tradefloors[i]).setApprovalForAll(operator, allow);
    }
  }

  /**
   * @dev in case underlying NFT is burned, we also burn cryptofolio
   */
  function burn() external override {
    require(msg.sender == address(_deployer), 'CF: Only deployer');
    for (uint256 i = 0; i < _tradefloors.length; ++i) {
      IERC1155BurnMintable tradefloor = IERC1155BurnMintable(_tradefloors[i]);
      uint256[] storage opIds = _cryptofolios[address(tradefloor)];
      if (opIds.length > 0) {
        address[] memory accounts = new address[](opIds.length);
        for (uint256 j = 0; j < opIds.length; ++j) accounts[j] = address(this);
        uint256[] memory balances = tradefloor.balanceOfBatch(accounts, opIds);
        tradefloor.burnBatch(address(this), opIds, balances);
      }
    }
  }

  /*============ GETTER ===============*/

  /**
   * @dev return array of cryptofolio tokenIds
   * the tokenIds belong to the contract tradefloor
   * @param tradefloor the tradefloor items belong to
   * @return ids tokenids in scope of operator
   * @return idsLength number of valid tokenids
   */
  function getCryptofolio(address tradefloor)
    external
    view
    override
    returns (uint256[] memory ids, uint256 idsLength)
  {
    uint256[] storage opIds = _cryptofolios[tradefloor];
    uint256[] memory result = new uint256[](opIds.length);
    uint256 newLength = 0;

    if (opIds.length > 0) {
      address[] memory accounts = new address[](opIds.length);
      for (uint256 i = 0; i < opIds.length; ++i) accounts[i] = address(this);
      uint256[] memory balances =
        IERC1155(tradefloor).balanceOfBatch(accounts, opIds);

      for (uint256 i = 0; i < opIds.length; ++i)
        if (balances[i] > 0) result[newLength++] = opIds[i];
    }
    return (result, newLength);
  }

  /*============ HOOKS ===============*/

  function onERC1155Received(
    address,
    address,
    uint256 id,
    uint256 amount,
    bytes memory
  ) external returns (bytes4) {
    uint256[] memory ids = new uint256[](1);
    ids[0] = id;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = amount;
    _onTokensReceived(ids, amounts);
    return this.onERC1155Received.selector;
  }

  function onERC1155BatchReceived(
    address,
    address,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory
  ) external returns (bytes4) {
    _onTokensReceived(ids, amounts);
    return this.onERC1155BatchReceived.selector;
  }

  /*=============== INTERNAL ============*/

  /**
   * @dev update our collection of tradeable cryptofolio items
   * This function is only allowed to be called from one if our pseudo TokenReceiver contracts
   */
  function _onTokensReceived(uint256[] memory ids, uint256[] memory amounts)
    internal
  {
    address tradefloor = msg.sender;
    require(_deployer.isTradeFloor(tradefloor), 'CF: Only tradefloor');
    require(ids.length == amounts.length, 'CF: Input lengths differ');

    uint256[] storage currentIds = _cryptofolios[tradefloor];
    if (currentIds.length == 0) {
      IERC1155(tradefloor).setApprovalForAll(_owner, true);
      _tradefloors.push(tradefloor);
    }

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
    emit CryptoFolioAdded(address(this), tradefloor, ids, amounts);
  }
}
