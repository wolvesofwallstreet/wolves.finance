// SPDX-License-Identifier: GPL-3.0
// mainnet: 0x4e3710E498b445F65FA7538B83c434E5bA7bA75C
// rinkeby: 0xe04312eeAC7E895B5AEA78b8dEB657cfa3A28ABD

pragma solidity >=0.7.0 <0.8.0;

interface NFTSimple {
  function burn(
    address,
    uint256 tid,
    uint256 val
  ) external;

  function safeTransferFrom(
    address _from,
    address _to,
    uint256 _id,
    uint256 _amount,
    bytes calldata _data
  ) external;
}

contract NftUtility {
  function burnFakeNft(
    address nftContract,
    uint256[] calldata tokenIds,
    uint256[] calldata counts
  ) external {
    require(tokenIds.length == counts.length, 'Length mismatch');
    for (uint256 i = 0; i < tokenIds.length; ++i)
      NFTSimple(nftContract).burn(msg.sender, tokenIds[i], counts[i]);
  }

  function transfer(
    address nftContract,
    uint256[] calldata tokenIds,
    address[] calldata accounts
  ) external {
    require(tokenIds.length == accounts.length, 'Length mismatch');
    for (uint256 i = 0; i < tokenIds.length; ++i)
      NFTSimple(nftContract).safeTransferFrom(
        msg.sender,
        accounts[i],
        tokenIds[i],
        1,
        ''
      );
  }
}
