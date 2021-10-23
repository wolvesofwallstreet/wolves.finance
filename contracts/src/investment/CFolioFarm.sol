/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.7.6;

import '../../0xerc1155/access/Ownable.sol';
import '../../0xerc1155/utils/SafeMath.sol';
import '../../0xerc1155/utils/SafeERC20.sol';

import '../utils/ERC20Recovery.sol';

import './interfaces/ICFolioFarm.sol';
import './interfaces/IController.sol';

/**
 * @notice Farm is owned by a CFolio contract.
 *
 * All state modifing calls are only allowed from this owner.
 */
contract CFolioFarm is ICFolioFarm, Ownable, ERC20Recovery {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  //////////////////////////////////////////////////////////////////////////////
  // State
  //////////////////////////////////////////////////////////////////////////////

  // Unique name of this farm instance, used in controller
  string private _farmName;

  uint256 public override periodFinish = 0;
  uint256 public override rewardsDuration = 14 days;
  uint256 public availableRewards;

  struct Slot {
    uint256 lastUpdateTime;
    uint256 rewardPerTokenStored;
    uint256 totalSupply;
    uint256 rewardRate;
    uint256 weight;
    mapping(address => uint256) userRewardPerTokenPaid;
    mapping(address => uint256) rewards;
    mapping(address => uint256) balances;
  }
  Slot[] public slots;

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

  modifier updateReward(address account, uint256 slotId) {
    _updateReward(account, slotId);
    _;
  }

  modifier verifySlotId(uint256 slotId) {
    require(slotId < slots.length, 'CFolioFarm: Invalid slotId');
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

    _newSlot(1E18);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Views
  //////////////////////////////////////////////////////////////////////////////

  function farmName() external view override returns (string memory) {
    return _farmName;
  }

  function totalSupply(uint256 slotId)
    external
    view
    override
    returns (uint256)
  {
    return slots[slotId].totalSupply;
  }

  function balanceOf(address account, uint256 slotId)
    external
    view
    override
    returns (uint256)
  {
    return slots[slotId].balances[account];
  }

  function balancesOf(address account)
    external
    view
    override
    returns (uint256[] memory result)
  {
    uint256 _slotCount = slots.length;
    result = new uint256[](_slotCount);
    for (uint256 slotId = 0; slotId < _slotCount; ++slotId)
      result[slotId] = slots[slotId].balances[account];
  }

  function lastTimeRewardApplicable() public view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp < periodFinish ? block.timestamp : periodFinish;
  }

  function rewardPerToken(uint256 slotId) public view returns (uint256) {
    Slot storage slot = slots[slotId];
    uint256 ts = slot.totalSupply;
    if (ts == 0) {
      return slot.rewardPerTokenStored;
    }

    return
      slot.rewardPerTokenStored.add(
        lastTimeRewardApplicable()
          .sub(slot.lastUpdateTime)
          .mul(slot.rewardRate)
          .mul(1e18)
          .div(ts)
      );
  }

  function earned(address account, uint256 slotId)
    public
    view
    returns (uint256)
  {
    Slot storage slot = slots[slotId];
    return
      slot
        .balances[account]
        .mul(rewardPerToken(slotId).sub(slot.userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(slot.rewards[account]);
  }

  function getRewardsForDuration(uint256 slotId)
    external
    view
    override
    returns (uint256)
  {
    return slots[slotId].rewardRate.mul(rewardsDuration);
  }

  function slotCount() external view override returns (uint256) {
    return slots.length;
  }

  function getShareAndEarned(address account, uint256 slotId)
    external
    view
    override
    returns (uint256 share_, uint256 earned_)
  {
    share_ = slots[slotId].balances[account];
    earned_ = earned(account, slotId);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Mutators
  //////////////////////////////////////////////////////////////////////////////

  function addAssets(
    address account,
    uint256 amount,
    uint256 slotId
  ) external override onlyOwner verifySlotId(slotId) {
    // Validate parameters
    require(amount > 0, 'CFolioFarm: Cannot add 0');
    require(!controller.paused(), 'CFolioFarm: Controller paused');

    Slot storage slot = slots[slotId];
    // Update state
    slot.balances[account] = slot.balances[account].add(amount);

    // Dispatch event
    emit AssetAdded(account, amount, slot.balances[account], slotId);
  }

  function removeAssets(
    address account,
    uint256 amount,
    uint256 slotId
  ) external override onlyOwner verifySlotId(slotId) {
    // Validate parameters
    require(amount > 0, 'CFolioFarm: Cannot remove 0');
    require(slotId < slots.length, 'CFolioFarm: Invalid slotId');

    Slot storage slot = slots[slotId];
    // Update state
    slot.balances[account] = slot.balances[account].sub(amount);

    // Dispatch event
    emit AssetRemoved(account, amount, slot.balances[account], slotId);
  }

  function addShares(
    address account,
    uint256 amount,
    uint256 slotId
  )
    external
    override
    onlyOwner
    verifySlotId(slotId)
    updateReward(account, slotId)
  {
    // Validate parameters
    require(amount > 0, 'CFolioFarm: Cannot add 0');
    require(!controller.paused(), 'CFolioFarm: Controller paused');

    Slot storage slot = slots[slotId];

    // Update state
    slot.totalSupply = slot.totalSupply.add(amount);
    slot.balances[account] = slot.balances[account].add(amount);

    // Notify controller
    controller.onDeposit(amount);

    // Dispatch event
    emit ShareAdded(account, amount, slotId);
  }

  function removeShares(
    address account,
    uint256 amount,
    uint256 slotId
  )
    public
    override
    onlyOwner
    verifySlotId(slotId)
    updateReward(account, slotId)
  {
    // Validate parameters
    require(amount > 0, 'CFolioFarm: Cannot remove 0');

    Slot storage slot = slots[slotId];

    // Update state
    slot.totalSupply = slot.totalSupply.sub(amount);
    slot.balances[account] = slot.balances[account].sub(amount);

    // Notify controller
    controller.onWithdraw(amount);

    // Dispatch event
    emit ShareRemoved(account, amount, slotId);
  }

  function getRewards(
    address account,
    address rewardRecipient,
    uint256 slotId
  ) public override onlyOwner updateReward(account, slotId) {
    _getRewards(account, rewardRecipient, slotId);
  }

  function getAllRewards(address account, address rewardRecipient)
    public
    override
    onlyOwner
  {
    for (uint256 slotId = 0; slotId < slots.length; ++slotId) {
      _updateReward(account, slotId);
      _getRewards(account, rewardRecipient, slotId);
    }
  }

  function weightSlot(uint256 slotId, uint256 weight)
    external
    override
    onlyController
  {
    // Validate parameters
    require(slotId <= slots.length, 'CFolioFarm: Invalid slotId');

    // Accumulate existing rates
    (uint256 rewardRate, uint256 weightSum) = _updateAllRewards();
    // Add / change Slot
    if (slotId == slots.length) {
      _newSlot(weight);
    } else {
      weightSum = weightSum.sub(slots[slotId].weight);
      slots[slotId].weight = weight;
    }
    weightSum = weightSum.add(weight);

    // Update new rewardRates
    for (uint256 i = 0; i < slots.length; ++i) {
      slots[i].rewardRate = rewardRate.mul(slots[i].weight).div(weightSum);
    }

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

  function notifyRewardAmount(uint256 reward) external override onlyController {
    (uint256 rewardRate, uint256 weightSum) = _updateAllRewards();
    // solhint-disable-next-line not-rely-on-time
    uint256 ts = block.timestamp;
    // Update state
    if (ts >= periodFinish) {
      rewardRate = reward.div(rewardsDuration);
    } else {
      uint256 remaining = periodFinish.sub(ts);
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
    for (uint256 i = 0; i < slots.length; ++i) {
      slots[i].lastUpdateTime = ts;
      slots[i].rewardRate = rewardRate.mul(slots[i].weight).div(weightSum);
    }

    periodFinish = ts.add(rewardsDuration);

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

  function _updateReward(address account, uint256 slotId) private {
    Slot storage slot = slots[slotId];
    slot.rewardPerTokenStored = rewardPerToken(slotId);
    slot.lastUpdateTime = lastTimeRewardApplicable();

    if (account != address(0)) {
      slot.rewards[account] = earned(account, slotId);
      slot.userRewardPerTokenPaid[account] = slot.rewardPerTokenStored;
    }
  }

  function _updateAllRewards()
    private
    returns (uint256 rewardRate, uint256 weightSum)
  {
    // Accumulate existing rates
    for (uint256 i = 0; i < slots.length; ++i) {
      _updateReward(address(0), i);
      rewardRate = rewardRate.add(slots[i].rewardRate);
      weightSum = weightSum.add(slots[i].weight);
    }
  }

  function _newSlot(uint256 weight) private {
    slots.push();
    slots[slots.length - 1].weight = weight;
  }

  function _getRewards(
    address account,
    address rewardRecipient,
    uint256 slotId
  ) private {
    // Load state
    uint256 reward = slots[slotId].rewards[account];

    if (reward > 0) {
      // Update state
      slots[slotId].rewards[account] = 0;
      availableRewards = availableRewards.sub(reward);

      // Notify controller
      controller.payOutRewards(rewardRecipient, reward);

      // Dispatch event
      emit RewardPaid(account, rewardRecipient, reward);
    }
  }
}
