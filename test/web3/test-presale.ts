/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

/* eslint @typescript-eslint/no-unused-expressions: "off" */
/* eslint @typescript-eslint/no-unused-vars: "off" */

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { ethers } from 'ethers';
import fs from 'fs';

import PresaleAbi from '../../src/abi/contracts/src/crowdsale/Crowdsale.sol/Crowdsale.json';
import UniV2StakeFarm from '../../src/abi/contracts/src/investment/UniV2StakeFarm.sol/UniV2StakeFarm.json';
import WowsTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import { hardhat } from '../utils/hardhat';

chai.use(solidity);

// Path to generated address registry file
const GENERATED_ADDRESSES = `${__dirname}/../../src/config/generated-addresses.json`;

// Maximum marketing profit is 50% of 3 ETH limit
const MARKETING_PROFIT = 1.5; // ETH

// The following gas prices are available
//
//   - 'SLOW'
//   - 'AVERAGE'
//   - 'FAST'
//   - 'FASTEST'
//
const GAS_PRICE = 'FAST';

// Current price API URL
const CURRENT_PRICE_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum';

// Gas estimator API URL
const GAS_ESTIMATOR_URL =
  'https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json?api-key=53be2a60f8bc0bb818ad161f034286d709a9c4ccb1362054b0543df78e27';

// Helper function
function toWei(n: number, decimals = 18) {
  const parsed = typeof n === 'number' ? n.toFixed(decimals) : n;
  return ethers.utils.parseUnits(parsed, decimals);
}

// Helper function
function toEth(wei: ethers.BigNumber): number {
  // Scale to 4 decimal places for integer division
  const weiScaled = wei.mul(1e4);

  const ethScaled = weiScaled.div(1e9).div(1e9);

  const eth = ethScaled.toNumber() / 1e4;

  return eth;
}

