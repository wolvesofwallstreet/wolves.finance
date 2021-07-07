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

// Contract ABIs
import SftEvaluatorAbi from '../../src/abi/contracts/src/cfolio/SFTEvaluator.sol/SFTEvaluator.json';
import WOWSSftMinterAbi from '../../src/abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import UpgradeProxyAbi from '../../src/abi/contracts/src/proxy/UpgradeProxy.sol/UpgradeProxy.json';
import TradeFloorAbi from '../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import WOWSCryptofolioAbi from '../../src/abi/contracts/src/token/WOWSCryptofolio.sol/WOWSCryptofolio.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import WOWSERC1155Abi from '../../src/abi/contracts/src/token/WOWSErc1155.sol/WOWSERC1155.json';
import { ADDRESS_ZERO, MAX_UINT256 } from '../utils/constants';
import { hardhat } from '../utils/hardhat';

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
//const GAS_ESTIMATOR_URL =
//  'https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json?api-key=53be2a60f8bc0bb818ad161f034286d709a9c4ccb1362054b0543df78e27';
const GAS_ESTIMATOR_URL = 'https://ethgasstation.info/json/ethgasAPI.json';

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
    UpgradeProxyAbi,
    marketingWallet
  );
  const sftEvaluatorContract = new ethers.Contract(
    addresses.sftEvaluator,
    SftEvaluatorAbi,
    marketingWallet
  );
  const sftEvaluatorProxyContract = new ethers.Contract(
    addresses.sftEvaluatorProxy,
    SftEvaluatorAbi,
    marketingWallet
  );

  return {
    tokenContract,
    sftHolderContract,
    sftMinterContract,
    tradeFloorContract,
    tradeFloorProxyContract,
    sftEvaluatorContract,
    sftEvaluatorProxyContract,
  };
});

