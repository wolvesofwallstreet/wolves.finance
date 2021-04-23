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

import WOWSSftMinterAbi from '../../src/abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import TradeFloorProxyAbi from '../../src/abi/contracts/src/proxy/TradeFloorProxy.sol/TradeFloorProxy.json';
import TradeFloorAbi from '../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
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

  return {
    tokenContract,
    sftHolderContract,
    sftMinterContract,
    tradeFloorContract,
    tradeFloorProxyContract,
  };
});

describe('SFT minter', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;
  let contracts: any;

  let cryptofolioAddressBoi: string;
  let cryptofolioAddressWolf: string;

  let tradeFloorProxyInstance: ethers.Contract;

  // Test parameters
  const level1Price = '3000000000000000000';
  const levelBoi = 1;
  const cardIdBoi = 2;
  const levelWolf = 5;
  const cardIdWolf = 2;
  const wowsTokenIdBoi = ethers.BigNumber.from('0x01020000');
  const wowsTokenIdWolf = ethers.BigNumber.from('0x05020000');

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

  /**/
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
  // Mint SFTs
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

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `Mint boi gas used: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
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

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `Mint wolf gas used: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check token ownership', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

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
  });

  it('should check token IDs', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Check the owner's token IDs
    const result = await sftHolderContract.getTokenIds(marketingWallet.address);
    chai.expect(result.length).to.equal(2);
    chai.expect(result[0]).to.equal(wowsTokenIdWolf);
    chai.expect(result[1]).to.equal(wowsTokenIdBoi);
  });

  it('should query boi token ID', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Query the token ID in the SFT contract
    const [
      mintTimestampBoi,
      tokenLevelBoi,
    ] = await sftHolderContract.getTokenData(wowsTokenIdBoi);
    chai.expect(mintTimestampBoi).to.not.equal(0);
    chai.expect(tokenLevelBoi).to.equal(levelBoi);
  });

  it('should query wolf token ID', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Query the token ID in the SFT contract
    const [
      mintTimestampWolf,
      tokenLevelWolf,
    ] = await sftHolderContract.getTokenData(wowsTokenIdWolf);
    chai.expect(mintTimestampWolf).to.not.equal(0);
    chai.expect(tokenLevelWolf).to.equal(levelWolf);
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

  it('should know the token IDs of clone contracts', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Get the token ID of the clone contract
    const tokenIdBoi = await sftHolderContract.addressToTokenId(
      cryptofolioAddressBoi
    );
    chai.expect(tokenIdBoi).to.equal(wowsTokenIdBoi);

    // Get the token ID of the clone contract
    const tokenIdWolf = await sftHolderContract.addressToTokenId(
      cryptofolioAddressWolf
    );
    chai.expect(tokenIdWolf).to.equal(wowsTokenIdWolf);
  });
});
