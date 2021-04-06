/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/proxy/UpgradeableProxy.sol';

import '../utils/AddressBook.sol';
import '../utils/interfaces/IAddressRegistry.sol';

contract TradeFloorProxy is UpgradeableProxy {
  /**
   * @dev Storage slot with the admin of the contract.
   * This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1, and is
   * validated in the constructor.
   */
  bytes32 private constant _REGISTRY_SLOT =
    0xcdd043ceca57fbb0bae6ee2e6e291af7addb66a9abb044fed45e71adcc247c1c;

  /**
   * @dev Emitted when the admin account has changed.
   */
  event AdminChanged(address previousAdmin, address newAdmin);

  /**
   * @dev Modifier used internally that will delegate the call to the implementation unless the sender is the admin.
   */
  modifier ifAdmin() {
    if (
      msg.sender ==
      IAddressRegistry(_addressRegistry()).getRegistryEntry(
        AddressBook.MARKETING_WALLET
      )
    ) {
      _;
    } else {
      _fallback();
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Initialization
  //////////////////////////////////////////////////////////////////////////////

  constructor(
    address addressRegistry_,
    address _logic,
    bytes memory _data
  ) UpgradeableProxy(_logic, _data) {
    assert(
      _REGISTRY_SLOT ==
        bytes32(uint256(keccak256('eip1967.proxy.registry')) - 1)
    );
    _setAddressRegistry(addressRegistry_);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Implementation
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Returns the current implementation.
   *
   * NOTE: Only the admin can call this function.
   */
  function implementation() external ifAdmin returns (address implementation_) {
    implementation_ = _implementation();
  }

  /**
   * @dev Upgrade the implementation of the proxy.
   *
   * NOTE: Only the admin can call this function.
   */
  function upgradeTo(address newImplementation) external virtual ifAdmin {
    _upgradeTo(newImplementation);
  }

  /**
   * @dev Upgrade the implementation of the proxy, and then call a function from the new implementation as specified
   * by `data`, which should be an encoded function call. This is useful to initialize new storage variables in the
   * proxied contract.
   *
   * NOTE: Only the admin can call this function.
   */
  function upgradeToAndCall(address newImplementation, bytes calldata data)
    external
    payable
    virtual
    ifAdmin
  {
    _upgradeTo(newImplementation);
    Address.functionDelegateCall(newImplementation, data);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Internal
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @dev Returns the current admin.
   */
  function _addressRegistry() internal view virtual returns (address reg) {
    bytes32 slot = _REGISTRY_SLOT;
    // solhint-disable-next-line no-inline-assembly
    assembly {
      reg := sload(slot)
    }
  }

  /**
   * @dev Stores a new address in the EIP1967 admin slot.
   */
  function _setAddressRegistry(address reg) private {
    bytes32 slot = _REGISTRY_SLOT;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      sstore(slot, reg)
    }
  }
}
