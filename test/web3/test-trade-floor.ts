/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */
/* eslint @typescript-eslint/no-unused-expressions: "off" */
/* eslint @typescript-eslint/no-unused-vars: "off" */

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { ethers } from 'ethers';
import fs from 'fs';

import UniswapV2ERC20Abi from '../../src/abi/contracts/depends/uniswap-v2-core/UniswapV2ERC20.sol/UniswapV2ERC20.json';
import TradeFloorClientLpAbi from '../../src/abi/contracts/src/cfolio/TradeFloorClientLP.sol/TradeFloorClientLP.json';
import PresaleAbi from '../../src/abi/contracts/src/crowdsale/Crowdsale.sol/Crowdsale.json';
import WOWSSftMinterAbi from '../../src/abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import TradeFloorProxyAbi from '../../src/abi/contracts/src/proxy/UpgradeProxy.sol/UpgradeProxy.json';
import TradeFloorAbi from '../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import WOWSCryptofolioAbi from '../../src/abi/contracts/src/token/WOWSCryptofolio.sol/WOWSCryptofolio.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import WOWSERC1155Abi from '../../src/abi/contracts/src/token/WOWSErc1155.sol/WOWSERC1155.json';
import { hardhat } from '../../src/web3/hardhat';

chai.use(solidity);

// Path to generated address registry file
const GENERATED_ADDRESSES = `${__dirname}/../../src/config/generated-addresses.json`;

// Helper function
function toWei(n: number, decimals = 18) {
  const parsed = typeof n === 'number' ? n.toFixed(decimals) : n;
  return ethers.utils.parseUnits(parsed, decimals);
}

// Addresses are lazy-loaded
let addresses = null;

// Utility function to get addresses from the address registry file
async function getAddresses() {
  if (addresses === null) {
    // Get chain ID
    const chainId = await hardhat.getChainId();

    // Load contract addresses
    const generatedNetworks = JSON.parse(
      fs.readFileSync(GENERATED_ADDRESSES).toString()
    );
    addresses = generatedNetworks[chainId] || {};
  }

  return addresses;
}

// Fixture setup
const setupTest = hardhat.deployments.createFixture(async ({ deployments }) => {
  // Ensure we start from a fresh deployment
  await deployments.fixture();

  // Get the Signers
  const [_, marketingWallet] = await hardhat.ethers.getSigners();

  // Get contract addresses
  const addresses = await getAddresses();

  // Construct the contracts
  const tokenContract = new ethers.Contract(
    addresses.token,
    WOWSTokenAbi,
    marketingWallet
  );
  const uniV2PairContract = new ethers.Contract(
    await tokenContract.uniV2Pair(),
    UniswapV2ERC20Abi,
    marketingWallet
  );
  const sftHolderContract = new ethers.Contract(
    addresses.sftHolder,
    WOWSERC1155Abi,
    marketingWallet
  );
  const sftMinterContract = new ethers.Contract(
    addresses.sftMinter,
    WOWSSftMinterAbi,
    marketingWallet
  );
  const tradeFloorContract = new ethers.Contract(
    addresses.tradeFloor,
    TradeFloorAbi,
    marketingWallet
  );
  const tradeFloorProxyContract = new ethers.Contract(
    addresses.tradeFloorProxy,
    TradeFloorProxyAbi,
    marketingWallet
  );
  const tradeFloorClientLP = new ethers.Contract(
    addresses.tradeFloorClientLP,
    TradeFloorClientLpAbi,
    marketingWallet
  );
  const presaleContract = new ethers.Contract(
    addresses.presale,
    PresaleAbi,
    marketingWallet
  );

  return {
    tokenContract,
    uniV2PairContract,
    sftHolderContract,
    sftMinterContract,
    tradeFloorContract,
    tradeFloorProxyContract,
    tradeFloorClientLP,
    presaleContract,
  };
});

