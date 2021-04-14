// SPDX-License-Identifier: GPL-3.0
// mainnet: 0x07F7feC65374a6c675a32C78D95249D62927ffCe

pragma solidity >=0.7.0 <0.8.0;

interface NFTBurn {
  function burn(
    address,
    uint256 tid,
    uint256 val
  ) external;
}

contract BurnFakeNft {
  function burn(
    address nftContract,
    uint256[] memory tokenIds,
    uint256[] memory counts
  ) external {
    for (uint256 i = 0; i < tokenIds.length; ++i)
      NFTBurn(nftContract).burn(msg.sender, tokenIds[i], counts[i]);
  }
}
