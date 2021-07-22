/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/math/SafeMath.sol';

import '../access/TestTetherOwnable.sol';

import './TestTetherIERC20.sol';

/*
 * Tether is not fully consistent with OZ's IERC20 interface. Therefore, we
 * can't derive from OZ's {ERC20} contract, and need a basic implementation
 * that matches mainnet behavior (0xdac17f958d2ee523a2206206994597c13d831ec7).
 *
 * This file contains three contracts:
 *
 *   - {TestBasicToken} - derived from {BasicToken} of the mainnet contract
 *   - {TestStandardToken} - derived from {StandardToken} of the mainnet contract
 *   - {TestTetherToken} - derived from {TetherToken} of the mainnet contract
 *
 * To create the contracts below, the code of Tether's three contracts was
 * imported unmodified. Then, the following transformations were performed:
 *
 *   - Mechanical removal of {Ownable} functionality
 *   - Mechanical removal of {Pausable} functionality
 *   - Mechanical removal of {Blacklist} functionality
 *   - Mechanical removal of {UpgradedStandardToken} functionality
 *   - Mechanical removal of {TetherToken-deprecated} functionality
 *   - Modernization to compile with Solidity >= 0.7.0
 *   - Addition of `solhint-disable-next-line reason-string` comments
 *   - Automated formatting with prettier-plugin-solidity
 *
 * Ref: https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7#code
 *
 * FOR TESTING ONLY.
 */

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
abstract contract TestBasicToken is TestTetherOwnable, TestTetherIERC20 {
  using SafeMath for uint256;

  mapping(address => uint256) public balances;

  // additional variables for use if transaction fees ever became necessary
  uint256 public basisPointsRate = 0;
  uint256 public maximumFee = 0;

  /**
   * @dev Fix for the ERC20 short address attack.
   */
  modifier onlyPayloadSize(uint256 size) {
    // solhint-disable-next-line reason-string
    require(!(msg.data.length < size + 4));
    _;
  }

  /**
   * @dev transfer token for a specified address
   * @param _to The address to transfer to.
   * @param _value The amount to be transferred.
   */
  function transfer(address _to, uint256 _value)
    public
    override
    onlyPayloadSize(2 * 32)
  {
    uint256 fee = (_value.mul(basisPointsRate)).div(10000);
    if (fee > maximumFee) {
      fee = maximumFee;
    }
    uint256 sendAmount = _value.sub(fee);
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(sendAmount);
    if (fee > 0) {
      balances[owner] = balances[owner].add(fee);
      Transfer(msg.sender, owner, fee);
    }
    Transfer(msg.sender, _to, sendAmount);
  }

  /**
   * @dev Gets the balance of the specified address.
   * @param _owner The address to query the the balance of.
   * @return balance An uint representing the amount owned by the passed address.
   */
  function balanceOf(address _owner)
    public
    view
    override
    returns (uint256 balance)
  {
    return balances[_owner];
  }
}

/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based oncode by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
abstract contract TestStandardToken is TestBasicToken {
  using SafeMath for uint256;

  mapping(address => mapping(address => uint256)) public allowed;

  uint256 public constant MAX_UINT = 2**256 - 1;

  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint the amount of tokens to be transferred
   */
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  ) public override onlyPayloadSize(3 * 32) {
    uint256 _allowance = allowed[_from][msg.sender];

    // Check is not needed because sub(_allowance, _value) will already throw if this condition is not met
    // if (_value > _allowance) throw;

    uint256 fee = (_value.mul(basisPointsRate)).div(10000);
    if (fee > maximumFee) {
      fee = maximumFee;
    }
    if (_allowance < MAX_UINT) {
      allowed[_from][msg.sender] = _allowance.sub(_value);
    }
    uint256 sendAmount = _value.sub(fee);
    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(sendAmount);
    if (fee > 0) {
      balances[owner] = balances[owner].add(fee);
      Transfer(_from, owner, fee);
    }
    Transfer(_from, _to, sendAmount);
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value)
    public
    override
    onlyPayloadSize(2 * 32)
  {
    // To change the approve amount you first have to reduce the addresses`
    //  allowance to zero by calling `approve(_spender, 0)` if it is not
    //  already 0 to mitigate the race condition described here:
    //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    // solhint-disable-next-line reason-string
    require(!((_value != 0) && (allowed[msg.sender][_spender] != 0)));

    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
  }

  /**
   * @dev Function to check the amount of tokens than an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return remaining A uint specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner, address _spender)
    public
    view
    override
    returns (uint256 remaining)
  {
    return allowed[_owner][_spender];
  }
}

contract TestTetherToken is TestStandardToken {
  string public name;
  string public symbol;
  uint256 public decimals;
  address public upgradedAddress;

  //  The contract can be initialized with a number of tokens
  //  All the tokens are deposited to the owner address
  //
  // @param _balance Initial supply of the contract
  // @param _name Token Name
  // @param _symbol Token symbol
  // @param _decimals Token decimals
  constructor(
    uint256 _initialSupply,
    string memory _name,
    string memory _symbol,
    uint256 _decimals
  ) {
    _totalSupply = _initialSupply;
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    balances[owner] = _initialSupply;
  }

  function totalSupply() public view override returns (uint256) {
    return _totalSupply;
  }

  // Issue a new amount of tokens
  // these tokens are deposited into the owner address
  //
  // @param _amount Number of tokens to be issued
  function issue(uint256 amount) public {
    // solhint-disable-next-line reason-string
    require(_totalSupply + amount > _totalSupply);
    // solhint-disable-next-line reason-string
    require(balances[owner] + amount > balances[owner]);

    balances[owner] += amount;
    _totalSupply += amount;
    Issue(amount);
  }

  // Called when new token are issued
  event Issue(uint256 amount);
}
