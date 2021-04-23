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
import TradeFloorProxyAbi from '../../src/abi/contracts/src/proxy/TradeFloorProxy.sol/TradeFloorProxy.json';
import TradeFloorAbi from '../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import WOWSCryptofolioAbi from '../../src/abi/contracts/src/token/WOWSCryptofolio.sol/WOWSCryptofolio.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import WOWSERC1155Abi from '../../src/abi/contracts/src/token/WOWSErc1155.sol/WOWSERC1155.json';
import { hardhat } from '../../src/web3/hardhat';

chai.use(solidity);

// Path to generated address registry file
const GENERATED_ADDRESSES = `${__dirname}/../../src/config/generated-addresses.json`;

// The following gas prices are available
//
//   - 'SLOW'
//   - 'AVERAGE'
//   - 'FAST'
//   - 'FASTEST'
//
const GAS_PRICE = 'AVERAGE';

// Current price API URL
const CURRENT_PRICE_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum';

// Gas estimator API URL
// TODO: Move API key to GitHub Actions secret
const GAS_ESTIMATOR_URL =
  'https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json?api-key=53be2a60f8bc0bb818ad161f034286d709a9c4ccb1362054b0543df78e27';

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

describe('Reward farms', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;
  let contracts: any;

  let tradeFloorProxyInstance: ethers.Contract;

  let cryptofolioAddressBoi: string;
  let cryptofolioAddressWolf: string;

  let cryptofolioContractBoi: ethers.Contract;
  let cryptofolioContractWolf: ethers.Contract;

  // Test parameters
  const level1Price = '3000000000000000000';
  const lpBalance = ethers.BigNumber.from('12000000000000000000'); // 12 UNI-V2 LP tokens
  const levelBoi = 1;
  const cardIdBoi = 2;
  const levelWolf = 5;
  const cardIdWolf = 2;
  const wowsTokenIdBoi = ethers.BigNumber.from('0x01020000');
  const wowsTokenIdWolf = ethers.BigNumber.from('0x05020000');
  const tradeFloorTokenIdBoi = ethers.BigNumber.from('0x10000000000000000');
  const tradeFloorTokenIdWolf = ethers.BigNumber.from('0x10000000000000001');

  // Lazily-initialized variables
  let ethUsd = 0;
  let gasPrice = 0;

  // Helper function
  async function toUsd(eth: number): Promise<number> {
    if (ethUsd === 0) {
      // Query current price API
      const response = await fetch(CURRENT_PRICE_URL);

      // Parse response
      const responseJson = await response.json();
      if (responseJson) {
        ethUsd = responseJson[0].current_price;
      }
    }

    return parseFloat((eth * ethUsd).toFixed(2));
  }

  // Helper function
  async function getGasPrice() {
    if (gasPrice === 0) {
      // Lookup table for JSON keys
      const JSON_KEY = {
        SLOW: 'safeLow',
        AVERAGE: 'average',
        FAST: 'fast',
        FASTEST: 'fastest',
      };

      // Query current price API
      const response = await fetch(GAS_ESTIMATOR_URL);

      // Parse response
      const responseJson = await response.json();
      if (responseJson) {
        gasPrice = (responseJson[JSON_KEY[GAS_PRICE]] * 1e9) / 10;
      }
    }

    return gasPrice;
  }

  before(async function () {
    this.timeout(60 * 1000);

    // Get the Signers
    [signer, marketingWallet] = await hardhat.ethers.getSigners();

    // A single fixture is used for the test suite
    contracts = await setupTest();

    // Query API providers
    const ethUsd = await toUsd(1);
    const gasPrice = await getGasPrice();

    console.log(`ETH price is $${ethUsd}`);
    console.log(`Using '${GAS_PRICE}' gas at ${gasPrice / 1e9} Gwei`);
  });

  it('should attach the trade floor proxy', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract, tradeFloorProxyContract } = contracts;

    // Attach the proxy and set marketing wallet signer
    tradeFloorProxyInstance = tradeFloorContract
      .attach(tradeFloorProxyContract.address)
      .connect(marketingWallet);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Setup: WOWS
  //////////////////////////////////////////////////////////////////////////////

  it('should approve spending WOWS', async function () {
    this.timeout(60 * 1000);

    const { tokenContract, sftMinterContract } = contracts;

    // Approve SFT minter spending WOWS
    const tx = tokenContract.approve(
      sftMinterContract.address,
      ethers.BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    await chai
      .expect(tx)
      .to.emit(tokenContract, 'Approval')
      .withArgs(
        marketingWallet.address,
        sftMinterContract.address,
        ethers.BigNumber.from(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        )
      );
  });

  //////////////////////////////////////////////////////////////////////////////
  // Setup: SFTs
  //////////////////////////////////////////////////////////////////////////////

  it('should mint boi SFT', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = contracts;

    // Mint the Bois WOWS SFT
    const tx = sftMinterContract.mintWowsSFT(
      marketingWallet.address,
      levelBoi,
      cardIdBoi
    );
    await chai.expect(tx).to.emit(sftMinterContract, 'Mint').withArgs(
      marketingWallet.address, // Recipient
      wowsTokenIdBoi, // Token ID
      level1Price // Price
    );
  });

  it('should mint wolf SFT', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = contracts;

    // Mint the Wolf WOWS SFT
    const tx = sftMinterContract.mintWowsSFT(
      marketingWallet.address,
      levelWolf,
      cardIdWolf
    );
    await chai.expect(tx).to.emit(sftMinterContract, 'Mint').withArgs(
      marketingWallet.address, // Recipient
      wowsTokenIdWolf, // Token ID
      level1Price // Price
    );
  });

  it('should get addresses of clone contracts', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Get the address of the clone contract
    cryptofolioAddressBoi = await sftHolderContract.tokenIdToAddress(
      wowsTokenIdBoi
    );
    chai.expect(cryptofolioAddressBoi).to.be.properAddress;
    chai
      .expect(cryptofolioAddressBoi)
      .to.not.equal('0x0000000000000000000000000000000000000000');

    // Get the address of the clone contract
    cryptofolioAddressWolf = await sftHolderContract.tokenIdToAddress(
      wowsTokenIdWolf
    );
    chai.expect(cryptofolioAddressWolf).to.be.properAddress;
    chai
      .expect(cryptofolioAddressBoi)
      .to.not.equal('0x0000000000000000000000000000000000000000');
  });

  it('should instantiate cryptofolio contracts', async function () {
    this.timeout(60 * 1000);

    // Instantiate cryptofolio contract
    cryptofolioContractBoi = new ethers.Contract(
      cryptofolioAddressBoi,
      WOWSCryptofolioAbi,
      marketingWallet
    );

    // Instantiate cryptofolio contract
    cryptofolioContractWolf = new ethers.Contract(
      cryptofolioAddressWolf,
      WOWSCryptofolioAbi,
      marketingWallet
    );
  });

  //////////////////////////////////////////////////////////////////////////////
  // Setup: LP tokens
  //////////////////////////////////////////////////////////////////////////////

  it('should get LP tokens', async function () {
    this.timeout(60 * 1000);

    const { presaleContract } = contracts;

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
  });

  it('should check wallet balance', async function () {
    this.timeout(60 * 1000);

    const { uniV2PairContract } = contracts;

    // Check wallet balance
    const currentLpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentLpBalance).to.equal(lpBalance);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test LP NFTs
  //////////////////////////////////////////////////////////////////////////////

  it('should approve TFCLP to transfer tokens', async function () {
    this.timeout(60 * 1000);

    const { uniV2PairContract, tradeFloorClientLP } = contracts;

    // Approve TFCLP to transfer our tokens
    const tx = await uniV2PairContract.approve(
      tradeFloorClientLP.address,
      lpBalance
    );
    await chai.expect(tx).to.emit(uniV2PairContract, 'Approval').withArgs(
      marketingWallet.address, // owner
      tradeFloorClientLP.address, // spender
      lpBalance // balance
    );

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `Approve LP gas used: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should increase possible token IDs', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorClientLP } = contracts;

    // Test parameters
    const defaultTokenIdCount = 8;
    const testTokenIdCount = 16;

    // Check number of token IDs
    let numTokenIds = await tradeFloorClientLP.numTradeFloorTokenIds();
    chai.expect(numTokenIds).to.equal(defaultTokenIdCount);

    // Fail to decrease possible token IDs
    let tx = tradeFloorClientLP.setNumTokenIds(0);
    await chai.expect(tx).to.be.revertedWith('TFCLP: increase only');

    // Increase possible token IDs
    tx = tradeFloorClientLP.setNumTokenIds(testTokenIdCount);
    await chai
      .expect(tx)
      .to.emit(tradeFloorClientLP, 'TokenIdCountChanged')
      .withArgs(testTokenIdCount);

    // Check number of token IDs
    numTokenIds = await tradeFloorClientLP.numTradeFloorTokenIds();
    chai.expect(numTokenIds).to.equal(testTokenIdCount);
  });

  it('should revert when depositing LP NFT into boi cryptofolio', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorProxyContract, tradeFloorClientLP } = contracts;

    // Deposit LP tokens to boi should fail
    const tx = tradeFloorClientLP.deposit(
      cryptofolioAddressBoi,
      tradeFloorTokenIdBoi,
      lpBalance
    );
    await chai.expect(tx).to.be.revertedWith('TFCLP: Wolves only');

    // Boi cryptofolio should be in its original state
    const [tokenIds, idsLength] = await cryptofolioContractBoi.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(0);
  });

  it('should deposit LP NFT into wolf cryptofolio', async function () {
    this.timeout(60 * 1000);

    const {
      uniV2PairContract,
      tradeFloorProxyContract,
      tradeFloorClientLP,
    } = contracts;

    // Deposit LP tokens to wolf
    const tx = tradeFloorClientLP.deposit(
      cryptofolioAddressWolf,
      tradeFloorTokenIdWolf,
      lpBalance
    );
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(marketingWallet.address, tradeFloorClientLP.address, lpBalance);
    await chai
      .expect(tx)
      .to.emit(cryptofolioContractWolf, 'CryptoFolioAdded')
      .withArgs(
        cryptofolioAddressWolf,
        tradeFloorProxyContract.address,
        [tradeFloorTokenIdWolf],
        [lpBalance]
      );
    await chai.expect(tx).to.emit(tradeFloorClientLP, 'Deposit').withArgs(
      marketingWallet.address, // User
      cryptofolioAddressWolf, // Recipient
      lpBalance, // Amount
      500000 // Reward rate
    );

    // Check cryptofolio and the LP NFT should appear
    const [tokenIds, idsLength] = await cryptofolioContractWolf.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenIdWolf);

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `Deposit LP gas used: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should burn half the LP NFT', async function () {
    this.timeout(60 * 1000);

    const {
      uniV2PairContract,
      tradeFloorProxyContract,
      tradeFloorClientLP,
    } = contracts;

    // Burn half the NFT
    const tx = tradeFloorProxyInstance.burn(
      cryptofolioAddressWolf,
      tradeFloorTokenIdWolf,
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
    const newLpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(newLpBalance).to.equal(lpBalance.div(2));

    // Check the cryptofolio again and verify it holds the NFT
    const [tokenIds, idsLength] = await cryptofolioContractWolf.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenIdWolf);

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `Burn LP NFT gas used: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should burn almost the other half of the LP NFT', async function () {
    this.timeout(60 * 1000);

    const {
      uniV2PairContract,
      tradeFloorProxyContract,
      tradeFloorClientLP,
    } = contracts;

    // Burn *almost* the other half of the NFT
    const tx = tradeFloorProxyInstance.burn(
      cryptofolioAddressWolf,
      tradeFloorTokenIdWolf,
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
    const newLpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(newLpBalance).to.equal(lpBalance.sub(1));

    // Check the cryptofolio again and verify it holds the NFT
    const [tokenIds, idsLength] = await cryptofolioContractWolf.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenIdWolf);
  });

  it('should burn the dust', async function () {
    this.timeout(60 * 1000);

    const {
      uniV2PairContract,
      tradeFloorProxyContract,
      tradeFloorClientLP,
    } = contracts;

    // Burn the dust
    const tx = tradeFloorProxyInstance.burn(
      cryptofolioAddressWolf,
      tradeFloorTokenIdWolf,
      1
    );
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(tradeFloorClientLP.address, marketingWallet.address, 1);

    // Check the cryptofolio again and it should be in its original state
    const [tokenIds, idsLength] = await cryptofolioContractWolf.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(0);
  });

  it('should test re-staking LP NFT', async function () {
    this.timeout(60 * 1000);

    const {
      uniV2PairContract,
      tradeFloorProxyContract,
      tradeFloorClientLP,
    } = contracts;

    // Approve LP tokens again for another deposit
    let tx = await uniV2PairContract.approve(
      tradeFloorClientLP.address,
      lpBalance
    );
    await chai.expect(tx).to.emit(uniV2PairContract, 'Approval').withArgs(
      marketingWallet.address, // owner
      tradeFloorClientLP.address, // spender
      lpBalance // balance
    );

    // Deposit LP tokens again
    tx = tradeFloorClientLP.deposit(
      cryptofolioAddressWolf,
      tradeFloorTokenIdWolf,
      lpBalance
    );
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(marketingWallet.address, tradeFloorClientLP.address, lpBalance);
    await chai
      .expect(tx)
      .to.emit(cryptofolioContractWolf, 'CryptoFolioAdded')
      .withArgs(
        cryptofolioAddressWolf,
        tradeFloorProxyContract.address,
        [tradeFloorTokenIdWolf],
        [lpBalance]
      );
    await chai.expect(tx).to.emit(tradeFloorClientLP, 'Deposit').withArgs(
      marketingWallet.address, // User
      cryptofolioAddressWolf, // Recipient
      lpBalance, // Amount
      500000 // Reward rate
    );

    // Check the cryptofolio again and the LP NFT should appear
    let [tokenIds, idsLength] = await cryptofolioContractWolf.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenIdWolf);

    // Burn the NFT
    tx = tradeFloorProxyInstance.burn(
      cryptofolioAddressWolf,
      tradeFloorTokenIdWolf,
      lpBalance
    );
    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(tradeFloorClientLP.address, marketingWallet.address, lpBalance);

    // Check the cryptofolio again and it should be in its original state
    [tokenIds, idsLength] = await cryptofolioContractWolf.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(0);
  });
});
