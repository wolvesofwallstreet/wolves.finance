// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import { IERC1155 } from '../../0xerc1155/interfaces/IERC1155.sol';
import { ERC1155Holder } from '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';
import { SafeMath } from '../../0xerc1155/utils/SafeMath.sol';
import { FxBaseRootTunnel } from '../../polygonFx/tunnel/FxBaseRootTunnel.sol';
import { ISFTEvaluator } from '../cfolio/interfaces/ISFTEvaluator.sol';

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
  ISFTEvaluator private immutable sftEvaluator_;

  //////////////////////////////////////////////////////////////////////////////
  // Modifier
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyRootToken() {
    require(msg.sender == address(rootToken_), 'CF: Only from root');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(
    address _checkpointManager,
    address _fxRoot,
    address _rootToken,
    address _childToken,
    ISFTEvaluator _sftEvaluator
  ) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
    require(_rootToken != address(0), 'RT: Invalid root');
    require(_childToken != address(0), 'RT: Invalid child');

    rootToken_ = IWOWSERC1155(_rootToken);
    childToken_ = _childToken;
    sftEvaluator_ = _sftEvaluator;

    // MAP_TOKEN, encode(rootToken,uri)
    bytes memory message = abi.encode(MAP_TOKEN, abi.encode(_rootToken));
    _sendMessageToChild(message);
  }

  /**
   * @dev See {IERC1155TokenReceiver-onERC1155Received}
   */
  function onERC1155Received(
    address operator,
    address from,
    uint256 tokenId,
    uint256 amount,
    bytes calldata // data
  ) public override onlyRootToken returns (bytes4) {
    // Get cfolios
    bytes memory data = _getTokenData('', tokenId);

    // DEPOSIT, encode(rootToken, depositor, user, id, amount, extra data)
    bytes memory message = abi.encode(
      DEPOSIT,
      abi.encode(address(rootToken_), operator, from, tokenId, amount, data)
    );
    _sendMessageToChild(message);

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
    bytes calldata // data
  ) public override onlyRootToken returns (bytes4) {
    bytes memory data;
    for (uint256 i = 0; i < tokenIds.length; ++i)
      data = _getTokenData(data, tokenIds[i]);

    // DEPOSIT_BATCH, encode(rootToken, depositor, user, id, amount, extra data)
    bytes memory message = abi.encode(
      DEPOSIT_BATCH,
      abi.encode(address(rootToken_), operator, from, tokenIds, amounts, data)
    );
    _sendMessageToChild(message);

    // Call ancestor
    return
      super.onERC1155BatchReceived(operator, from, tokenIds, amounts, data);
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
      bytes memory data
    ) = abi.decode(
        syncData,
        (address, address, address, uint256, uint256, bytes)
      );
    require(rootToken == address(rootToken_), 'RT: Invalid root');
    require(childToken == childToken_, 'RT: Invalid child');

    rootToken_.safeTransferFrom(address(this), user, tokenId, amount, data);
  }

  function _syncBatchWithdraw(bytes memory syncData) internal {
    (
      address rootToken,
      address childToken,
      address user,
      uint256[] memory tokenIds,
      uint256[] memory amounts,
      bytes memory data
    ) = abi.decode(
        syncData,
        (address, address, address, uint256[], uint256[], bytes)
      );
    require(rootToken == address(rootToken_), 'RT: Invalid root');
    require(childToken == childToken_, 'RT: Invalid child');

    rootToken_.safeBatchTransferFrom(
      address(this),
      user,
      tokenIds,
      amounts,
      data
    );
  }

  function _getTokenData(bytes memory data, uint256 tokenId)
    private
    view
    returns (bytes memory)
  {
    (uint256 mintTimestamp, ) = rootToken_.getTokenData(tokenId);
    uint256 prowess = tokenId.isBaseCard()
      ? sftEvaluator_.rewardRate(tokenId)
      : 0;

    return abi.encodePacked(data, mintTimestamp, prowess);
  }
}
