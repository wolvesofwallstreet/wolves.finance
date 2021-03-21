/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

import 'contracts/src/investment/interfaces/IRewardHandler.sol';
import 'contracts/src/token/interfaces/IERC20WowsMintable.sol';
import 'contracts/src/utils/AddressBook.sol';
import 'contracts/src/utils/interfaces/IAddressRegistry.sol';

contract RewardHandler is AccessControl, IRewardHandler {
  using SafeMath for uint256;

  bytes32 public constant REWARD_ROLE = 'reward_role';

  // The fee is distributed to 4 channels:
  // 0.15 team
  uint32 private constant FEE_TO_TEAM = 15 * 1e4;
  // 0.15 marketing
  uint32 private constant FEE_TO_MARKETING = 15 * 1e4;
  // 0.4 booster
  uint32 private constant FEE_TO_BOOSTER = 4 * 1e5;
  // 0.3 back to reward pool
  uint32 private constant FEE_TO_REWARDPOOL = 3 * 1e5;
  // Minimal mint amount
  uint256 private _minimalMintAmount = 100 * 1e18;

  IAddressRegistry private immutable _addressRegistry;
  uint256 private _distributeAmount;

  constructor(IAddressRegistry addressRegistry) {
    _addressRegistry = addressRegistry;
    address marketingWallet =
      addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);
    _setupRole(DEFAULT_ADMIN_ROLE, marketingWallet);
  }

  /**
   * @dev Set the minimal mint amount to save mint calls.
   */
  function setMinimalMintAmount(uint256 newAmount) external {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), 'Only admins');
    _minimalMintAmount = newAmount;
  }

  /**
   * @dev Distribute _distributeAmount to internal targets
   */
  function distributeAll() external {
    _distribute();
  }

  /**
   * @dev Distribute _distributeAmount to internal targets,
   * transfer all WOWS to the new reward handler and destroy this contract
   */
  function terminate(address newRewardHandler, bool destroy) external {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), 'Only admins');
    // Distribute remaining fees
    IERC20WowsMintable rewardToken = _distribute();
    // Transfer WOWS to the nre rewardHandler
    rewardToken.transfer(
      newRewardHandler,
      rewardToken.balanceOf(address(this))
    );
    // Destroy contract
    if (destroy) selfdestruct(payable(address(this)));
  }

  /* ================ IRewardHandler ================= */

  /**
   * @dev See {IRewardHandler-distribute2}
   *
   */
  function distribute2(
    address recipient,
    uint256 amount,
    uint32 fee
  ) public override {
    require(hasRole(REWARD_ROLE, msg.sender), 'Only rewarders');

    if (amount == 0) return;

    IERC20WowsMintable rewardToken =
      IERC20WowsMintable(
        _addressRegistry.getRegistryEntry(AddressBook.WOWS_TOKEN)
      );

    // Calculate absolute fee
    uint256 absFee = amount.mul(fee).div(1e6);

    // Amount send to recipient
    uint256 recipientAmount = amount.sub(absFee);

    // Accumulate fee which has to be distributed
    _distributeAmount = _distributeAmount.add(absFee);

    if (recipientAmount > 0) {
      // Check how much we have to mint
      uint256 balance = rewardToken.balanceOf(address(this));
      if (balance < recipientAmount) {
        uint256 mintAmount =
          recipientAmount > _minimalMintAmount
            ? recipientAmount
            : _minimalMintAmount;
        rewardToken.mint(address(this), mintAmount);
      }
      // Now send rewards to the user
      rewardToken.transfer(recipient, recipientAmount);
    }
  }

  /**
   * @dev See {IRewardHandler-distribute}
   */
  function distribute(
    address recipient,
    uint256 amount,
    uint32 fee,
    uint32,
    uint32,
    uint32,
    uint32
  ) external override {
    distribute2(recipient, amount, fee);
  }

  /************ INTERNAL ************/

  /**
   * @dev distributes the accumulated fees
   *
   * @return returns the WOWS token
   */
  function _distribute() internal returns (IERC20WowsMintable) {
    require(_distributeAmount > 0, 'nothing to distribute');

    IERC20WowsMintable rewardToken =
      IERC20WowsMintable(
        _addressRegistry.getRegistryEntry(AddressBook.WOWS_TOKEN)
      );

    // Check how much / if we have to mint
    uint256 balance = rewardToken.balanceOf(address(this));
    if (balance < _distributeAmount)
      rewardToken.mint(address(this), _distributeAmount.sub(balance));

    address marketingWallet =
      _addressRegistry.getRegistryEntry(AddressBook.MARKETING_WALLET);
    address teamWallet =
      _addressRegistry.getRegistryEntry(AddressBook.TEAM_WALLET);
    address booster =
      _addressRegistry.getRegistryEntry(AddressBook.WOWS_BOOSTER);

    uint256 distributeAmount = _distributeAmount;
    _distributeAmount = 0;

    // Distribute the fee
    rewardToken.transfer(
      teamWallet,
      distributeAmount.mul(FEE_TO_TEAM).div(1e6)
    );
    rewardToken.transfer(
      marketingWallet,
      distributeAmount.mul(FEE_TO_MARKETING).div(1e6)
    );
    rewardToken.transfer(
      booster,
      distributeAmount.mul(FEE_TO_BOOSTER).div(1e6)
    );
    return rewardToken;
  }
}
