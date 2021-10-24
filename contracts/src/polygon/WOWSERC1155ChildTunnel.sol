// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import { ERC1155Holder } from '../../0xerc1155/tokens/ERC1155/ERC1155Holder.sol';
import { Address } from '../../0xerc1155/utils/Address.sol';
import { IWOWSERC1155 } from '../token/interfaces/IWOWSERC1155.sol';
import { FxBaseChildTunnel } from '../../polygonFx/tunnel/FxBaseChildTunnel.sol';
import { IBooster } from '../booster/interfaces/IBooster.sol';
import { ISFTEvaluator } from '../cfolio/interfaces/ISFTEvaluator.sol';

import { IChildTunnel } from './interfaces/IChildTunnel.sol';

import '../crowdsale/interfaces/IWOWSSftMinter.sol';
import '../utils/TokenIds.sol';

contract WOWSERC1155ChildTunnel is
  FxBaseChildTunnel,
  ERC1155Holder,
  IChildTunnel
{
  using Address for address;
  using TokenIds for uint256;

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  bytes32 public constant DEPOSIT = keccak256('DEPOSIT');
  bytes32 public constant DEPOSIT_BATCH = keccak256('DEPOSIT_BATCH');
  bytes32 private constant MIGRATE = keccak256('MIGRATE');
  bytes32 private constant MIGRATE_BATCH = keccak256('MIGRATE_BATCH');
  bytes32 private constant DISTRIBUTE = keccak256('DISTRIBUTE');
  bytes32 public constant WITHDRAW = keccak256('WITHDRAW');
  bytes32 public constant WITHDRAW_BATCH = keccak256('WITHDRAW_BATCH');
  bytes32 public constant MAP_TOKEN = keccak256('MAP_TOKEN');

  //////////////////////////////////////////////////////////////////////////////
  // Routing
  //////////////////////////////////////////////////////////////////////////////

  IWOWSERC1155 private immutable childToken_;
  IWOWSSftMinter private immutable sftMinter_;
  IBooster private immutable booster_;
  address private immutable admin_;
  ISFTEvaluator private immutable sftEvaluator_;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  address public rootToken;
  address public rewardHandler;

  // One time MATIC airdrop
  uint256 public airDropAmount = 1000000000000000000;
  mapping(address => uint256) public airDropped;

  //////////////////////////////////////////////////////////////////////////////
  // Modifier
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyAdmin() {
    require(msg.sender == admin_, 'CT: Only admin');
    _;
  }

  modifier onlyChildToken() {
    require(msg.sender == address(childToken_), 'CT: Only child');
    _;
  }

  modifier onlyRewardHandler() {
    require(msg.sender == rewardHandler, 'CT: Only rewardHandler');
    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  event TokenMapped(address indexed rootToken, address indexed childToken);

  event TokenReceived(
    address indexed to,
    address indexed depositor,
    uint256 tokenId,
    bytes data
  );

  event TokensReceived(
    address indexed to,
    address indexed depositor,
    uint256[] tokenIds,
    bytes data
  );

  event Received(uint256 amount);

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(
    address _fxChild,
    address _token,
    address _sftMinter,
    address _booster,
    address _admin,
    address _sftEvaluator
  ) FxBaseChildTunnel(_fxChild) {
    require(_token.isContract(), 'CT: Not a contract');
    require(
      _sftMinter != address(0) &&
        _booster != address(0) &&
        _admin != address(0) &&
        _sftEvaluator != address(0),
      'CT: Zero address'
    );

    childToken_ = IWOWSERC1155(_token);
    sftMinter_ = IWOWSSftMinter(_sftMinter);
    booster_ = IBooster(_booster);
    admin_ = _admin;
    sftEvaluator_ = ISFTEvaluator(_sftEvaluator);
  }

  /**
   * @dev Called from proxy
   */
  function initialize(address _rewardHandler) external {
    require(rewardHandler == address(0), 'CT: Initialized');

    rewardHandler = _rewardHandler;
  }

  /**
   * @dev Destruct implementation
   */
  function destructContract() external onlyAdmin {
    // slither-disable-next-line suicidal
    selfdestruct(payable(admin_));
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Allow receiving MATIC from admin
   */
  receive() external payable onlyAdmin {
    emit Received(msg.value);
  }

  /**
   * @dev See {IERC1155TokenReceiver-onERC1155Received}
   */
  function onERC1155Received(
    address operator,
    address from,
    uint256 tokenId,
    uint256 amount,
    bytes calldata data
  ) public override onlyChildToken returns (bytes4) {
    require(rootToken != address(0x0), 'CT: Token not mapped');
    require(tokenId.isBaseCard(), 'CT: Only basecards');

    bytes memory message = abi.encode(
      WITHDRAW,
      abi.encode(rootToken, childToken_, from, tokenId, data)
    );
    _sendMessageToRoot(message);

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
  ) public override onlyChildToken returns (bytes4) {
    require(rootToken != address(0x0), 'CT: Token not mapped');

    for (uint256 i = 0; i < tokenIds.length; ++i) {
      require(tokenIds[i].isBaseCard(), 'CT: Only basecards');
    }

    bytes memory message = abi.encode(
      WITHDRAW_BATCH,
      abi.encode(rootToken, childToken_, from, tokenIds, data)
    );
    _sendMessageToRoot(message);

    // Call ancestor
    return
      super.onERC1155BatchReceived(operator, from, tokenIds, amounts, data);
  }

  /**
   * @dev See {IChildTunnel-distribute}
   */
  function distribute(uint256 amount) external override onlyRewardHandler {
    bytes memory message = abi.encode(
      DISTRIBUTE,
      abi.encode(rootToken, childToken_, amount)
    );
    _sendMessageToRoot(message);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Maintanance
  //////////////////////////////////////////////////////////////////////////////

  function setRewardHandler(address newRewardHandler) external onlyAdmin {
    require(newRewardHandler != address(0), 'CT: Zero address');

    rewardHandler = newRewardHandler;
  }

  function simulateMessage(uint256 stateId, bytes calldata _data)
    external
    onlyAdmin
  {
    (address rootMessageSender, address receiver, bytes memory data) = abi
      .decode(_data, (address, address, bytes));
    require(receiver == address(this), 'CT: Wrong receiver');

    _processMessageFromRoot(stateId, rootMessageSender, data);
  }

  function setAirDropAmount(uint256 newAmount) external onlyAdmin {
    airDropAmount = newAmount;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal
  //////////////////////////////////////////////////////////////////////////////

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
    } else if (syncType == MIGRATE) {
      _syncMigrate(syncData);
    } else if (syncType == MIGRATE_BATCH) {
      _syncMigrateBatch(syncData);
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
      address _rootToken,
      address depositor,
      address user,
      uint256 tokenId,
      bytes memory data
    ) = abi.decode(syncData, (address, address, address, uint256, bytes));

    require(_rootToken == rootToken, 'CT: Invalid rootToken');
    _airdrop(user);

    if (childToken_.balanceOf(address(this), tokenId) == 1)
      childToken_.safeTransferFrom(address(this), user, tokenId, 1, '');
    else {
      uint256[] memory tokenIds = new uint256[](1);
      tokenIds[0] = tokenId;
      childToken_.mintBatch(user, tokenIds, data);
    }
    emit TokenReceived(user, depositor, tokenId, data);
  }

  function _syncDepositBatch(bytes memory syncData) internal {
    (
      address _rootToken,
      address depositor,
      address user,
      uint256[] memory tokenIds,
      bytes memory data
    ) = abi.decode(syncData, (address, address, address, uint256[], bytes));

    require(_rootToken == rootToken, 'CT: Invalid rootToken');
    uint256[] memory oneTokenIds = new uint256[](1);
    _airdrop(user);

    for (uint256 i = 0; i < tokenIds.length; ++i) {
      require(data.length > 0, 'CT: Length mismatch (DB)');
      if (childToken_.balanceOf(address(this), tokenIds[i]) == 1) {
        childToken_.safeTransferFrom(address(this), user, tokenIds[i], 1, '');
      } else {
        oneTokenIds[0] = tokenIds[i];
        childToken_.mintBatch(
          user,
          oneTokenIds,
          abi.encodePacked(_getUint256(data, i))
        );
      }
    }
    emit TokensReceived(user, depositor, tokenIds, data);
  }

  function _syncMigrate(bytes memory syncData) internal {
    (
      address _rootToken,
      address depositor,
      ,
      uint256 tokenId,
      bytes memory data
    ) = abi.decode(syncData, (address, address, address, uint256, bytes));
    require(_rootToken == rootToken, 'CT: Invalid rootToken');
    require(data.length > 32, 'CT: Data missing');

    // User is the last uint256
    address user = address(_getUint256(data, (data.length / 32) - 1));
    _airdrop(user);

    _migrateTokenId(tokenId, user, data, 0);

    emit TokenReceived(user, depositor, tokenId, data);
  }

  function _syncMigrateBatch(bytes memory syncData) internal {
    (
      address _rootToken,
      address depositor,
      ,
      uint256[] memory tokenIds,
      bytes memory data
    ) = abi.decode(syncData, (address, address, address, uint256[], bytes));
    require(_rootToken == rootToken, 'CT: Invalid rootToken');
    require(data.length > 32, 'CT: Data missing');

    // User is the last uint256
    address user = address(_getUint256(data, (data.length / 32) - 1));
    _airdrop(user);

    uint256 dataIndex = 0;
    for (uint256 i = 0; i < tokenIds.length; ++i) {
      dataIndex = _migrateTokenId(tokenIds[i], user, data, dataIndex);
    }
    emit TokensReceived(user, depositor, tokenIds, data);
  }

  function _migrateTokenId(
    uint256 tokenId,
    address user,
    bytes memory data,
    uint256 dataIndex
  ) private returns (uint256) {
    uint256[] memory noInvest = new uint256[](0);

    if (tokenId.isBaseCard()) {
      uint256[] memory oneTokenIds = new uint256[](1);
      oneTokenIds[0] = tokenId;
      childToken_.mintBatch(
        user,
        oneTokenIds,
        abi.encodePacked(_getUint256(data, dataIndex++))
      );

      uint256 numCfis = _getUint256(data, dataIndex++);
      for (uint256 i = 0; i < numCfis; ++i) {
        uint256 cfiType = _getUint256(data, dataIndex++);
        sftMinter_.mintCFolioItemSFT(user, cfiType, tokenId, 0, noInvest);
      }
      uint256 hasBooster = _getUint256(data, dataIndex++);
      if (hasBooster > 0) {
        dataIndex = booster_.migrateCreatePool(tokenId, data, dataIndex);
      }
      sftEvaluator_.setRewardRate(tokenId, false);
    } else {
      uint256 cfiType = _getUint256(data, dataIndex++);
      tokenId = sftMinter_.mintCFolioItemSFT(
        user,
        cfiType,
        uint256(-1),
        0,
        noInvest
      );
    }
    return dataIndex;
  }

  /**
   * @dev Get the uint256 from the user data parameter
   */
  function _getUint256(bytes memory data, uint256 index)
    private
    pure
    returns (uint256 val)
  {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      val := mload(add(data, mul(0x20, add(index, 1))))
    }
  }

  /**
   * @dev Airdrop MATIC if contract owns some
   */
  function _airdrop(address account) private {
    if (
      airDropAmount > 0 &&
      address(this).balance >= airDropAmount &&
      airDropped[account] == 0
    ) {
      airDropped[account] = 1;
      // slither-disable-next-line arbitrary-send
      payable(account).transfer(airDropAmount);
    }
  }
}
