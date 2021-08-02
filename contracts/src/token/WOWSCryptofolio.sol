/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/utils/Context.sol';

import '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';

import './interfaces/IERC1155BurnMintable.sol';
import './interfaces/IWOWSCryptofolio.sol';

contract WOWSCryptofolio is IWOWSCryptofolio, Context, ERC1155Holder {
  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Our NFT token parent
  IERC1155BurnMintable private _sftContract;

  // The owner of the NFT token parent
  address private handlerOrOwner;

  // Mapping of cryptofolio items (trade floor to token ID) owned by this
  // cryptofolio
  uint256[] private _cryptofolios;

  // Signs if this is a cryptofolio (not I-NFT)
  bool private _isCryptofolio;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Triggered if an SFT receives new tokens from operator
   *
   * @param tokenIds The IDs being transferred
   * @param amounts The amounts being transferred
   */
  event CryptoFolioAdded(uint256[] tokenIds, uint256[] amounts);

  //////////////////////////////////////////////////////////////////////////////
  // Modifier
  //////////////////////////////////////////////////////////////////////////////

  modifier onlySftContract(address adr) {
    require(adr == address(_sftContract), 'CF: Only deployer');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IWOWSCryptofolio-initialize}.
   */
  function initialize(bool isCryptofolio) external override {
    // Validate state
    require(address(_sftContract) == address(0), 'CF: Already initialized');

    // Update state
    _sftContract = IERC1155BurnMintable(_msgSender());
    _isCryptofolio = isCryptofolio;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IWOWSCryptofolio}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {IWOWSCryptofolio-getHandler}.
   */
  function getHandler() external view override returns (address) {
    // Access control
    require(!_isCryptofolio, 'CF: Forbidden');

    return handlerOrOwner;
  }

  /**
   * @dev See {IWOWSCryptofolio-setOwner}.
   */
  function setOwner(address newOwner)
    external
    override
    onlySftContract(_msgSender())
  {
    // Access control
    require(_isCryptofolio, 'CF: Forbidden');

    if (handlerOrOwner != address(0))
      _sftContract.setApprovalForAll(handlerOrOwner, false);
    if (newOwner != address(0)) _sftContract.setApprovalForAll(newOwner, true);
    handlerOrOwner = newOwner;
  }

  /**
   * @dev See {IWOWSCryptofolio-setHandler}.
   */
  function setHandler(address newHandler)
    external
    override
    onlySftContract(_msgSender())
  {
    // Access control
    require(!_isCryptofolio, 'CF: Forbidden');

    handlerOrOwner = newHandler;
  }

  /**
   * @dev See {IWOWSCryptofolio-setApprovalForAll}.
   */
  function setSftApproval(address operator, bool allow) external override {
    // Access control
    require(_msgSender() == handlerOrOwner, 'CF: Only owner');

    // Update state
    if (_isCryptofolio) {
      _sftContract.setApprovalForAll(operator, allow);
    } else {
      // TODO get a list of ERC1155 and ERC20 tokens to approve
    }
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
  ) public override onlySftContract(operator) returns (bytes4) {
    // Call ancestor
    return super.onERC1155Received(operator, from, tokenId, amount, data);
  }

  /**
   * @dev See {IERC1155TokenReceiver-onERC1155BatchReceived}
   */
  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] calldata tokenIds,
    uint256[] calldata amounts,
    bytes calldata data
  ) public override onlySftContract(operator) returns (bytes4) {
    // Update state
    // Call ancestor
    return
      super.onERC1155BatchReceived(operator, from, tokenIds, amounts, data);
  }
}
