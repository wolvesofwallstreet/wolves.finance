pragma solidity ^0.6.12;

interface AaveToken {
    function underlyingAssetAddress() external view returns (address);
}
