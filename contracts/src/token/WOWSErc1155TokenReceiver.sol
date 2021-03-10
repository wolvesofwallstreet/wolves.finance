/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import './interfaces/IERC1155Cryptofolio.sol';

contract WOWSErc1155TokenReceiver {
  IERC1155Cryptofolio private _deployer;

  constructor() {
    _deployer = IERC1155Cryptofolio(msg.sender);
  }

  function onERC1155Received(
    address operator,
    address,
    uint256 id,
    uint256 amount,
    bytes memory
  ) external returns (bytes4) {
    uint256[] memory ids = new uint256[](1);
    ids[0] = id;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = amount;
    _deployer.onTokensReceived(operator, ids, amounts);
    return this.onERC1155Received.selector;
  }

  function onERC1155BatchReceived(
    address operator,
    address,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory
  ) external returns (bytes4) {
    _deployer.onTokensReceived(operator, ids, amounts);
    return this.onERC1155BatchReceived.selector;
  }

  function setApproval(IERC1155 operator) external {
    operator.setApprovalForAll(address(operator), true);
  }
}
