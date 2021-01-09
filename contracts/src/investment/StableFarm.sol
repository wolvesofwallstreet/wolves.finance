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

import './interfaces/IController.sol';
import './interfaces/IFarm.sol';
import './interfaces/IStrategy.sol';

contract StableCoinFarm is IFarm, ERC20, Ownable {
  using SafeERC20 for IERC20;
  using Address for address;
  using SafeMath for uint256;

  bool paused = false; // pause deposit / withdraw
  uint256 immutable to18;

  address[] strategies;
  address public currentStrategy;
  address public immutable assetToken;

  struct UserData {
    uint256 depositStartBlock;
    uint256 tokensEarned;
    uint256 investedAsset;
  }
  mapping(address => UserData) userData;
  uint256 public marketingRate = 500000000000000000; //50% marketing
  uint256 public investedAsset = 0;
  uint256 public drainedMarketingFee = 0;
  address controllerAddress;

  event Invest(address token, uint256 amountIn, uint256 amountOut);
  event Redeem(address token, uint256 amountIn, uint256 amountOut);

  constructor(
    string memory name,
    string memory symbol,
    uint8 decimals,
    address token
  ) ERC20(name, symbol) {
    _setupDecimals(decimals);
    to18 = uint256(10)**(18 - decimals);
    assetToken = token;
  }

  // To receive ETH after converting it from USDC
  fallback() external payable {}

  receive() external payable {}

  function farmName() external view override returns (string memory) {
    return name();
  }

  function withdrawAll() external onlyOwner {
    // ASSETS
    if (currentStrategy != address(0)) {
      _redeem(IStrategy(currentStrategy).balanceOf(assetToken, address(this)));
      // tranfer all of them back to holders (/*todo*/)
      IERC20(assetToken).transfer(
        msg.sender,
        IERC20(assetToken).balanceOf(address(this))
      );
    }
    // ETH
    address payable payableOwner = payable(owner());
    payableOwner.transfer(address(this).balance);
  }

  function deposit(uint256 _amount) external {
    require(_amount > 0, 'deposit must be greater than 0');
    require(!paused, 'operations paused');

    // Update exchangerate
    IStrategy(currentStrategy).refresh(assetToken);

    // first lock token rewards
    _lockEarnedTokens(msg.sender);

    (uint256 assetAmount, ) = _getAssetAmount();
    uint256 shares =
      totalSupply() > 0
        ? (_amount.mul(totalSupply())).div(assetAmount)
        : _amount; //y
    _mint(msg.sender, shares);

    UserData storage data = userData[msg.sender];
    data.investedAsset = data.investedAsset.add(_amount);
    investedAsset = investedAsset.add(_amount);

    // Transfer asset from user to this contract
    IERC20(assetToken).safeTransferFrom(msg.sender, address(this), _amount);
    // Invest using delegate
    _invest(_amount);
  }

  function withdraw(uint256 _shares) external {
    require(_shares > 0, 'shares == 0');
    require(_shares <= balanceOf(msg.sender), 'shares > balance');
    require(!paused, 'operations paused');

    // Update exchangerate
    IStrategy(currentStrategy).refresh(assetToken);

    // first lock token rewards
    _lockEarnedTokens(msg.sender);

    (uint256 assetAmount, uint256 fee) = _getAssetAmount();
    // Amount we pay back to the user
    uint256 withdrawAsset = (assetAmount.mul(_shares)).div(totalSupply());

    // apply changes to investment
    UserData storage data = userData[msg.sender];
    uint256 withdrawInvestedAsset =
      (data.investedAsset.mul(_shares)).div(balanceOf(msg.sender));
    data.investedAsset = data.investedAsset.sub(withdrawInvestedAsset);
    investedAsset = investedAsset.sub(withdrawInvestedAsset);

    // How much has he earned
    uint256 earned = withdrawAsset.sub(withdrawInvestedAsset);

    // fee which has to be retrieved respecting already drained fees
    uint256 ourFee =
      (earned.mul(marketingRate)).div((uint256(1e18).sub(marketingRate)));
    if (drainedMarketingFee > 0)
      ourFee = ourFee.sub((ourFee.mul(drainedMarketingFee)).div(fee));

    log3(
      bytes32(fee),
      bytes32(drainedMarketingFee),
      bytes32(earned),
      bytes32(ourFee)
    );

    // Transform into tokens
    uint256 poolTokenAmount =
      IStrategy(currentStrategy).balanceOf(assetToken, address(this));
    uint256 poolAmount =
      ((withdrawAsset.add(ourFee)).mul(poolTokenAmount)).div(
        IStrategy(currentStrategy).getAssetAmount(assetToken, address(this))
      );
    if (poolAmount > poolTokenAmount) poolAmount = poolTokenAmount;

    _burn(msg.sender, _shares);

    assetAmount = _redeem(poolAmount);

    if (withdrawAsset > assetAmount) withdrawAsset = assetAmount;

    // Send assets back to sender
    IERC20(assetToken).safeTransfer(msg.sender, withdrawAsset);
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override {
    // no action required for internal _mint and _burn
    if (from == address(0) || to == address(0)) return;

    //calculate the amount of invested asset which is transfered
    UserData storage fromData = userData[from];
    UserData storage toData = userData[to];

    uint256 transferInvestedAsset =
      (fromData.investedAsset.mul(amount)).div(balanceOf(from));

    _lockEarnedTokens(from);
    _lockEarnedTokens(to);

    toData.investedAsset.add(transferInvestedAsset);
    fromData.investedAsset.sub(transferInvestedAsset);
  }

  function setMarketingRate(uint256 _marketingRate) external onlyOwner {
    marketingRate = _marketingRate;
  }

  function setControllerAddress(address _controllerAddress) external onlyOwner {
    controllerAddress = _controllerAddress;
  }

  function setPause(bool _pause) external onlyOwner {
    paused = _pause;
  }

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
      strategy.delegatecall(
        abi.encodeWithSelector(IStrategy(strategy).approve.selector, assetToken)
      );
    require(success, 'Approve failed');
    result;

    if (strategies.length == 1) {
      currentStrategy = strategy;
      // invest all assets
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

    require(strategies.length > numInserted);
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

  function requestMarketingFee() external override {
    require(msg.sender == controllerAddress, 'controller only');
    uint256 fee =
      getRequestableMarketingFee().sub(
        IERC20(assetToken).balanceOf(address(this))
      );

    if (fee == 0) return;

    // Convert fee (assetToken) in poolTokens
    uint256 poolTokenAmount =
      IStrategy(currentStrategy).balanceOf(assetToken, address(this));
    uint256 poolAmount =
      (fee.mul(poolTokenAmount)).div(
        IStrategy(currentStrategy).getAssetAmount(assetToken, address(this))
      );
    if (poolAmount > poolTokenAmount) poolAmount = poolTokenAmount;

    drainedMarketingFee.add(_redeem(poolAmount));
  }

  function rebalance() external override {
    require(msg.sender == controllerAddress, 'controller only');
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
    (uint256 amount, ) = _getAssetAmount();
    return (
      balanceOf(_user),
      totalSupply() > 0
        ? (amount.mul(balanceOf(msg.sender))).div(totalSupply())
        : 0,
      _getTokensEarned(_user),
      getApr(),
      amount
    );
  }

  function getUserData(address _user)
    external
    view
    returns (
      uint256 assetIn,
      uint256 blockStart,
      uint256 tokensEarned
    )
  {
    UserData storage data = userData[_user];
    return (data.investedAsset, data.depositStartBlock, data.tokensEarned);
  }

  function getApr() public view returns (uint256) {
    return IStrategy(currentStrategy).getApr(assetToken);
  }

  // return total requestable marketing fee
  function getRequestableMarketingFee() public view returns (uint256) {
    (, uint256 fee) = _getAssetAmount();
    return
      fee.sub(drainedMarketingFee).add(
        IERC20(assetToken).balanceOf(address(this))
      );
  }

  function _getTokensEarned(address _user) public view returns (uint256) {
    UserData storage data = userData[_user];
    return
      data.depositStartBlock > 0 && totalSupply() > 0
        ? data.tokensEarned.add(
          IController(controllerAddress).calculateTokensEarned(
            data.investedAsset.mul(to18),
            (balanceOf(msg.sender).mul(1e18)).div(totalSupply()),
            data.depositStartBlock
          )
        )
        : 0;
  }

  // called on deposit / withdraw time
  function _lockEarnedTokens(address user) private {
    UserData storage data = userData[user];
    if (data.depositStartBlock > 0 && totalSupply() > 0) {
      uint256 tokensEarned =
        IController(controllerAddress).calculateTokensEarned(
          data.investedAsset.mul(to18),
          (balanceOf(user).mul(1e18)).div(totalSupply()),
          data.depositStartBlock
        );
      data.tokensEarned = data.tokensEarned.add(tokensEarned);
      IController(controllerAddress).lockEarnedTokens(tokensEarned);
    }
    data.depositStartBlock = block.number;
  }

  // Total Asset amount, reduced by our fee
  function _getAssetAmount() public view returns (uint256 amount, uint256 fee) {
    uint256 assetAmount =
      IStrategy(currentStrategy).getAssetAmount(assetToken, address(this)).add(
        drainedMarketingFee
      );
    // Fix muldiv inaccuraties
    assetAmount = assetAmount > investedAsset ? assetAmount : investedAsset;
    uint256 _fee =
      (assetAmount.sub(investedAsset).mul(marketingRate)).div(1e18);
    return (assetAmount.sub(_fee), _fee);
  }

  function _invest(uint256 assetAmount) private returns (uint256) {
    if (assetAmount > 0) {
      (bool success, bytes memory result) =
        currentStrategy.delegatecall(
          abi.encodeWithSelector(
            IStrategy(currentStrategy).invest.selector,
            assetToken,
            assetAmount
          )
        );
      require(success, 'Invest failed');
      uint256 poolAmount = abi.decode(result, (uint256));
      emit Invest(currentStrategy, assetAmount, poolAmount);
      return poolAmount;
    }
    return 0;
  }

  function _redeem(uint256 poolAmount) private returns (uint256) {
    if (poolAmount > 0) {
      (bool success, bytes memory result) =
        currentStrategy.delegatecall(
          abi.encodeWithSelector(
            IStrategy(currentStrategy).redeem.selector,
            assetToken,
            poolAmount
          )
        );
      require(success, 'Redeem failed');
      uint256 assetAmount = abi.decode(result, (uint256));
      emit Redeem(currentStrategy, poolAmount, assetAmount);
      return assetAmount;
    }
    return 0;
  }
}
