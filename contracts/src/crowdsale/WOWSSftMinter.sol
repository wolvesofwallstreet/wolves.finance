/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import '../investment/interfaces/IRewardHandler.sol';
import '../token/interfaces/IERC1155Cryptofolio.sol';
import '../token/interfaces/IERC1155Mintable.sol';

contract WOWSSftMinter is Ownable {
  using SafeERC20 for IERC20;

  // PricePerlevel, customLevel start at 0xFF
  mapping(uint16 => uint256) public _pricePerLevel;

  // The ERC1155 contract we are minting from
  IERC1155Cryptofolio private immutable _sftContract;

  // WOWS token contract
  IERC20 private immutable _wowsToken;

  // rewardhandler which distributes Wows
  IRewardHandler private immutable _rewardHandler;

  // The fee is distributed to 4 channels:
  // 0.15 team
  uint32 private constant FEE_TO_TEAM = 15 * 1e4;
  // 0.15 marketing
  uint32 private constant FEE_TO_MARKETING = 15 * 1e4;
  // 0.4 booster
  uint32 private constant FEE_TO_BOOSTER = 4 * 1e5;
  // 0.3 back to reward pool
  uint32 private constant FEE_TO_REWARDPOOL = 3 * 1e5;
  // 1.0 of the rewards go to distribution
  uint32 private constant ALL = 1 * 1e6;

  event Mint(address indexed recipient, uint256 tokenId, uint256 price);

  /* ======== CONSTRUCTOR ======== */

  /**
   * @dev contruct WOWSSftMinter
   * @param owner owner of this contract
   * @param rewardHandler handler which distributes
   * @param sftContract Cryptofolio SFT source
   */
  constructor(
    address owner,
    IERC20 wowsToken,
    IRewardHandler rewardHandler,
    IERC1155Cryptofolio sftContract
  ) {
    _sftContract = sftContract;
    _rewardHandler = rewardHandler;
    _wowsToken = wowsToken;
    transferOwnership(owner);
  }

  /* ======== STATE MODIFING ======== */

  /**
   * @dev Set prices for the given levels
   */
  function setPrices(uint16[] memory levels, uint256[] memory prices)
    external
    onlyOwner
  {
    require(levels.length == prices.length, 'Length mismatch');
    for (uint256 i = 0; i < levels.length; ++i)
      _pricePerLevel[levels[i]] = prices[i];
  }

  /**
   * @dev mint one of our stock card SFT's
   * approval of wows token required before the call
   */
  function mintWowsSFT(
    address recipient,
    uint8 level,
    uint8 cardId
  ) external {
    uint256 price = _pricePerLevel[level];
    require(price > 0, 'No price available');

    // get the next free mintable token for level / cardId
    (bool success, uint256 id) =
      _sftContract.getNextMintableTokenId(level, cardId);
    require(success, 'Unsufficient cards');

    _mint(recipient, id, price);
  }

  /**
   * @dev mint a custom token
   * approval of wows token required before the call
   */
  function mintCustomSFT(
    address recipient,
    uint8 level,
    string memory uri
  ) external {
    uint256 price = _pricePerLevel[0x100 + level];
    require(price > 0, 'No price available');

    // get the next free mintable token for level / cardId
    uint256 id = _sftContract.getNextMintableCustomToken();
    // set card level and uri
    _sftContract.setCustomCardLevel(id, level);
    _sftContract.setURI(id, uri);

    _mint(recipient, id, price);
  }

  /*============== GETTER ============= */

  /**
   * @dev query prices for given levels
   */
  function getPrices(uint16[] memory levels)
    external
    view
    returns (uint256[] memory)
  {
    uint256[] memory result = new uint256[](levels.length);
    for (uint256 i = 0; i < levels.length; ++i)
      result[i] = _pricePerLevel[levels[i]];
    return result;
  }

  /*============ INTERNAL ===============*/

  function _mint(
    address recipient,
    uint256 tokenId,
    uint256 price
  ) internal {
    // transfer WOWS from user to rewardhandler.
    _wowsToken.safeTransferFrom(msg.sender, address(_rewardHandler), price);

    // mint the token
    IERC1155Mintable(address(_sftContract)).mint(recipient, tokenId, 1, '');

    // distribute the rewards
    _rewardHandler.distribute(
      recipient,
      price,
      ALL,
      FEE_TO_TEAM,
      FEE_TO_MARKETING,
      FEE_TO_BOOSTER,
      FEE_TO_REWARDPOOL
    );

    emit Mint(recipient, tokenId, price);
  }
}
