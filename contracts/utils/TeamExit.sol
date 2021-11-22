// SPDX-License-Identifier: GPL-3.0
// mainnet:

pragma solidity >=0.7.0 <0.8.0;

import '../0xerc1155/utils/SafeERC20.sol';

contract FarmRewards {
  using SafeERC20 for IERC20;

  address private admin_;
  IERC20 private token_;
  address private recipient_;
  uint256 public claimed;
  uint256 public startTime;
  bool public paused;

  constructor(
    address admin,
    address token,
    address recipient
  ) {
    admin_ = admin;
    token_ = IERC20(token);
    recipient_ = recipient;
    startTime = block.timestamp;
    paused = false;
  }

  function pause(bool _pause) external {
    require(msg.sender == admin_, 'Only admin');
    paused = _pause;
  }

  function get() external {
    require(!paused, 'Paused');
    require(msg.sender == recipient_, 'Only recipient');

    uint256 payOut = _calculate();
    require(payOut > claimed, 'Nothing to claim');

    uint256 toTransfer = payOut - claimed;

    claimed = payOut;

    token_.safeTransfer(recipient_, toTransfer);
  }

  function _calculate() private view returns (uint256 result) {
    result = 350;
    uint256 monthPassed = (block.timestamp - startTime) / (86400 * 30);
    if (monthPassed > 3) monthPassed = 3;
    if (monthPassed > 0) result += (200 + (monthPassed - 1) * 100);
    result = result * 1e18;
  }
}
