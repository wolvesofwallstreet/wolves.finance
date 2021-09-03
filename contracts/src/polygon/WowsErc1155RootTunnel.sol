// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import { IERC1155 } from '../../0xerc1155/interfaces/IERC1155.sol';
import { ERC1155Holder } from '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';
import { SafeMath } from '../../0xerc1155/utils/SafeMath.sol';
import { FxBaseRootTunnel } from '../../polygonFx/tunnel/FxBaseRootTunnel.sol';

import '../cfolio/interfaces/ICFolioItemHandler.sol';
import '../cfolio/interfaces/ISFTEvaluator.sol';
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

  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  IERC1155 private immutable rootToken_;
  address private immutable childToken_;

  IWOWSERC1155 private immutable sftContract_;
  address private immutable cfiBridge_;
  ISFTEvaluator private immutable sftEvaluator_;

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(
    address _checkpointManager,
    address _fxRoot,
    address _rootToken,
    address _childToken,
    address _sftContract,
    address _cfiBridge,
    address _sftEvaluator
  ) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
    require(_rootToken != address(0), 'RT: Invalid root');
    require(_childToken != address(0), 'RT: Invalid child');
    require(_cfiBridge != address(0), 'RT: Invalid cfib');

    rootToken_ = IERC1155(_rootToken);
    childToken_ = _childToken;

    sftContract_ = IWOWSERC1155(_sftContract);
    cfiBridge_ = _cfiBridge;
    sftEvaluator_ = ISFTEvaluator(_sftEvaluator);

    // MAP_TOKEN, encode(rootToken,uri)
    bytes memory message = abi.encode(MAP_TOKEN, abi.encode(_rootToken));
    _sendMessageToChild(message);
  }

  function deposit(
    address user,
    uint256 tokenId,
    uint256 amount
  ) public {
    // transfer from depositor to this contract
    rootToken_.safeTransferFrom(
      msg.sender, // depositor
      address(this), // manager contract
      tokenId,
      amount,
      ''
    );

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
      uint256 id,
      uint256 amount,
      bytes memory data
    ) = abi.decode(
        syncData,
        (address, address, address, uint256, uint256, bytes)
      );
    require(rootToken == address(rootToken_), 'RT: Invalid root');
    require(childToken == childToken_, 'RT: Invalid child');

    rootToken_.safeTransferFrom(address(this), user, id, amount, data);
  }

  function _syncBatchWithdraw(bytes memory syncData) internal {
    (
      address rootToken,
      address childToken,
      address user,
      uint256[] memory ids,
      uint256[] memory amounts,
      bytes memory data
    ) = abi.decode(
        syncData,
        (address, address, address, uint256[], uint256[], bytes)
      );
    require(rootToken == address(rootToken_), 'RT: Invalid root');
    require(childToken == childToken_, 'RT: Invalid child');

    rootToken_.safeBatchTransferFrom(address(this), user, ids, amounts, data);
  }

  function _getCFolio(bytes memory data, uint256 tokenId)
    private
    returns (bytes memory)
  {
    // Collect changed CFIH's
    address[] memory updateHandler = new address[](1);

    if (tokenId.isBaseCard()) {
      address cfolio = sftContract_.tokenIdToAddress(tokenId);
      require(cfolio != address(0), 'RT: Invalid cfolio');

      (uint256[] memory items, uint256 itemsLength) = IWOWSCryptofolio(cfolio)
        .getCryptofolio(cfiBridge_);
      bytes memory result = abi.encodePacked(itemsLength);
      // Loop over cfolioItems, remove share, and add them for transfer
      for (uint256 i = 0; i < itemsLength; ++i) {
        result = abi.encodePacked(
          result,
          items[i],
          sftEvaluator_.getCFolioItemType(items[i]),
          _removeAsset(items[i], updateHandler)
        );
      }
      // Update farms after asset adding
      for (
        uint256 i = 0;
        i < updateHandler.length && updateHandler[i] != address(0);
        ++i
      ) ICFolioItemHandler(updateHandler[i]).updateRewards(tokenId);
      return abi.encodePacked(data, result);
    } else {
      return
        abi.encodePacked(
          data,
          sftEvaluator_.getCFolioItemType(tokenId),
          _removeAsset(tokenId, updateHandler)
        );
    }
  }

  function _removeAsset(uint256 tokenId, address[] memory updateHandler)
    private
    returns (uint256)
  {
    address cfolioItem = sftContract_.tokenIdToAddress(tokenId);
    require(cfolioItem != address(0), 'RT: Invalid cfolioItem');
    address handler = IWOWSCryptofolio(cfolioItem)._tradefloors(0);

    uint256 amount = ICFolioItemHandler(handler).removeAssets(cfolioItem);
    if (amount > 0) {
      // Currently only one CFIH supported
      if (updateHandler[0] == address(0)) updateHandler[0] = handler;
      else require(updateHandler[0] == handler, 'RT: Only 1 handler');
    }
    return amount;
  }

  function _parseAmounts(
    bytes memory data,
    uint256 tokenId,
    uint256 start
  ) private returns (uint256) {
    // Collect changed CFIH's
    address[] memory updateHandler = new address[](1);

    if (tokenId.isBaseCard()) {
      // Num | [TokenId | Amount]
      uint256 incomingSum;
      uint256 expectedSum;

      address cfolio = sftContract_.tokenIdToAddress(tokenId);
      require(cfolio != address(0), 'RT: Invalid cfolio');

      (uint256[] memory items, uint256 itemCount) = IWOWSCryptofolio(cfolio)
        .getCryptofolio(cfiBridge_);

      uint256 incomingItemCount = _getUint256(data, start++);
      require(itemCount == incomingItemCount, 'RT: Wrong cfi count');
      require(data.length / 32 >= start + 2 * itemCount, 'RT: data wrong');

      // Iterate through cfi's and add asset into CFIH
      // Also sum tokenIds up for a final verification step
      for (uint256 i = 0; i < incomingItemCount; ++i) {
        uint256 itemTokenId = _getUint256(data, start++);
        uint256 amount = _getUint256(data, start++);
        incomingSum = incomingSum.add(itemTokenId);
        expectedSum = expectedSum.add(items[i]);
        _addAsset(itemTokenId, amount, updateHandler);
      }
      // Verify that tokenId sums are equal
      require(incomingSum == expectedSum, 'RT: Verification failed');
      // Update farms after asset adding
      for (
        uint256 i = 0;
        i < updateHandler.length && updateHandler[i] != address(0);
        ++i
      ) ICFolioItemHandler(updateHandler[i]).updateRewards(tokenId);
    } else {
      // Amount
      require(data.length / 32 > start, 'RT: data wrong');
      _addAsset(tokenId, _getUint256(data, start++), updateHandler);
    }
    return start;
  }

  function _addAsset(
    uint256 tokenId,
    uint256 amount,
    address[] memory updateHandler
  ) private {
    if (amount > 0) {
      address cfolioItem = sftContract_.tokenIdToAddress(tokenId);
      require(cfolioItem != address(0), 'RT: Invalid cfolioItem');
      address handler = IWOWSCryptofolio(cfolioItem)._tradefloors(0);

      ICFolioItemHandler(handler).addAssets(cfolioItem, amount);
      // Currently only one CFIH supported
      if (updateHandler[0] == address(0)) updateHandler[0] = handler;
      else require(updateHandler[0] == handler, 'RT: Only 1 handler');
    }
  }

  function _getUint256(bytes memory bs, uint256 start)
    internal
    pure
    returns (uint256)
  {
    uint256 ret;
    // solhint-disable-next-line no-inline-assembly
    assembly {
      ret := mload(add(bs, add(0x20, mul(start, 0x20))))
    }
    return ret;
  }
}
