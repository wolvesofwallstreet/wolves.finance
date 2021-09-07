// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import { IERC1155 } from '../../0xerc1155/interfaces/IERC1155.sol';
import { ERC1155Holder } from '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';
import { SafeMath } from '../../0xerc1155/utils/SafeMath.sol';
import { FxBaseRootTunnel } from '../../polygonFx/tunnel/FxBaseRootTunnel.sol';

import '../token/interfaces/IWOWSCryptofolio.sol';
import '../token/interfaces/IWOWSERC1155.sol';
import '../utils/TokenIds.sol';

contract WowsERC1155RootTunnel is FxBaseRootTunnel, ERC1155Holder {
  using TokenIds for uint256;
  using SafeMath for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  bytes32 private constant DEPOSIT = keccak256('DEPOSIT');
  bytes32 private constant DEPOSIT_BATCH = keccak256('DEPOSIT_BATCH');
  bytes32 private constant WITHDRAW = keccak256('WITHDRAW');
  bytes32 private constant WITHDRAW_BATCH = keccak256('WITHDRAW_BATCH');
  bytes32 private constant MAP_TOKEN = keccak256('MAP_TOKEN');

  uint256 private constant CHAIN_ID = 1;

  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  IWOWSERC1155 private immutable rootToken_;
  address private immutable childToken_;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(
    address _checkpointManager,
    address _fxRoot,
    address _rootToken,
    address _childToken
  ) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
    require(_rootToken != address(0), 'RT: Invalid root');
    require(_childToken != address(0), 'RT: Invalid child');

    rootToken_ = IWOWSERC1155(_rootToken);
    childToken_ = _childToken;

    // MAP_TOKEN, encode(rootToken,uri)
    bytes memory message = abi.encode(MAP_TOKEN, abi.encode(_rootToken));
    _sendMessageToChild(message);
  }

  function deposit(
    address user,
    uint256 tokenId,
    uint256 amount
  ) public {
    // Validate ownership
    require(rootToken_.balanceOf(msg.sender, tokenId) == 1, 'RT: invalid');

    // Transfer from depositor to this contract
    rootToken_.lockOnChain(tokenId, CHAIN_ID);

    // Get cfolios
    bytes memory data = _getCFolio('', tokenId);

    // DEPOSIT, encode(rootToken, depositor, user, id, amount, extra data)
    bytes memory message = abi.encode(
      DEPOSIT,
      abi.encode(address(rootToken_), msg.sender, user, tokenId, amount, data)
    );
    _sendMessageToChild(message);
  }

  function depositBatch(
    address user,
    uint256[] memory tokenIds,
    uint256[] memory amounts
  ) public {
    // transfer from depositor to this contract
    rootToken_.safeBatchTransferFrom(
      msg.sender, // depositor
      address(this), // manager contract
      tokenIds,
      amounts,
      ''
    );

    bytes memory data;
    for (uint256 i = 0; i < tokenIds.length; ++i)
      data = _getCFolio(data, tokenIds[i]);

    // DEPOSIT_BATCH, encode(rootToken, depositor, user, id, amount, extra data)
    bytes memory message = abi.encode(
      DEPOSIT_BATCH,
      abi.encode(address(rootToken_), msg.sender, user, tokenIds, amounts, data)
    );
    _sendMessageToChild(message);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal
  //////////////////////////////////////////////////////////////////////////////

  function _processMessageFromChild(bytes memory data) internal override {
    (bytes32 syncType, bytes memory syncData) = abi.decode(
      data,
      (bytes32, bytes)
    );

    if (syncType == WITHDRAW) {
      _syncWithdraw(syncData);
    } else if (syncType == WITHDRAW_BATCH) {
      _syncBatchWithdraw(syncData);
    } else {
      revert('RT: Invalid sync type');
    }
  }

  function _syncWithdraw(bytes memory syncData) internal {
    (
      address rootToken,
      address childToken,
      address user,
      uint256 tokenId,
      uint256 amount,

    ) = /*bytes memory data*/
      abi.decode(
        syncData,
        (address, address, address, uint256, uint256, bytes)
      );
    require(rootToken == address(rootToken_), 'RT: Invalid root');
    require(childToken == childToken_, 'RT: Invalid child');
    require(amount == 1, 'RT: Invalid amount');
    require(rootToken_.balanceOf(user, tokenId) == 1, 'RT: Invalid user');

    rootToken_.unlockFromChain(tokenId, CHAIN_ID);
  }

  function _syncBatchWithdraw(bytes memory syncData) internal {
    (
      address rootToken,
      address childToken,
      address user,
      uint256[] memory tokenIds,
      uint256[] memory amounts,

    ) = /*bytes memory data*/
      abi.decode(
        syncData,
        (address, address, address, uint256[], uint256[], bytes)
      );
    require(rootToken == address(rootToken_), 'RT: Invalid root');
    require(childToken == childToken_, 'RT: Invalid child');
    require(amounts.length == 0, 'RT: Invalid amounts');

    for (uint256 i = 0; i < tokenIds.length; ++i) {
      require(rootToken_.balanceOf(user, tokenIds[i]) == 1, 'RT: Invalid user');
      rootToken_.unlockFromChain(tokenIds[i], CHAIN_ID);
    }
  }

  function _getCFolio(bytes memory data, uint256 tokenId)
    private
    returns (bytes memory)
  {
    rootToken_.lockOnChain(tokenId, CHAIN_ID);

    if (tokenId.isBaseCard()) {
      address cfolio = rootToken_.tokenIdToAddress(tokenId);
      require(cfolio != address(0), 'RT: Invalid cfolio');

      uint256[] memory items = rootToken_.getTokenIds(cfolio);
      bytes memory result = abi.encodePacked(items.length);
      // Loop over cfolioItems, remove share, and add them for transfer
      for (uint256 i = 0; i < items.length; ++i) {
        // Lock CFI on sidechain
        rootToken_.lockOnChain(tokenId, CHAIN_ID);

        result = abi.encodePacked(
          result,
          items[i],
          rootToken_.getCFolioItemType(items[i])
        );
      }
      return abi.encodePacked(data, result);
    } else {
      return abi.encodePacked(data, rootToken_.getCFolioItemType(tokenId));
    }
  }
}
