/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/presets/ERC1155PresetMinterPauser.sol';
import '@openzeppelin/contracts/utils/Context.sol';

import './interfaces/IMinterCallback.sol';

/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-1155[ERC1155]
 * Multi Token Standard, including the Metadata URI extension.
 *
 * This contract is an extension of the minter preset. It accepts the address
 * of the contract minting the token via the ERC-1155 data parameter. When
 * the token is transferred or burned, the minter is notified.
 */
contract TradeFloor is Context, AccessControl, ERC1155PresetMinterPauser {
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

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Construct the contract
   *
   * @param owner The address given admin control over this contract
   * @param uri The ERC-1155 metadata URI
   */
  constructor(address owner, string memory uri) ERC1155PresetMinterPauser(uri) {
    // Initialize {AccessControl}
    _setupRole(DEFAULT_ADMIN_ROLE, owner);
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

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC1155PresetMinterPauser}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155PresetMinterPauser-mint}.
   */
  function mint(
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) public virtual override {
    // Validate parameters
    require(to != address(0), "Can't mint to zero address");

    // Translate parameter
    address minter = _getAddress(data);
    require(minter != address(0), 'Invalid minter from user data');

    // Update state
    _onMint(minter, tokenId);

    // Call parent
    super.mint(to, tokenId, amount, data);
  }

  /**
   * @dev See {ERC1155PresetMinterPauser-mintBatch}.
   */
  function mintBatch(
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts,
    bytes memory data
  ) public virtual override {
    // Validate parameters
    require(to != address(0), "Can't mint to zero address");
    require(tokenIds.length == amounts.length, "Lengths don't match");

    // Translate parameter
    address minter = _getAddress(data);
    require(minter != address(0), 'Invalid minter in data');

    // Update state
    for (uint256 i = 0; i < tokenIds.length; i++) {
      _onMint(minter, tokenIds[i]);
    }

    // Call parent
    super.mintBatch(to, tokenIds, amounts, data);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {IERC1155} via {ERC1155PresetMinterPauser}
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

    // Look up minter
    address minter = _tokenIdToMinter[tokenId];
    require(minter != address(0), 'Invalid minter for token');

    // Call parent
    super.safeTransferFrom(from, to, tokenId, amount, data);

    // Invoke callback
    IMinterCallback(minter).onTransferFrom(from, to, tokenId, amount);
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

    // Invoke callbacks
    for (uint256 i = 0; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      uint256 amount = amounts[i];
      address minter = _tokenIdToMinter[tokenId];
      require(minter != address(0), 'Invalid minter for token');

      IMinterCallback(minter).onTransferFrom(from, to, tokenId, amount);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC1155Burnable} via {ERC1155PresetMinterPauser}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155Burnable-burn}.
   */
  function burn(
    address account,
    uint256 tokenId,
    uint256 value
  ) public virtual override {
    // Validate parameters
    require(account != address(0), 'Invalid zero address');

    // Translate parameter
    address minter = _tokenIdToMinter[tokenId];
    require(minter != address(0), 'Token has no minter');

    // Call parent
    super.burn(account, tokenId, value);

    // Invoke callback
    IMinterCallback(minter).onBurn(account, tokenId, value);
  }

  /**
   * @dev See {ERC1155Burnable-burnBatch}.
   */
  function burnBatch(
    address account,
    uint256[] memory tokenIds,
    uint256[] memory values
  ) public virtual override {
    // Validate parameters
    require(account != address(0), 'Invalid zero address');
    require(tokenIds.length == values.length, "Lengths don't match");

    // Call parent
    super.burnBatch(account, tokenIds, values);

    // Invoke callbacks
    for (uint256 i = 0; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      uint256 value = values[i];
      address minter = _tokenIdToMinter[tokenId];
      require(minter != address(0), 'Token has no minter');

      IMinterCallback(minter).onBurn(account, tokenId, value);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Administrative functions
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC1155-_setURI}.
   */
  function setURI(string memory newuri) public {
    // Access control
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Only admin');

    // Call parent
    super._setURI(newuri);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal details
  //////////////////////////////////////////////////////////////////////////////

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
