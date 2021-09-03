// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import { IERC1155MintBurn } from '../../0xerc1155/interfaces/IERC1155MintBurn.sol';
import { Address } from '../../0xerc1155/utils/Address.sol';
import { FxBaseChildTunnel } from '../../polygonFx/tunnel/FxBaseChildTunnel.sol';

contract WowsERC1155ChildTunnel is FxBaseChildTunnel {
  using Address for address;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  bytes32 public constant DEPOSIT = keccak256('DEPOSIT');
  bytes32 public constant DEPOSIT_BATCH = keccak256('DEPOSIT_BATCH');
  bytes32 public constant WITHDRAW = keccak256('WITHDRAW');
  bytes32 public constant WITHDRAW_BATCH = keccak256('WITHDRAW_BATCH');
  bytes32 public constant MAP_TOKEN = keccak256('MAP_TOKEN');

  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  IERC1155MintBurn private immutable childToken_;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  address public rootToken;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  event TokenMapped(address indexed rootToken, address indexed childToken);

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(address _fxChild, address _token) FxBaseChildTunnel(_fxChild) {
    require(_token.isContract(), 'CT: Not a contract');
    childToken_ = IERC1155MintBurn(_token);
  }

  function withdraw(
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public {
    require(rootToken != address(0x0), 'CT: Token not mapped');

    childToken_.burn(msg.sender, id, amount);

    bytes memory message = abi.encode(
      WITHDRAW,
      abi.encode(rootToken, childToken_, msg.sender, id, amount, data)
    );
    _sendMessageToRoot(message);
  }

  function withdrawBatch(
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public {
    require(rootToken != address(0x0), 'CT: Token not mapped');

    childToken_.batchBurn(msg.sender, ids, amounts);

    bytes memory message = abi.encode(
      WITHDRAW_BATCH,
      abi.encode(rootToken, childToken_, msg.sender, ids, amounts, data)
    );
    _sendMessageToRoot(message);
  }

  function _processMessageFromRoot(
    uint256, /* stateId */
    address sender,
    bytes memory data
  ) internal override validateSender(sender) {
    (bytes32 syncType, bytes memory syncData) = abi.decode(
      data,
      (bytes32, bytes)
    );

    if (syncType == MAP_TOKEN) {
      _mapToken(syncData);
    } else if (syncType == DEPOSIT) {
      _syncDeposit(syncData);
    } else if (syncType == DEPOSIT_BATCH) {
      _syncDepositBatch(syncData);
    } else {
      revert('CT: Invalid sync type');
    }
  }

  function _mapToken(bytes memory syncData) internal {
    address _rootToken = abi.decode(syncData, (address));

    require(rootToken == address(0), 'CT: Already mapped');

    rootToken = _rootToken;

    emit TokenMapped(rootToken, address(childToken_));
  }

  function _syncDeposit(bytes memory syncData) internal {
    (
      address _rootToken, /*address depositor*/
      ,
      address user,
      uint256 id,
      uint256 amount,
      bytes memory data
    ) = abi.decode(
        syncData,
        (address, address, address, uint256, uint256, bytes)
      );

    require(_rootToken == rootToken, 'CT: Invalid rootToken');

    childToken_.mint(user, id, amount, data);
  }

  function _syncDepositBatch(bytes memory syncData) internal {
    (
      address _rootToken, /*address depositor */
      ,
      address user,
      uint256[] memory ids,
      uint256[] memory amounts,
      bytes memory data
    ) = abi.decode(
        syncData,
        (address, address, address, uint256[], uint256[], bytes)
      );

    require(_rootToken == rootToken, 'CT: Invalid rootToken');

    childToken_.batchMint(user, ids, amounts, data);
  }
}
