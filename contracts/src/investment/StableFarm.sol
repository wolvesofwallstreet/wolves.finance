/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

import './interfaces/IController.sol';
import './interfaces/IFarm.sol';
import './interfaces/IStrategy.sol';

contract StableCoinFarm is IFarm, ERC20, Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;
  using Address for address;
  using SafeMath for uint256;

  /* ========== STATE VARIABLES ========== */

  uint256 public override periodFinish = 0;
  uint256 public rewardRate = 0;
  uint256 public rewardsDuration = 7 days;
  uint256 public lastUpdateTime;
  uint256 public rewardPerTokenStored;
  uint256 private availableRewards;

  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;

  uint256 private immutable to18;

  address[] public strategies;
  address public currentStrategy;
  address public immutable assetToken;

  IController public controller;

  /* ========== CONSTRUCTOR ========== */

  constructor(
    address _owner,
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    address _token,
    address _controller
  ) ERC20(_name, _symbol) {
    _setupDecimals(_decimals);
    to18 = uint256(10)**(18 - _decimals);
    assetToken = _token;
    controller = IController(_controller);
    transferOwnership(_owner);
  }

  /* ========== ERC20 overrides ========== */

  // To receive ETH after converting it from USDC
  // solhint-disable-next-line no-empty-blocks
  fallback() external payable {}

  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 /* amount*/
  ) internal override {
    // No action required for internal _mint() and _burn()
    if (from == address(0) || to == address(0)) return;

    _updateReward(from);
    _updateReward(to);
  }

  /* ========== VIEWS ========== */

  function farmName() external view override returns (string memory) {
    return name();
  }

  function lastTimeRewardApplicable() public view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp < periodFinish ? block.timestamp : periodFinish;
  }

  function rewardPerToken() public view returns (uint256) {
    if (totalSupply() == 0) {
      return rewardPerTokenStored;
    }
    return
      rewardPerTokenStored.add(
        lastTimeRewardApplicable()
          .sub(lastUpdateTime)
          .mul(rewardRate)
          .mul(1e18)
          .div(totalSupply())
      );
  }

  function earned(address account) public view returns (uint256) {
    return
      balanceOf(account)
        .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(rewards[account]);
  }

  function getRewardForDuration() external view returns (uint256) {
    return rewardRate.mul(rewardsDuration);
  }

  function getApr() public view returns (uint256) {
    return IStrategy(currentStrategy).getApr(assetToken);
  }

  function getUIData(address _user)
    external
    view
    returns (
      uint256 yAmount,
      uint256 assetAmount,
      uint256 tokensEarned,
      uint256 apr,
      uint256 tvl
    )
  {
    uint256 amount = _getAssetAmount();
    return (
      balanceOf(_user),
      totalSupply() > 0
        ? (amount.mul(balanceOf(msg.sender))).div(totalSupply())
        : 0,
      earned(_user),
      getApr(),
      amount
    );
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  function deposit(uint256 _amount)
    external
    nonReentrant
    updateReward(msg.sender)
  {
    require(_amount > 0, 'deposit must be greater than 0');

    /*(uint256 fee) = */
    controller.onDeposit(_amount);

    // Update exchangerate
    IStrategy(currentStrategy).refresh(assetToken);

    uint256 assetAmount = _getAssetAmount();
    uint256 shares =
      totalSupply() > 0
        ? (_amount.mul(totalSupply())).div(assetAmount)
        : _amount; //y
    _mint(msg.sender, shares);

    // Transfer asset from user to this contract
    IERC20(assetToken).safeTransferFrom(msg.sender, address(this), _amount);

    // Invest using delegate
    _invest(_amount);
  }

  function withdraw(uint256 _shares)
    public
    nonReentrant
    updateReward(msg.sender)
  {
    require(_shares > 0, 'shares == 0');
    require(_shares <= balanceOf(msg.sender), 'shares > balance');

    /*(uint256 fee) = */
    controller.onWithdraw(_shares);

    // Update exchangerate
    IStrategy(currentStrategy).refresh(assetToken);

    // Transform into tokens
    uint256 poolTokenAmount =
      IStrategy(currentStrategy).balanceOf(assetToken, address(this));
    uint256 poolAmount = (poolTokenAmount.mul(_shares)).div(totalSupply());

    _burn(msg.sender, _shares);

    uint256 assetAmount = _redeem(poolAmount);

    // Send assets back to sender
    IERC20(assetToken).safeTransfer(msg.sender, assetAmount);
  }

  function getReward() public nonReentrant updateReward(msg.sender) {
    uint256 reward = rewards[msg.sender];
    if (reward > 0) {
      rewards[msg.sender] = 0;
      availableRewards = availableRewards.sub(reward);
      controller.payOutRewards(msg.sender, reward);
      emit RewardPaid(msg.sender, reward);
    }
  }

  function exit() external {
    withdraw(balanceOf(msg.sender));
    getReward();
  }

  /* ========== RESTRICTED FUNCTIONS ========== */

  function setController(address newController)
    external
    override
    onlyController
  {
    controller = IController(newController);
    emit ControllerChanged(newController);
  }

  function notifyRewardAmount(uint256 reward)
    external
    override
    onlyController
    updateReward(address(0))
  {
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

    // solhint-disable-next-line not-rely-on-time
    lastUpdateTime = block.timestamp;
    // solhint-disable-next-line not-rely-on-time
    periodFinish = block.timestamp.add(rewardsDuration);

    emit RewardAdded(reward);
  }

  /**
   * @dev This function is added to support recovering LP Rewards from other
   * systems to be distributed to holders
   */
  function recoverERC20(address tokenAddress, uint256 tokenAmount)
    external
    onlyOwner
  {
    // Cannot recover the staking token or the rewards token
    require(tokenAddress != address(this), 'pool tokens not recoverable');
    IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    emit Recovered(tokenAddress, tokenAmount);
  }

  function setRewardsDuration(uint256 _rewardsDuration)
    external
    override
    onlyOwner
  {
    require(
      // solhint-disable-next-line not-rely-on-time
      periodFinish == 0 || block.timestamp > periodFinish,
      'reward period not finished'
    );
    rewardsDuration = _rewardsDuration;
    emit RewardsDurationUpdated(rewardsDuration);
  }

  /* ======= STRATEGIES ====== */

  function addStrategy(address strategy) external onlyOwner {
    bytes32 newId = IStrategy(strategy).getId();
    // Check if we simply replace / update
    for (uint256 i = 0; i < strategies.length; i++) {
      if (newId == IStrategy(strategies[i]).getId()) {
        if (currentStrategy == strategies[i]) currentStrategy = strategy;
        strategies[i] = strategy;
        return;
      }
    }

    strategies.push(strategy);

    // Approve: allow strategy to withdraw assetTokens owned by this
    (bool success, bytes memory result) =
      // solhint-disable-next-line avoid-low-level-calls
      strategy.delegatecall(
        abi.encodeWithSelector(IStrategy(strategy).approve.selector, assetToken)
      );
    require(success, 'Approve failed');
    result;

    if (strategies.length == 1) {
      currentStrategy = strategy;
      // Invest all assets
      _invest(IERC20(assetToken).balanceOf(address(this)));
    }
  }

  function removeStrategy(address strategy) external onlyOwner {
    // Find the strategy, fill gap.
    uint256 numInserted = 0;
    for (uint256 i = 0; i < strategies.length; i++) {
      if (strategy != strategies[i]) {
        if (numInserted != i) strategies[numInserted] = strategies[i];
        ++numInserted;
      }
    }

    require(strategies.length > numInserted, 'Inserted too many strategies');
    strategies.pop();

    if (strategy == currentStrategy) {
      _redeem(IStrategy(currentStrategy).balanceOf(assetToken, address(this)));
      if (strategies.length > 0) {
        currentStrategy = strategies[0];
        _invest(IERC20(assetToken).balanceOf(address(this)));
      } else {
        currentStrategy = address(0);
      }
    }
  }

  function rebalance() external override onlyController {
    uint256 maxApr = 0;
    address maxAprStrategy;
    for (uint256 i = 0; i < strategies.length; i++) {
      if (IStrategy(strategies[i]).getApr(assetToken) > maxApr) {
        maxApr = IStrategy(strategies[i]).getApr(assetToken);
        maxAprStrategy = strategies[i];
      }
    }
    if (maxAprStrategy != address(0) && maxAprStrategy != currentStrategy) {
      uint256 redeemed =
        _redeem(
          IStrategy(currentStrategy).balanceOf(assetToken, address(this))
        );
      currentStrategy = maxAprStrategy;
      _invest(redeemed);
    }
  }

  function withdrawAll() external onlyOwner {
    // ASSETS
    if (currentStrategy != address(0)) {
      _redeem(IStrategy(currentStrategy).balanceOf(assetToken, address(this)));
      // Tranfer all of them back to holders (/*todo*/)
      IERC20(assetToken).transfer(
        msg.sender,
        IERC20(assetToken).balanceOf(address(this))
      );
    }

    // ETH
    address payable payableOwner = payable(owner());
    payableOwner.transfer(address(this).balance);
  }

  /* ========== INTERNAL FUNCTIONS ========== */

  // Total Asset amount, reduced by our fee
  function _getAssetAmount() public view returns (uint256) {
    uint256 assetAmount =
      IStrategy(currentStrategy).getAssetAmount(assetToken, address(this));
    return (assetAmount);
  }

  function _invest(uint256 assetAmount) private returns (uint256) {
    if (assetAmount > 0) {
      (bool success, bytes memory result) =
        // solhint-disable-next-line avoid-low-level-calls
        currentStrategy.delegatecall(
          abi.encodeWithSelector(
            IStrategy(currentStrategy).invest.selector,
            assetToken,
            assetAmount
          )
        );
      require(success, 'Invest failed');
      uint256 poolAmount = abi.decode(result, (uint256));
      emit Deposited(currentStrategy, assetAmount, poolAmount);
      return poolAmount;
    }
    return 0;
  }

  function _redeem(uint256 poolAmount) private returns (uint256) {
    if (poolAmount > 0) {
      (bool success, bytes memory result) =
        // solhint-disable-next-line avoid-low-level-calls
        currentStrategy.delegatecall(
          abi.encodeWithSelector(
            IStrategy(currentStrategy).redeem.selector,
            assetToken,
            poolAmount
          )
        );
      require(success, 'Redeem failed');
      uint256 assetAmount = abi.decode(result, (uint256));
      emit Withdrawn(currentStrategy, poolAmount, assetAmount);
      return assetAmount;
    }
    return 0;
  }

  function _updateReward(address account) internal {
    rewardPerTokenStored = rewardPerToken();
    lastUpdateTime = lastTimeRewardApplicable();
    if (account != address(0)) {
      rewards[account] = earned(account);
      userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }
  }

  /* ========== MODIFIERS ========== */

  modifier onlyController {
    require(_msgSender() == address(controller), 'not controller');
    _;
  }

  modifier updateReward(address account) {
    _updateReward(account);
    _;
  }

  /* ========== EVENTS ========== */

  event RewardAdded(uint256 reward);
  event Deposited(address indexed user, uint256 amountIn, uint256 amountOut);
  event Withdrawn(address indexed user, uint256 amountIn, uint256 amountOut);
  event RewardPaid(address indexed user, uint256 reward);
  event RewardsDurationUpdated(uint256 newDuration);
  event Recovered(address token, uint256 amount);
  event ControllerChanged(address newController);
}