describe('Presale contract', function () {
  let signer: SignerWithAddress;
  let marketingWalletAddress: string;

  let tokenContract: ethers.Contract;
  let presaleContract: ethers.Contract;
  let stakeFarm: ethers.Contract;

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
    [signer] = await hardhat.ethers.getSigners();

    // Get the marketing wallet
    const { marketingWallet } = await hardhat.getNamedAccounts();
    marketingWalletAddress = marketingWallet;

    // Create the initial fixture, this will generate the address registry
    await hardhat.deployments.fixture();

    // Get chain ID
    const chainId = await hardhat.getChainId();

    // Load contract addresses
    const generatedNetworks = JSON.parse(
      fs.readFileSync(GENERATED_ADDRESSES).toString()
    );
    const addresses = generatedNetworks[chainId] || {};

    tokenContract = new ethers.Contract(addresses.token, WowsTokenAbi, signer);

    presaleContract = new ethers.Contract(
      addresses.presale,
      PresaleAbi,
      signer
    );

    stakeFarm = new ethers.Contract(
      addresses.stakeFarm,
      UniV2StakeFarm,
      signer
    );

    // Query API providers
    const ethUsd = await toUsd(1);
    const gasPrice = await getGasPrice();

    console.log(`ETH price is $${ethUsd}`);
    console.log(`Using '${GAS_PRICE}' gas at ${gasPrice / 1e9} Gwei`);
  });

  beforeEach(async function () {
    this.timeout(60 * 1000);

    await hardhat.deployments.fixture();
  });

  it('should open and close the presale', async function () {
    this.timeout(60 * 1000);

    // TODO: "Increase to" function
    // See:
    //   https://github.com/OpenZeppelin/openzeppelin-test-helpers/blob/master/src/time.js#L70

    // Expect closed
    let isOpen = await presaleContract.isOpen();
    let hasClosed = await presaleContract.hasClosed();
    chai.expect(isOpen).to.be.false;
    chai.expect(hasClosed).to.be.false;

    // Add 5 minutes and mine the next block
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]);
    await hardhat.network.provider.send('evm_mine');

    // Expect open
    isOpen = await presaleContract.isOpen();
    hasClosed = await presaleContract.hasClosed();
    chai.expect(isOpen).to.be.true;
    chai.expect(hasClosed).to.be.false;

    // Add 5 minutes and mine the next block
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]);
    await hardhat.network.provider.send('evm_mine');

    // Expect closed
    isOpen = await presaleContract.isOpen();
    hasClosed = await presaleContract.hasClosed();
    chai.expect(isOpen).to.be.false;
    chai.expect(hasClosed).to.be.true;

    // Time-travel backwards 5 minutes and mine the next block
    await hardhat.network.provider.send('evm_increaseTime', [-5 * 60]);
    await hardhat.network.provider.send('evm_mine');

    // Expect open again
    isOpen = await presaleContract.isOpen();
    hasClosed = await presaleContract.hasClosed();
    chai.expect(isOpen).to.be.true;
    chai.expect(hasClosed).to.be.false;
  });

  it("cap shouldn't been reached", async function () {
    this.timeout(60 * 1000);

    const capReached = await presaleContract.capReached();
    chai.expect(capReached).to.be.false;
  });

  it('should buy too few tokens', async function () {
    this.timeout(60 * 1000);

    // Open the presale
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]); // 5 mins
    await hardhat.network.provider.send('evm_mine');
    chai.expect(await presaleContract.isOpen()).to.be.true;

    // Check signer balance
    let balance = await tokenContract.balanceOf(signer.address);
    chai.expect(balance).to.equal(0);

    // Too little - 0.1 ETH of token
    const amount = 0.1;
    const options = { gasPrice, value: toWei(amount) };

    // Expect buy tokens to revert
    const tx: Promise<ethers.ContractTransaction> = presaleContract.buyTokens(
      signer.address,
      options
    );
    await chai.expect(tx).to.be.revertedWith('invest too small');

    // Check that balance is the same
    balance = await tokenContract.balanceOf(signer.address);
    chai.expect(balance).to.equal(0);
  });

  it('should buy too many tokens', async function () {
    this.timeout(60 * 1000);

    // Open the presale
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]); // 5 mins
    await hardhat.network.provider.send('evm_mine');
    chai.expect(await presaleContract.isOpen()).to.be.true;

    // Too much - 3.1 ETH of token
    const amount = 3.1;
    const options = { gasPrice, value: toWei(amount) };

    // Expect buy tokens to revert
    const tx: Promise<ethers.ContractTransaction> = presaleContract.buyTokens(
      signer.address,
      options
    );
    await chai.expect(tx).to.be.revertedWith('wallet-cap exceeded');

    // Check that balance is the same
    const balance = await tokenContract.balanceOf(signer.address);
    chai.expect(balance).to.equal(0);
  });

  it('should buy past the limit', async function () {
    this.timeout(60 * 1000);

    // Open the presale
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]); // 5 mins
    await hardhat.network.provider.send('evm_mine');
    chai.expect(await presaleContract.isOpen()).to.be.true;

    // Get initial balances
    const initialBalance = toEth(
      await hardhat.ethers.provider.getBalance(signer.address)
    );
    const initialMarketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWalletAddress)
    );

    let amount: number;
    let options: unknown;
    let tx: Promise<ethers.ContractTransaction>;
    let tokenBalance: number;
    let marketingProfit: number;

    ////////////////////////////////////////////////////////////////////////////
    //
    // Test first half of the limit
    //
    ////////////////////////////////////////////////////////////////////////////

    // Half of limit - 1.5 ETH
    amount = 1.5;
    options = { gasPrice, value: toWei(amount) };

    // Buy tokens
    tx = presaleContract.buyTokens(signer.address, options);
    await chai.expect(tx).to.emit(presaleContract, 'TokensPurchased').withArgs(
      signer.address, // Purchaser
      signer.address, // Beneficiary
      ethers.BigNumber.from('1500000000000000000'), // Value - 1.5 ETH
      ethers.BigNumber.from('120000000000000000000') // Amount - 120 WOWS
    );

    // Log gas cost
    const finalBalance = toEth(
      await hardhat.ethers.provider.getBalance(signer.address)
    );
    const gasCost = parseFloat(
      (initialBalance - finalBalance - amount).toFixed(4)
    );
    console.log(
      `Buy token gas cost: ${gasCost} ETH ($${await toUsd(gasCost)})`
    );

    // Check token balance
    tokenBalance = await tokenContract.balanceOf(signer.address);
    chai
      .expect(tokenBalance)
      .to.equal(ethers.BigNumber.from('120000000000000000000')); // 120 WOWS

    // Check marketing ETH balance
    const marketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWalletAddress)
    );
    marketingProfit = marketingBalance - initialMarketingBalance;
    chai.expect(marketingProfit).to.be.closeTo(MARKETING_PROFIT / 2, 0.001);

    ////////////////////////////////////////////////////////////////////////////
    //
    // Test second half of the limit
    //
    ////////////////////////////////////////////////////////////////////////////

    // Second half of limit - 1.5 more ETH
    amount = 1.5;
    options = { gasPrice, value: toWei(amount) };

    // Buy tokens
    tx = presaleContract.buyTokens(signer.address, options);
    await chai.expect(tx).to.emit(presaleContract, 'TokensPurchased').withArgs(
      signer.address, // Purchaser
      signer.address, // Beneficiary
      ethers.BigNumber.from('1500000000000000000'), // Value - 1.5 ETH
      ethers.BigNumber.from('120000000000000000000') // Amount - 120 WOWS
    );

    // Check token balance
    tokenBalance = await tokenContract.balanceOf(signer.address);
    chai
      .expect(tokenBalance)
      .to.equal(ethers.BigNumber.from('240000000000000000000')); // 240 WOWS

    // Check marketing ETH balance
    const finalMarketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWalletAddress)
    );
    marketingProfit = finalMarketingBalance - initialMarketingBalance;
    chai.expect(marketingProfit).to.be.closeTo(MARKETING_PROFIT, 0.001);

    ////////////////////////////////////////////////////////////////////////////
    //
    // Test over the limit
    //
    ////////////////////////////////////////////////////////////////////////////

    // Limit reached - 1 more ETH
    amount = 1;
    options = { gasPrice, value: toWei(amount) };

    // Expect buy tokens to revert
    tx = presaleContract.buyTokens(signer.address, options);
    await chai.expect(tx).to.be.revertedWith('wallet-cap exceeded');

    // Check token balance
    tokenBalance = await tokenContract.balanceOf(signer.address);
    chai
      .expect(tokenBalance)
      .to.equal(ethers.BigNumber.from('240000000000000000000')); // 240 WOWS
  });

  it('should buy tokens and liquidity from the presale contract', async function () {
    this.timeout(60 * 1000);

    // Open the presale
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]); // 5 mins
    await hardhat.network.provider.send('evm_mine');
    chai.expect(await presaleContract.isOpen()).to.be.true;

    // Get initial balances
    const initialBalance = toEth(
      await hardhat.ethers.provider.getBalance(signer.address)
    );
    const initialMarketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWalletAddress)
    );

    // Limit of 6.75 ETH
    const amount = 6.75;
    const options = { gasPrice, value: toWei(amount) };

    // Buy tokens and add liquidity
    const tx: Promise<ethers.ContractTransaction> = presaleContract.buyTokensAddLiquidity(
      signer.address,
      options
    );
    await chai.expect(tx).to.emit(presaleContract, 'Staked').withArgs(
      signer.address, // Beneficiary
      ethers.BigNumber.from('29999999999999999000') // Liquidity - ~30 LP tokens
    );

    // Log gas cost
    const finalBalance = toEth(
      await hardhat.ethers.provider.getBalance(signer.address)
    );
    const gasCost = parseFloat(
      (initialBalance - finalBalance - amount).toFixed(4)
    );
    console.log(
      `Buy liquidity gas cost: ${gasCost} ETH ($${await toUsd(gasCost)})`
    );

    // Check marketing ETH balance
    const finalMarketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWalletAddress)
    );
    const marketingProfit = finalMarketingBalance - initialMarketingBalance;
    chai.expect(marketingProfit).to.be.closeTo(MARKETING_PROFIT, 0.001);

    // Check farm balance
    const lpBalance = await stakeFarm.balanceOf(signer.address);
    chai
      .expect(lpBalance)
      .to.equal(ethers.BigNumber.from('29999999999999999000'));

    // Check stake farm supply
    const farmTotalSupply = await stakeFarm.totalSupply();
    chai
      .expect(farmTotalSupply)
      .to.equal(ethers.BigNumber.from('29999999999999999000')); // 30 LP tokens
  });

  it('should transfer stake', async function () {
    this.timeout(60 * 1000);

    // Open the presale
    await hardhat.network.provider.send('evm_increaseTime', [5 * 60]); // 5 mins
    await hardhat.network.provider.send('evm_mine');
    chai.expect(await presaleContract.isOpen()).to.be.true;

    let options: unknown;
    let tx: Promise<ethers.ContractTransaction>;

    // Limit of 6.75 ETH
    const amount = 6.75;
    options = { gasPrice, value: toWei(amount) };

    // Buy tokens and add liquidity
    tx = presaleContract.buyTokensAddLiquidity(signer.address, options);
    await chai.expect(tx).to.emit(presaleContract, 'Staked').withArgs(
      signer.address, // Beneficiary
      ethers.BigNumber.from('29999999999999999000') // Liquidity - ~30 LP tokens
    );

    // Check farm balance
    const lpBalance = await stakeFarm.balanceOf(signer.address);
    chai
      .expect(lpBalance)
      .to.equal(ethers.BigNumber.from('29999999999999999000'));

    // Get current balance
    const currentBalance = toEth(
      await hardhat.ethers.provider.getBalance(signer.address)
    );

    // Transfer stake
    options = { gasPrice };
    tx = stakeFarm.transfer(marketingWalletAddress, lpBalance, options);
    await chai.expect(tx).to.emit(stakeFarm, 'Transfered').withArgs(
      signer.address, // Sender
      marketingWalletAddress, // Recipient
      lpBalance // Amount
    );

    // Log gas cost
    const finalBalance = toEth(
      await hardhat.ethers.provider.getBalance(signer.address)
    );
    const gasCost = parseFloat((currentBalance - finalBalance).toFixed(4));
    console.log(
      `Transfer stake gas cost: ${gasCost} ETH ($${await toUsd(gasCost)})`
    );
  });
});