describe('TradeFloorClientLP', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;
  let contracts: any;

  before(async function () {
    this.timeout(60 * 1000);

    // Get the Signers
    [signer, marketingWallet] = await hardhat.ethers.getSigners();

    // A single fixture is used for the test suite
    contracts = await setupTest();
  });

  it('should mint a WOWS SFT', async function () {
    this.timeout(60 * 1000);

    const { tokenContract, sftHolderContract, sftMinterContract } = contracts;

    // Test parameters
    const levelBoi = 1;
    const cardIdBoi = 2;
    const levelWolf = 5;
    const cardIdWolf = 2;
    const wowsTokenIdBoi = ethers.BigNumber.from('0x01020000');
    const wowsTokenIdWolf = ethers.BigNumber.from('0x05020000');
    const level1Price = '3000000000000000000';

    // Approve SFT minter spending WOWS
    let tx = tokenContract.approve(
      sftMinterContract.address,
      ethers.BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    await chai.expect(tx).to.not.be.reverted;

    // Mint the Bois WOWS SFT
    tx = sftMinterContract.mintWowsSFT(
      marketingWallet.address,
      levelBoi,
      cardIdBoi
    );
    await chai.expect(tx).to.emit(sftMinterContract, 'Mint').withArgs(
      marketingWallet.address, // Recipient
      wowsTokenIdBoi, // Token ID
      level1Price // Price
    );

    // Mint the Wolf WOWS SFT
    tx = sftMinterContract.mintWowsSFT(
      marketingWallet.address,
      levelWolf,
      cardIdWolf
    );
    await chai.expect(tx).to.emit(sftMinterContract, 'Mint').withArgs(
      marketingWallet.address, // Recipient
      wowsTokenIdWolf, // Token ID
      level1Price // Price
    );

    // Check the token's ownership (NFT balance is always 1)
    const balanceBoi = await sftHolderContract.balanceOf(
      marketingWallet.address,
      wowsTokenIdBoi
    );
    chai.expect(balanceBoi).to.equal(1);

    // Check the token's ownership (NFT balance is always 1)
    const balanceWolf = await sftHolderContract.balanceOf(
      marketingWallet.address,
      wowsTokenIdWolf
    );
    chai.expect(balanceWolf).to.equal(1);

    // Check the owner's token count
    const result = await sftHolderContract.getTokenIds(marketingWallet.address);
    chai.expect(result.length).to.equal(2);
    chai.expect(result[0]).to.equal(wowsTokenIdWolf);
    chai.expect(result[1]).to.equal(wowsTokenIdBoi);

    // Query the token ID in the SFT contract
    const [
      mintTimestampBoi,
      tokenLevelBoi,
    ] = await sftHolderContract.getTokenData(wowsTokenIdBoi);
    chai.expect(mintTimestampBoi).to.not.equal(0);
    chai.expect(tokenLevelBoi).to.equal(levelBoi);

    // Query the token ID in the SFT contract
    const [
      mintTimestampWolf,
      tokenLevelWolf,
    ] = await sftHolderContract.getTokenData(wowsTokenIdWolf);
    chai.expect(mintTimestampWolf).to.not.equal(0);
    chai.expect(tokenLevelWolf).to.equal(levelWolf);

    // Get the address of the clone contract
    const cryptofolioAddressBoi = await sftHolderContract.tokenIdToAddress(
      wowsTokenIdBoi
    );
    chai.expect(cryptofolioAddressBoi).to.be.properAddress;
    chai
      .expect(cryptofolioAddressBoi)
      .to.not.equal('0x0000000000000000000000000000000000000000');

    // Get the address of the clone contract
    const cryptofolioAddressWolf = await sftHolderContract.tokenIdToAddress(
      wowsTokenIdWolf
    );
    chai.expect(cryptofolioAddressWolf).to.be.properAddress;
    chai
      .expect(cryptofolioAddressBoi)
      .to.not.equal('0x0000000000000000000000000000000000000000');
  });

  it('should get LP tokens', async function () {
    this.timeout(60 * 1000);

    const { uniV2PairContract, presaleContract } = contracts;

    //
    // Get LP tokens for the marketing wallet
    //
    // Instead of a dedicated test contract to deposit and obtain LP tokens,
    // we just re-use the presale contract: open it, buy liquidity, finalize
    // it, and LP tokens will be transfered to the marketing wallet.
    //

    // Open the presale
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]); // 5 mins
    await hardhat.network.provider.send('evm_mine');
    chai.expect(await presaleContract.isOpen()).to.be.true;

    // Limit of 6.75 ETH
    const amount = 6.75;
    const options = { value: toWei(amount) };

    // Buy tokens and add liquidity
    let tx = presaleContract.buyTokensAddLiquidity(
      marketingWallet.address,
      options
    );
    await chai.expect(tx).to.emit(presaleContract, 'Staked').withArgs(
      marketingWallet.address, // Beneficiary
      ethers.BigNumber.from('29999999999999999000') // Liquidity - ~30 LP tokens
    );

    // Add 5 minutes and mine the next block to close the presale
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]);
    await hardhat.network.provider.send('evm_mine');
    chai.expect(await presaleContract.isOpen()).to.be.false;

    // Finalize the presale
    tx = presaleContract.finalizePresale();
    await chai.expect(tx).to.not.be.reverted;

    // Check wallet balance
    const lpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai
      .expect(lpBalance)
      .to.equal(ethers.BigNumber.from('12000000000000000000')); // 12 LP tokens
  });

  it('should stake an LP NFT in the cryptofolio', async function () {
    this.timeout(60 * 1000);

    const {
      uniV2PairContract,
      sftHolderContract,
      tradeFloorContract,
      tradeFloorProxyContract,
      tradeFloorClientLP,
    } = contracts;

    // Test parameters
    const wowsTokenId = ethers.BigNumber.from('0x05020000');
    const tradeFloorTokenId = ethers.BigNumber.from('0x10000000000000000');

    // Get the address of the clone contract
    const cryptofolioAddress = await sftHolderContract.tokenIdToAddress(
      wowsTokenId
    );
    chai.expect(cryptofolioAddress).to.be.properAddress;
    chai
      .expect(cryptofolioAddress)
      .to.not.equal('0x0000000000000000000000000000000000000000');

    // Get wallet balance
    const lpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );

    // Instantiate cryptofolio contract
    const cryptofolioContract = new ethers.Contract(
      cryptofolioAddress,
      WOWSCryptofolioAbi,
      marketingWallet
    );

    // Approve TFCLP to transfer our tokens
    let tx = await uniV2PairContract.approve(
      tradeFloorClientLP.address,
      lpBalance
    );
    await chai.expect(tx).to.emit(uniV2PairContract, 'Approval').withArgs(
      marketingWallet.address, // owner
      tradeFloorClientLP.address, // spender
      lpBalance // balance
    );

    // Deposit LP tokens
    tx = tradeFloorClientLP.deposit(
      cryptofolioAddress,
      tradeFloorTokenId,
      lpBalance
    );
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(marketingWallet.address, tradeFloorClientLP.address, lpBalance);
    await chai
      .expect(tx)
      .to.emit(cryptofolioContract, 'CryptoFolioAdded')
      .withArgs(
        cryptofolioAddress,
        tradeFloorProxyContract.address,
        [tradeFloorTokenId],
        [lpBalance]
      );
    await chai
      .expect(tx)
      .to.emit(tradeFloorClientLP, 'Deposit')
      .withArgs(marketingWallet.address, cryptofolioAddress, lpBalance, 0);

    // Check cryptofolio and the LP NFT should appear
    let [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenId);

    // Attach the proxy and set marketing wallet signer
    const tradeFloorProxyInstance = tradeFloorContract
      .attach(tradeFloorProxyContract.address)
      .connect(marketingWallet);

    // Burn half the NFT
    tx = tradeFloorProxyInstance.burn(
      cryptofolioAddress,
      tradeFloorTokenId,
      lpBalance.div(2)
    );
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(
        tradeFloorClientLP.address,
        marketingWallet.address,
        lpBalance.div(2)
      );

    // Check wallet balance
    let newLpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(newLpBalance).to.equal(lpBalance.div(2));

    // Check the cryptofolio again and verify it holds the NFT
    [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenId);

    // Burn *almost* the other half of the NFT
    tx = tradeFloorProxyInstance.burn(
      cryptofolioAddress,
      tradeFloorTokenId,
      lpBalance.div(2).sub(1)
    );
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(
        tradeFloorClientLP.address,
        marketingWallet.address,
        lpBalance.div(2).sub(1)
      );

    // Check wallet balance
    newLpBalance = await uniV2PairContract.balanceOf(marketingWallet.address);
    chai.expect(newLpBalance).to.equal(lpBalance.sub(1));

    // Check the cryptofolio again and verify it holds the NFT
    [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenId);

    // Burn the dust
    tx = tradeFloorProxyInstance.burn(cryptofolioAddress, tradeFloorTokenId, 1);
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(tradeFloorClientLP.address, marketingWallet.address, 1);

    // Check the cryptofolio again and it should be in its original state
    [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(0);

    //
    // Test re-staking the LP NFT for thoroughness
    //

    // Approve LP tokens again for another deposit
    tx = await uniV2PairContract.approve(tradeFloorClientLP.address, lpBalance);
    await chai.expect(tx).to.emit(uniV2PairContract, 'Approval').withArgs(
      marketingWallet.address, // owner
      tradeFloorClientLP.address, // spender
      lpBalance // balance
    );

    // Deposit LP tokens again
    tx = tradeFloorClientLP.deposit(cryptofolioAddress, lpBalance);
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(marketingWallet.address, tradeFloorClientLP.address, lpBalance);
    await chai
      .expect(tx)
      .to.emit(cryptofolioContract, 'CryptoFolioAdded')
      .withArgs(
        cryptofolioAddress,
        tradeFloorProxyContract.address,
        [tradeFloorTokenId],
        [lpBalance]
      );
    await chai
      .expect(tx)
      .to.emit(tradeFloorClientLP, 'Deposit')
      .withArgs(marketingWallet.address, cryptofolioAddress, lpBalance, 0);

    // Check the cryptofolio again and the LP NFT should appear
    [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenId);

    // Burn the NFT
    tx = tradeFloorProxyInstance.burn(
      cryptofolioAddress,
      tradeFloorTokenId,
      lpBalance
    );
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(tradeFloorClientLP.address, marketingWallet.address, lpBalance);

    // Check the cryptofolio again and it should be in its original state
    [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(0);
  });
});
