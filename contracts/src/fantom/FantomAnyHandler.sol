/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import { ERC1155Holder } from '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';
import { IWOWSERC1155 } from '../token/interfaces/IWOWSERC1155.sol';

import '../utils/TokenIds.sol';
import './interfaces/IERC1155Transfer.sol';
import './interfaces/IAnyNftRouter.sol';

contract FantomAnyHandler is IERC1155Transfer, ERC1155Holder {
  using TokenIds for uint256;
  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  address private immutable _admin;
  address private immutable _sftHolder;
  address private immutable _nftRouter;
  uint256 private immutable _destChain;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  uint256 private constant CHILD_CHAIN_ID = 250;

  //////////////////////////////////////////////////////////////////////////////
  // Modifier
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyAdmin() {
    require(msg.sender == _admin, 'FAH: Only admin');
    _;
  }

  modifier onlyNftRouter() {
    require(msg.sender == _nftRouter, 'FAH: Only router');
    _;
  }

  modifier onlySftHolder() {
    require(msg.sender == _sftHolder, 'FAH: Only from SFT');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(
    address admin,
    address sftHolder,
    address nftRouter,
    uint256 destChain
  ) {
    _admin = admin;
    _sftHolder = sftHolder;
    _nftRouter = nftRouter;
    _destChain = destChain;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation
  //////////////////////////////////////////////////////////////////////////////

  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes calldata
  ) external override onlyNftRouter {
    _handleTransfer(from, to, _toArray(tokenId), _toArray(amount));
  }

  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] calldata tokenIds,
    uint256[] calldata amounts,
    bytes calldata
  ) external override onlyNftRouter {
    _handleTransfer(from, to, tokenIds, amounts);
  }

  /**
   * @dev See {IERC1155TokenReceiver-onERC1155BatchReceived}
   *
   * @notice sftHolder only calls batch version
   */
  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] calldata tokenIds,
    uint256[] calldata amounts,
    bytes calldata data
  ) public override onlySftHolder returns (bytes4) {
    uint256[] memory newAmounts = amounts;
    if (_destChain != CHILD_CHAIN_ID) {
      // Root chain, put timestamp into amount
      newAmounts = new uint256[](amounts.length);
      for (uint256 i = 0; i < tokenIds.length; ++i) {
        (uint64 timestamp, ) = IWOWSERC1155(_sftHolder).getTokenData(
          tokenIds[i]
        );
        newAmounts[i] = uint256(timestamp);
      }
    }

    uint256 fee = IAnyNftRouter(_nftRouter).feePerTransaction() +
      tokenIds.length *
      IAnyNftRouter(_nftRouter).feePerUnitInBatch();

    // ToDo: pass fees
    IAnyNftRouter(_nftRouter).nft1155BatchSwapOut{ value: fee }(
      address(this),
      from,
      tokenIds,
      newAmounts,
      data,
      _destChain
    );

    // Call ancestor
    return
      super.onERC1155BatchReceived(operator, from, tokenIds, amounts, data);
  }

  /**
   * @dev Destruct implementation
   */
  function destructContract() external onlyAdmin {
    // slither-disable-next-line suicidal
    selfdestruct(payable(_admin));
  }

  /**
   * @dev Allow receiving ETH
   */
  receive() external payable {}

  //////////////////////////////////////////////////////////////////////////////
  // Internal
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Handle transfer swapIn calls only
   */
  function _handleTransfer(
    address from,
    address to,
    uint256[] memory tokenIds,
    uint256[] memory amounts
  ) private {
    if (from == _nftRouter) {
      if (_destChain != CHILD_CHAIN_ID) {
        // Root chain
        IWOWSERC1155(_sftHolder).safeBatchTransferFrom(
          address(this),
          to,
          tokenIds,
          amounts,
          ''
        );
      } else {
        // Child chain, amounts are mint timestamps, token may has to be minted
        require(tokenIds.length == amounts.length, 'FAH: Length mismatch');
        uint256 numMints = 0;
        uint256[] memory mints = new uint256[](tokenIds.length);
        uint256 numTransfers = 0;
        uint256[] memory transfers = new uint256[](tokenIds.length);
        bytes memory mintData;

        for (uint256 i = 0; i < tokenIds.length; ++i) {
          if (
            IWOWSERC1155(_sftHolder).balanceOf(address(this), tokenIds[i]) == 0
          ) {
            mints[numMints++] = tokenIds[i];
            mintData = abi.encodePacked(mintData, amounts[i]);
          } else transfers[numTransfers++] = tokenIds[i];
        }

        if (numTransfers > 0) {
          // solhint-disable-next-line no-inline-assembly
          assembly {
            mstore(transfers, numTransfers)
          }
          IWOWSERC1155(_sftHolder).safeBatchTransferFrom(
            address(this),
            to,
            transfers,
            new uint256[](0),
            ''
          );
        }
        if (numMints > 0) {
          // solhint-disable-next-line no-inline-assembly
          assembly {
            mstore(mints, numMints)
          }
          IWOWSERC1155(_sftHolder).mintBatch(to, mints, mintData);
        }
      }
    }
  }

  /**
   * @dev Convert uint to uint[](1)
   */
  function _toArray(uint256 value)
    private
    pure
    returns (uint256[] memory result)
  {
    result = new uint256[](1);
    result[0] = value;
  }
}