describe('SFT evaluator', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;
  let contracts: any;

  let tradeFloorProxyInstance: ethers.Contract;
  let sftEvaluatorProxyInstance: ethers.Contract;

  let cryptofolioAddressBoi: string;

  // Test parameters
  const level0Price = '1000000000000000000';
  const defaultCFolioType = 0;
  const levelBoi = 0;
  const cardIdBoi = 2;
  const wowsTokenIdBoi = ethers.BigNumber.from('0x00020000');

  const cfolioItemTokenIds = Array(101);
  for (let i = 0; i < cfolioItemTokenIds.length; ++i) {
    cfolioItemTokenIds[i] = ethers.BigNumber.from('0x10000000000000000').add(i);
  }
  const cfolioItemTokenIdsTf = Array(cfolioItemTokenIds.length);
  const cFolioItemType = 0x10; // Card type 0x10, registered in minter for cfolioItemHandlerSC

  // For keeping track of marginal gas usage as items are added to c-folio
  let gasUsedNoItems = ethers.BigNumber.from(0);
  let gasUsedOneItems = ethers.BigNumber.from(0);

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

    console.log(`    ETH price is $${ethUsd}`);
    console.log(`    Using '${GAS_PRICE}' gas at ${gasPrice / 1e9} Gwei`);
  });

  it('should attach the trade floor proxy', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract, tradeFloorProxyContract } = contracts;

    // Attach the proxy and set marketing wallet signer
    tradeFloorProxyInstance = tradeFloorContract
      .attach(tradeFloorProxyContract.address)
      .connect(marketingWallet);
  });

  it('should attach the sftEvaluator proxy', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorContract, sftEvaluatorProxyContract } = contracts;

    // Attach the proxy and set marketing wallet signer
    sftEvaluatorProxyInstance = sftEvaluatorContract
      .attach(sftEvaluatorProxyContract.address)
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
      level0Price, // Price
      defaultCFolioType // CFolioItemType
    );
  });

  it(`should mint ${cfolioItemTokenIds.length} unlocked CFolioItems (into wallet)`, async function () {
    this.timeout(60 * 1000);

    const options = {
      gasLimit: ethers.BigNumber.from('2000000'), // 2M
    };

    const { sftMinterContract } = contracts;

    for (let i = 0; i < cfolioItemTokenIds.length; ++i) {
      // Mint a new SC investment type into wallet
      const tx = sftMinterContract.mintCFolioItemSFT(
        marketingWallet.address,
        // Alternate types, to fit in SFT minter's limit of 100 per type
        [cFolioItemType, cFolioItemType + 1][i % 2],
        MAX_UINT256,
        [],
        options
      );
      await chai.expect(tx).to.not.be.reverted;
    }
  });

  it(`should check wallet for ${
    cfolioItemTokenIds.length + 1
  } SFTs`, async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Get the address of the clone contract
    const balances = await sftHolderContract.balanceOfBatch(
      Array(1 + cfolioItemTokenIds.length).fill(marketingWallet.address),
      [wowsTokenIdBoi].concat(cfolioItemTokenIds)
    );
    chai.expect(balances[0]).to.equal(1);
    for (let i = 0; i < cfolioItemTokenIds.length; ++i) {
      chai.expect(balances[i + 1]).to.equal(1);
    }
  });

  it('should get address of clone contract', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Get the address of the clone contract
    cryptofolioAddressBoi = await sftHolderContract.tokenIdToAddress(
      wowsTokenIdBoi
    );
    chai.expect(cryptofolioAddressBoi).to.be.properAddress;
    chai.expect(cryptofolioAddressBoi).to.not.equal(ADDRESS_ZERO);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test reward updates
  //////////////////////////////////////////////////////////////////////////////

  it('should test admin address', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const adminAddress = await sftEvaluatorProxyContract.admin();
    chai
      .expect(adminAddress.toLowerCase())
      .to.equal(marketingWallet.address.toLowerCase());
  });

  it('should test reward rate of unminted SFT', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    // Should be the lowest pre-defined base rate
    const rewardRate = await sftEvaluatorProxyContract.rewardRate('0x00000000');
    chai.expect(rewardRate).to.equal(25e4);
  });

  it('should test reward rate of minted Boi SFT', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    // Should be the lowest tier of base rates (later we'll test after
    // upgarding levels)
    const rewardRate = await sftEvaluatorProxyContract.rewardRate(
      wowsTokenIdBoi
    );
    chai.expect(rewardRate).to.equal(25e4);
  });

  it('should test CFolioItem type of invalid token', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const tx = sftEvaluatorProxyContract.getCFolioItemType(wowsTokenIdBoi);
    await chai.expect(tx).to.be.revertedWith('Invalid tokenId');
  });

  it('should test CFolioItem type of valid token', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const itemType = await sftEvaluatorProxyContract.getCFolioItemType(
      cfolioItemTokenIds[0]
    );
    chai.expect(itemType).to.equal(cFolioItemType);
  });

  it('should fail to set reward rate of CFolioItem', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const tx = sftEvaluatorProxyContract.setRewardRate(
      cfolioItemTokenIds[0],
      true
    );
    await chai.expect(tx).to.be.revertedWith('Invalid tokenId');
  });

  it('should revert if reward rate is unchanged', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const tx = sftEvaluatorProxyContract.setRewardRate(wowsTokenIdBoi, true);
    await chai.expect(tx).to.be.revertedWith('Rate unchange');
  });

  it('should set the reward rate (no effect)', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const tx = sftEvaluatorProxyContract.setRewardRate(wowsTokenIdBoi, false);
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Set reward rate (no effect) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should advance time by 61 days', async function () {
    // Add 61 days and mine the next block to trigger a level upgrade
    await hardhat.network.provider.send('evm_increaseTime', [
      61 * 24 * 60 * 60,
    ]);
    await hardhat.network.provider.send('evm_mine');
  });

  it('should set the reward rate (after level upgrade)', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const tx = sftEvaluatorProxyContract.setRewardRate(wowsTokenIdBoi, false);
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Set reward rate (after level upgrade) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );

    // Record gas cast for marginal calculations
    gasUsedNoItems = gasUsedGwei;
  });

  it(`should lock ${cfolioItemTokenIds.length} CFolioItems in trade floor`, async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, tradeFloorProxyContract } = contracts;

    // Transfer CFolioItems to trade floor to lock them and receive NFTs
    let tx = sftHolderContract.safeBatchTransferFrom(
      marketingWallet.address,
      tradeFloorProxyContract.address,
      cfolioItemTokenIds.slice(0, 50),
      Array(50).fill(1),
      []
    );
    await chai.expect(tx).to.not.be.reverted;
    tx = sftHolderContract.safeBatchTransferFrom(
      marketingWallet.address,
      tradeFloorProxyContract.address,
      cfolioItemTokenIds.slice(50, 101),
      Array(51).fill(1),
      []
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should get CFolioItem trade floor token IDs', async function () {
    this.timeout(60 * 1000);

    // Check cryptofolio and the LP NFT should appear
    const tokenIds = await tradeFloorProxyInstance.getTokenIds(
      marketingWallet.address
    );
    chai.expect(tokenIds.length).to.equal(cfolioItemTokenIds.length);

    for (let i = 0; i < cfolioItemTokenIds.length; ++i) {
      cfolioItemTokenIdsTf[i] = tokenIds[i];
    }
  });

  it('should check wallet for trade floor NFTs', async function () {
    this.timeout(60 * 1000);

    // Item in the trade floor contract should belong to the wallet
    const balance = await tradeFloorProxyInstance.balanceOfBatch(
      Array(cfolioItemTokenIdsTf.length).fill(marketingWallet.address),
      cfolioItemTokenIdsTf
    );

    for (let i = 0; i < cfolioItemTokenIdsTf.length; ++i) {
      chai.expect(balance[i]).to.equal(1);
    }
  });

  it('should transfer one locked NFT into the boi card', async function () {
    this.timeout(60 * 1000);

    // Transfer locked cryptofolio item NFT
    const tx = tradeFloorProxyInstance.safeTransferFrom(
      marketingWallet.address,
      cryptofolioAddressBoi,
      cfolioItemTokenIdsTf[0],
      1,
      []
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should set the reward rate (one item)', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const tx = sftEvaluatorProxyContract.setRewardRate(wowsTokenIdBoi, false);
    await chai.expect(tx).to.not.be.reverted;

    const receipt = await (await tx).wait();

    // Record gas cast for marginal calculations
    gasUsedOneItems = receipt.gasUsed;

    // Log marginal gas cost
    const gasUsedGwei = gasUsedOneItems.sub(gasUsedNoItems);
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Set reward rate (one item) marginal gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should transfer one more locked NFT into the boi card', async function () {
    this.timeout(60 * 1000);

    // Transfer locked cryptofolio item NFT
    const tx = tradeFloorProxyInstance.safeTransferFrom(
      marketingWallet.address,
      cryptofolioAddressBoi,
      cfolioItemTokenIdsTf[1],
      1,
      []
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should set the reward rate (two items)', async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const tx = sftEvaluatorProxyContract.setRewardRate(wowsTokenIdBoi, false);
    await chai.expect(tx).to.not.be.reverted;

    const receipt = await (await tx).wait();

    // Record gas cast for marginal calculations
    const gasUsedTwoItems = receipt.gasUsed;

    // Log gas cost
    const gasUsedGwei = gasUsedTwoItems.sub(gasUsedOneItems);
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Set reward rate (two items) marginal gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should transfer up to 100 locked NFTs into the boi card', async function () {
    this.timeout(60 * 1000);

    // Transfer locked cryptofolio item NFTs
    let tx = tradeFloorProxyInstance.safeBatchTransferFrom(
      marketingWallet.address,
      cryptofolioAddressBoi,
      cfolioItemTokenIdsTf.slice(2, 50),
      Array(48).fill(1),
      []
    );
    await tx;
    await chai.expect(tx).to.not.be.reverted;
    tx = tradeFloorProxyInstance.safeBatchTransferFrom(
      marketingWallet.address,
      cryptofolioAddressBoi,
      cfolioItemTokenIdsTf.slice(50, 100),
      Array(50).fill(1),
      []
    );
    await tx;
    await chai.expect(tx).to.not.be.reverted;
  });

  it(`should set the reward rate (100 items)`, async function () {
    this.timeout(60 * 1000);

    const { sftEvaluatorProxyContract } = contracts;

    const tx = sftEvaluatorProxyContract.setRewardRate(wowsTokenIdBoi, false);
    await chai.expect(tx).to.not.be.reverted;

    const receipt = await (await tx).wait();

    // Record gas cast for marginal calculations
    const gasUsedAllItems = receipt.gasUsed;

    // Log marginal gas cost
    const gasUsedGwei = gasUsedAllItems.sub(gasUsedNoItems).div(100);
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Set reward rate (100 items) average marginal gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });
});
