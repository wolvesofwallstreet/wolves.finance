/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.7.6;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import '../utils/ERC20Recovery.sol';

import './interfaces/ICFolioFarm.sol';
import './interfaces/IController.sol';
import './interfaces/IFarm.sol';

/**
 * @notice Farm is owned by a CFolio contract.
 *
 * All state modifing calls are only allowed from this owner.
 */
contract CFolioFarm is IFarm, ICFolioFarm, Ownable, ERC20Recovery {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  uint256 public override periodFinish = 0;
  uint256 public rewardRate = 0;
  uint256 public override rewardsDuration = 14 days;
  uint256 public lastUpdateTime;
  uint256 public rewardPerTokenStored;
  uint256 private availableRewards;

  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;

  // Unique name of this farm instance, used in controller
  string private _farmName;

  uint256[] private _totalSupplys;
  uint256[] public slotWeights;

  mapping(address => mapping(uint256 => uint256)) private _balances;

  // The address of the controller
  IController public override controller;

  //////////////////////////////////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////////////////////////////////

  event RewardAdded(uint256 reward);

  event AssetAdded(
    address indexed user,
    uint256 amount,
    uint256 totalAmount,
    uint256 slotId
  );

  event AssetRemoved(
    address indexed user,
    uint256 amount,
    uint256 totalAmount,
    uint256 slotId
  );

  event ShareAdded(address indexed user, uint256 amount, uint256 slotId);

  event ShareRemoved(address indexed user, uint256 amount, uint256 slotId);

  event RewardPaid(
    address indexed account,
    address indexed user,
    uint256 reward
  );

  event RewardsDurationUpdated(uint256 newDuration);

  event ControllerChanged(address newController);

  event SlotWeightChanged(uint256 slotId, uint256 newWeight);

  //////////////////////////////////////////////////////////////////////////////
  // Modifiers
  //////////////////////////////////////////////////////////////////////////////

  modifier onlyController() {
    require(_msgSender() == address(controller), 'not controller');
    _;
  }

  modifier updateReward(address account) {
    rewardPerTokenStored = rewardPerToken();
    lastUpdateTime = lastTimeRewardApplicable();

    if (account != address(0)) {
      rewards[account] = earned(account);
      userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }

    _;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(
    address _owner,
    string memory _name,
    address _controller
  ) {
    // Validate parameters
    require(_owner != address(0), 'Invalid owner');
    require(_controller != address(0), 'Invalid controller');

    // Initialize {Ownable}
    transferOwnership(_owner);

    // Initialize state
    _farmName = _name;
    controller = IController(_controller);
    // TotalSupply for slot 0
    _totalSupplys.push(0);
    slotWeights.push(1E18);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Views
  //////////////////////////////////////////////////////////////////////////////

  function farmName() external view override returns (string memory) {
    return _farmName;
  }

  function totalSupply() external view override returns (uint256) {
    return _totalSupply();
  }

  function balanceOf(address account, uint256 slotId)
    external
    view
    override
    returns (uint256)
  {
    return _balances[account][slotId];
  }

  function balancesOf(address account)
    external
    view
    override
    returns (uint256[] memory result)
  {
    uint256 _slotCount = slotWeights.length;
    result = new uint256[](_slotCount);
    for (uint256 slotId = 0; slotId < _slotCount; ++slotId)
      result[slotId] = _balances[account][slotId];
  }

  function lastTimeRewardApplicable() public view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp < periodFinish ? block.timestamp : periodFinish;
  }

  function rewardPerToken() public view returns (uint256) {
    uint256 ts = _totalSupply();
    if (ts == 0) {
      return rewardPerTokenStored;
    }

    return
      rewardPerTokenStored.add(
        lastTimeRewardApplicable()
          .sub(lastUpdateTime)
          .mul(rewardRate)
          .mul(1e18)
          .div(ts)
      );
  }

  function earned(address account) public view returns (uint256) {
    return
      _balance(account)
        .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(rewards[account]);
  }

  function getRewardForDuration() external view returns (uint256) {
    return rewardRate.mul(rewardsDuration);
  }

  function getUIData(address account)
    external
    view
    override
    returns (uint256[5] memory)
  {
    uint256[5] memory result = [
      _totalSupply(),
      _balance(account),
      rewardsDuration,
      rewardRate.mul(rewardsDuration),
      earned(account)
    ];
    return result;
  }

  function slotCount() external view override returns (uint256) {
    return slotWeights.length;
  }

  //////////////////////////////////////////////////////////////////////////////
  // Mutators
  //////////////////////////////////////////////////////////////////////////////

  function addAssets(
    address account,
    uint256 amount,
    uint256 slotId
  ) external override onlyOwner {
    // Validate parameters
    require(amount > 0, 'CFolioFarm: Cannot add 0');
    require(!controller.paused(), 'CFolioFarm: Controller paused');

    // Update state
    _balances[account][slotId] = _balances[account][slotId].add(amount);

    // Dispatch event
    emit AssetAdded(account, amount, _balances[account][slotId], slotId);
  }

  function removeAssets(
    address account,
    uint256 amount,
    uint256 slotId
  ) external override onlyOwner {
    // Validate parameters
    require(amount > 0, 'CFolioFarm: Cannot remove 0');

    // Update state
    _balances[account][slotId] = _balances[account][slotId].sub(amount);

    // Dispatch event
    emit AssetRemoved(account, amount, _balances[account][slotId], slotId);
  }

  function addShares(
    address account,
    uint256 amount,
    uint256 slotId
  ) external override onlyOwner updateReward(account) {
    // Validate parameters
    require(amount > 0, 'CFolioFarm: Cannot add 0');
    require(!controller.paused(), 'CFolioFarm: Controller paused');
    require(slotId < slotWeights.length, 'CFolioFarm: Invalid slotId');

    // Update state
    _totalSupplys[slotId] = _totalSupplys[slotId].add(amount);
    _balances[account][slotId] = _balances[account][slotId].add(amount);

    // Notify controller
    controller.onDeposit(amount);

    // Dispatch event
    emit ShareAdded(account, amount, slotId);
  }

  function removeShares(
    address account,
    uint256 amount,
    uint256 slotId
  ) public override onlyOwner updateReward(account) {
    // Validate parameters
    require(amount > 0, 'CFolioFarm: Cannot remove 0');
    require(slotId < slotWeights.length, 'CFolioFarm: Invalid slotId');

    // Update state
    _totalSupplys[slotId] = _totalSupplys[slotId].sub(amount);
    _balances[account][slotId] = _balances[account][slotId].sub(amount);

    // Notify controller
    controller.onWithdraw(amount);

    // Dispatch event
    emit ShareRemoved(account, amount, slotId);
  }

  function getReward(address account, address rewardRecipient)
    public
    override
    onlyOwner
    updateReward(account)
  {
    // Load state
    uint256 reward = rewards[account];

    if (reward > 0) {
      // Update state
      rewards[account] = 0;
      availableRewards = availableRewards.sub(reward);

      // Notify controller
      controller.payOutRewards(rewardRecipient, reward);

      // Dispatch event
      emit RewardPaid(account, rewardRecipient, reward);
    }
  }

  function weightSlotId(uint256 slotId, uint256 weight)
    external
    override
    onlyController
    updateReward(address(0))
  {
    uint256 _slotCount = slotWeights.length;
    require(slotId <= _slotCount, 'CFolioFarm: Invalid slotId');
    if (slotId == _slotCount) {
      _totalSupplys.push(0);
      slotWeights.push(weight);
    } else slotWeights[slotId] = weight;

    // Emit event
    emit SlotWeightChanged(slotId, weight);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Restricted functions
  //////////////////////////////////////////////////////////////////////////////

  function setController(address newController)
    external
    override
    onlyController
  {
    // Update state
    controller = IController(newController);

    // Dispatch event
    emit ControllerChanged(newController);

    if (newController == address(0))
      // slither-disable-next-line suicidal
      selfdestruct(payable(msg.sender));
  }

  function notifyRewardAmount(uint256 reward)
    external
    override
    onlyController
    updateReward(address(0))
  {
    // Update state
    // solhint-disable-next-line not-rely-on-time
    if (block.timestamp >= periodFinish) {
      rewardRate = reward.div(rewardsDuration);
    } else {
      // solhint-disable-next-line not-rely-on-time
      uint256 remaining = periodFinish.sub(block.timestamp);
      uint256 leftover = remaining.mul(rewardRate);
      rewardRate = reward.add(leftover).div(rewardsDuration);
    }
    availableRewards = availableRewards.add(reward);

    // Validate state
    //
    // Ensure the provided reward amount is not more than the balance in the
    // contract.
    //
    // This keeps the reward rate in the right range, preventing overflows due
    // to very high values of rewardRate in the earned and rewardsPerToken
    // functions.
    //
    // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
    //
    require(
      rewardRate <= availableRewards.div(rewardsDuration),
      'Provided reward too high'
    );

    // Update state
    // solhint-disable-next-line not-rely-on-time
    lastUpdateTime = block.timestamp;
    // solhint-disable-next-line not-rely-on-time
    periodFinish = block.timestamp.add(rewardsDuration);

    // Dispatch event
    emit RewardAdded(reward);
  }

  /**
   * @dev Added to support recovering LP Rewards from other systems to be
   * distributed to holders
   */
  function recoverERC20(
    address recipient,
    address tokenAddress,
    uint256 tokenAmount
  ) external onlyController {
    // Call ancestor
    _recoverERC20(recipient, tokenAddress, tokenAmount);
  }

  function setRewardsDuration(uint256 _rewardsDuration)
    external
    override
    onlyController
  {
    // Validate state
    require(
      // solhint-disable-next-line not-rely-on-time
      periodFinish == 0 || block.timestamp > periodFinish,
      'Reward period not finished'
    );

    // Update state
    rewardsDuration = _rewardsDuration;

    // Dispatch event
    emit RewardsDurationUpdated(rewardsDuration);
  }

  function _totalSupply() private view returns (uint256 ts) {
    ts = 0;
    for (uint256 i = 0; i < slotWeights.length; ++i)
      ts += _totalSupplys[i] * slotWeights[i];
    ts /= 1E18;
  }

  function _balance(address account) private view returns (uint256 balance) {
    balance = 0;
    mapping(uint256 => uint256) storage balances = _balances[account];

    for (uint256 i = 0; i < slotWeights.length; ++i)
      balance += balances[i] * slotWeights[i];
    balance /= 1e18;
  }
}
