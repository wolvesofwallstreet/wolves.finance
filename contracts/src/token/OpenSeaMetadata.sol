/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity 0.7.6;

import '../../0xerc1155/tokens/ERC1155/ERC1155Metadata.sol';

/**
 * @notice Contract that handles metadata related methods specific to OpenSea
 */
contract OpenSeaMetadata is ERC1155Metadata {
  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  // bytes4(keccak256('contractURI()')) == 0xe8a3d485
  bytes4 private constant _INTERFACE_ID_CONTRACT_URI = 0xe8a3d485;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Contract metadata URL
  string private _contractMetadataURI;

  //////////////////////////////////////////////////////////////////////////////
  // Metadata interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @notice OpenSea calls this fuction to get information about how to display
   * the storefront
   *
   * @return The full URI of the contract metadata.
   */
  function contractURI() public view returns (string memory) {
    return _contractMetadataURI;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Administrative functions
  //////////////////////////////////////////////////////////////////////////////

  function logURI(uint256 tokenId) external {
    emit URI(uri(tokenId), tokenId);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal interface
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @notice Will update the contract metadata URI
   *
   * @param newContractMetadataURI New contract metadata URI
   */
  function _setContractMetadataURI(string memory newContractMetadataURI)
    internal
  {
    _contractMetadataURI = newContractMetadataURI;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation of {ERC165} via {ERC1155Metadata}
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev See {ERC165-supportsInterface}
   */
  function supportsInterface(bytes4 interfaceID)
    public
    pure
    virtual
    override
    returns (bool)
  {
    // Register OpenSea interface
    if (interfaceID == _INTERFACE_ID_CONTRACT_URI) {
      return true;
    }

    // Call ancestor
    return super.supportsInterface(interfaceID);
  }
}
