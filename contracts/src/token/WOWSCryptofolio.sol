/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';

import './interfaces/IERC1155BurnMintable.sol';
import './interfaces/IWOWSCryptofolio.sol';
import './interfaces/IWOWSERC1155.sol';

contract WOWSCryptofolio is ERC1155Holder, IWOWSCryptofolio {
  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Our NFT token parent
  IWOWSERC1155 private _deployer;

  // The owner of the NFT token parent
  address private _owner;

  // Mapping of cryptofolio items owned by this cryptofolio
  mapping(address => uint256[]) private _cryptofolios;

  // List of all known tradefloors
  address[] public _tradefloors;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Triggered if sft receives new tokens from operator
   *
   * @param sft The contract address of the tokens
   * @param operator The user that sent the tokens to the cryptofolio
   * @param tokenIds The IDs being transferred
   * @param amounts The mounts being transferred
   */
  event CryptoFolioAdded(
    address indexed sft,
    address indexed operator,
    uint256[] tokenIds,
    uint256[] amounts
  );

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IWOWSCryptofolio-initialize}.
   */
  function initialize() external override {
    // Validate state
    require(address(_deployer) == address(0), 'CF: Already initialized');

    // Update state
    _deployer = IWOWSERC1155(msg.sender);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IWOWSCryptofolio}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IWOWSCryptofolio-getCryptofolio}.
   */
  function getCryptofolio(address tradefloor)
    external
    view
    override
    returns (uint256[] memory tokenIds, uint256 idsLength)
  {
    // Load state
    uint256[] storage itemIds = _cryptofolios[tradefloor];

    // Allocate return values
    uint256[] memory result = new uint256[](itemIds.length);
    uint256 newLength = 0;

    if (itemIds.length > 0) {
      // All tokens belong to this contract
      address[] memory accounts = new address[](itemIds.length);
      for (uint256 i = 0; i < itemIds.length; ++i) {
        accounts[i] = address(this);
      }

      // Load state
      uint256[] memory balances =
        IERC1155(tradefloor).balanceOfBatch(accounts, itemIds);

      // Calculate return value
      for (uint256 i = 0; i < itemIds.length; ++i) {
        if (balances[i] > 0) {
          result[newLength++] = itemIds[i];
        }
      }
    }

    return (result, newLength);
  }

  /**
   * @dev See {IWOWSCryptofolio-setOwner}.
   */
  function setOwner(address newOwner) external override {
    // Access control
    require(msg.sender == address(_deployer), 'CF: Only deployer');

    // Update state
    for (uint256 i = 0; i < _tradefloors.length; ++i) {
      if (_owner != address(0))
        IERC1155(_tradefloors[i]).setApprovalForAll(_owner, false);
      if (newOwner != address(0))
        IERC1155(_tradefloors[i]).setApprovalForAll(newOwner, true);
    }
    _owner = newOwner;
  }

  /**
   * @dev See {IWOWSCryptofolio-setApprovalForAll}.
   */
  function setApprovalForAll(address operator, bool allow) external override {
    // Access control
    require(msg.sender == _owner, 'CF: Only owner');

    // Update state
    for (uint256 i = 0; i < _tradefloors.length; ++i) {
      IERC1155(_tradefloors[i]).setApprovalForAll(operator, allow);
    }
  }

  /**
   * @dev See {IWOWSCryptofolio-burn}.
   */
  function burn() external override {
    // Access control
    require(msg.sender == address(_deployer), 'CF: Only deployer');

    for (uint256 i = 0; i < _tradefloors.length; ++i) {
      // Load state
      IERC1155BurnMintable tradefloor = IERC1155BurnMintable(_tradefloors[i]);
      uint256[] storage itemIds = _cryptofolios[address(tradefloor)];

      if (itemIds.length > 0) {
        // All tokens belong to this contract
        address[] memory accounts = new address[](itemIds.length);
        for (uint256 j = 0; j < itemIds.length; ++j) {
          accounts[j] = address(this);
        }

        // Load state
        uint256[] memory balances =
          tradefloor.balanceOfBatch(accounts, itemIds);

        // Update state
        tradefloor.burnBatch(address(this), itemIds, balances);
      }

      // Update state
      delete _cryptofolios[address(tradefloor)];
    }

    // Update state
    delete _tradefloors;
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
    // Parameters
    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = amount;

    // Update state
    _onTokensReceived(tokenIds, amounts);

    // This contract supports safe ERC-1155 transfers
    return super.onERC1155Received(operator, from, tokenId, amount, data);
  }

  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) public override returns (bytes4) {
    // Update state
    _onTokensReceived(tokenIds, amounts);

    // This contract supports safe ERC-1155 transfers
    return
      super.onERC1155BatchReceived(operator, from, tokenIds, amounts, data);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal functionality
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Update our collection of tradeable cryptofolio items
   *
   * This function is only allowed to be called from one of our pseudo
   * TokenReceiver contracts.
   */
  function _onTokensReceived(
    uint256[] memory tokenIds,
    uint256[] memory amounts
  ) internal {
    address tradefloor = msg.sender;

    // Access control
    require(_deployer.isTradeFloor(tradefloor), 'CF: Only tradefloor');

    // Validate parameters
    require(tokenIds.length == amounts.length, 'CF: Input lengths differ');

    // Load state
    uint256[] storage currentIds = _cryptofolios[tradefloor];

    // Update state
    if (currentIds.length == 0) {
      IERC1155(tradefloor).setApprovalForAll(_owner, true);
      _tradefloors.push(tradefloor);
    }

    // Update state
    for (uint256 iIds = 0; iIds < tokenIds.length; ++iIds) {
      if (amounts[iIds] > 0) {
        uint256 tokenId = tokenIds[iIds];

        // Search tokenId
        uint256 i = 0;
        for (; i < currentIds.length && currentIds[i] != tokenId; ++i) i;

        // If token was not found, insert it
        if (i == currentIds.length) {
          currentIds.push(tokenId);
        }
      }
    }

    // Log state change
    emit CryptoFolioAdded(address(this), tradefloor, tokenIds, amounts);
  }
}
