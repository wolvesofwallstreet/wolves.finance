/*
 * Copyright (C) 2021 The Wolfpack
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

import WOWSSftMinterAbi from '../../src/abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import RewardHandlerAbi from '../../src/abi/contracts/src/investment/RewardHandler.sol/RewardHandler.json';
import TradeFloorAbi from '../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import WOWSERC1155Abi from '../../src/abi/contracts/src/token/WOWSERC1155.sol/WOWSERC1155.json';
import { hardhat } from '../utils/hardhat';

chai.use(solidity);

// ERC-1155 metadata URI
const METADATA_URI = 'https://meta.wows.finance/wolves_assets/metadata/';

// Path to generated address registry file
const GENERATED_ADDRESSES = `${__dirname}/../../src/config/generated-addresses.json`;

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

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
  const rewardHandlerContract = new ethers.Contract(
    addresses.rewardHandler,
    RewardHandlerAbi,
    marketingWallet
  );
  const sftHolderContract = new ethers.Contract(
    addresses.sftHolderProxy,
    WOWSERC1155Abi,
    marketingWallet
  );
  const sftMinterContract = new ethers.Contract(
    addresses.sftMinterProxy,
    WOWSSftMinterAbi,
    marketingWallet
  );
  const tradeFloorContract = new ethers.Contract(
    addresses.tradeFloorProxy,
    TradeFloorAbi,
    marketingWallet
  );

  return {
    tokenContract,
    rewardHandlerContract,
    sftHolderContract,
    sftMinterContract,
    tradeFloorContract,
  };
});

describe('SFT contracts', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;

  before(async function () {
    this.timeout(60 * 1000);

    // Get the Signers
    [signer, marketingWallet] = await hardhat.ethers.getSigners();
  });

  //////////////////////////////////////////////////////////////////////////////
  // SFT contract
  //////////////////////////////////////////////////////////////////////////////

  it('should check access', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, sftMinterContract, tradeFloorContract } =
      await setupTest();

    const DEFAULT_ADMIN_ROLE = await sftHolderContract.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await sftHolderContract.MINTER_ROLE();
    const CHAIN_ROLE = await sftHolderContract.CHAIN_ROLE();

    // Test deployer
    chai.expect(
      await sftHolderContract.hasRole(DEFAULT_ADMIN_ROLE, signer.address)
    ).to.be.false;
    chai.expect(await sftHolderContract.hasRole(MINTER_ROLE, signer.address)).to
      .be.false;
    chai.expect(await sftHolderContract.hasRole(CHAIN_ROLE, signer.address)).to
      .be.false;

    // Test marketing wallet
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        marketingWallet.address
      )
    ).to.be.true;
    chai.expect(
      await sftHolderContract.hasRole(MINTER_ROLE, marketingWallet.address)
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(CHAIN_ROLE, marketingWallet.address)
    ).to.be.false;

    // Test SFT minter contract
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        sftMinterContract.address
      )
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(MINTER_ROLE, sftMinterContract.address)
    ).to.be.true;
    chai.expect(
      await sftHolderContract.hasRole(CHAIN_ROLE, sftMinterContract.address)
    ).to.be.false;

    // Test trade floor contract
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        tradeFloorContract.address
      )
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(MINTER_ROLE, tradeFloorContract.address)
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(CHAIN_ROLE, tradeFloorContract.address)
    ).to.be.false;

    // Test trade floor proxy contract
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        tradeFloorContract.address
      )
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(MINTER_ROLE, tradeFloorContract.address)
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(CHAIN_ROLE, tradeFloorContract.address)
    ).to.be.false;
  });

  it('should get token data', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Test parameters
    const wowsTokenId = ethers.BigNumber.from('0x0');
    const customTokenId = ethers.BigNumber.from('0x100000000');

    // Check WOWS token data
    let [mintTimestamp, level] = await sftHolderContract.getTokenData(
      wowsTokenId
    );
    chai.expect(mintTimestamp).to.equal(0);
    chai.expect(level).to.equal(0);

    // Check custom token data
    [mintTimestamp, level] = await sftHolderContract.getTokenData(
      customTokenId
    );
    chai.expect(mintTimestamp).to.equal(0);
    chai.expect(level).to.equal(0);
  });

  it('should get token IDs', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Test parameters
    const account = marketingWallet.address;

    // Check token IDs
    const result = await sftHolderContract.getTokenIds(account);
    chai.expect(result.length).to.equal(0);
  });

  //////////////////////////////////////////////////////////////////////////////
  // SFT minter contract
  //////////////////////////////////////////////////////////////////////////////

  it('should get card spec', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = await setupTest();

    // Test parameters
    const level = 1;
    const cardId = 1;

    // Check card data
    const [prices, minted, caps] = await sftMinterContract.getBaseSpec(
      [level],
      [cardId]
    );
    chai.expect(caps[0]).to.equal(40);
    chai.expect(minted[0]).to.equal(0);
  });

  it('should set WOWS level cap', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = await setupTest();

    // Test empty arrays
    let levels = [];
    let newCaps = [];
    let newPrices = [];
    let tx = sftMinterContract.setBaseSpec(
      levels,
      newCaps,
      newPrices,
      ADDRESS_ZERO
    );
    await chai.expect(tx).to.not.be.reverted;

    // Test mismatching lengths
    levels = [0];
    newCaps = [200, 200];
    newPrices = ['2500000000000000000'];
    tx = sftMinterContract.setBaseSpec(
      levels,
      newCaps,
      newPrices,
      ADDRESS_ZERO
    );
    await chai.expect(tx).to.be.revertedWith('WM: Length mismatch');

    // Set level caps
    levels = [0, 1];
    newCaps = [200, 200];
    newPrices = ['2500000000000000000', '4500000000000000000'];
    tx = sftMinterContract.setBaseSpec(
      levels,
      newCaps,
      newPrices,
      ADDRESS_ZERO
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should have an owner', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = await setupTest();

    const DEFAULT_ADMIN_ROLE = await sftMinterContract.DEFAULT_ADMIN_ROLE();

    chai.expect(
      await sftMinterContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        marketingWallet.address
      )
    ).to.be.true;
  });

  it('should have reward role for Reward handler', async function () {
    this.timeout(60 * 1000);

    const { rewardHandlerContract, sftMinterContract } = await setupTest();

    const RH_DEFAULT_ADMIN_ROLE =
      await rewardHandlerContract.DEFAULT_ADMIN_ROLE();
    const RH_REWARD_ROLE = await rewardHandlerContract.REWARD_ROLE();

    // Check roles of SFT minter for the ERC-20 token contract
    chai.expect(
      await rewardHandlerContract.hasRole(
        RH_DEFAULT_ADMIN_ROLE,
        sftMinterContract.address
      )
    ).to.be.false;
    chai.expect(
      await rewardHandlerContract.hasRole(
        RH_REWARD_ROLE,
        sftMinterContract.address
      )
    ).to.be.true;
  });

  it('should get SFT prices', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = await setupTest();

    // Test parameters
    const levels = [0, 1, 4, 5];
    const cards = [0, 0, 0, 0];
    const referencePrices = [
      '2500000000000000000',
      '4500000000000000000',
      '2500000000000000000',
      '4500000000000000000',
    ];

    // Check initial prices
    const [prices, ,] = await sftMinterContract.getBaseSpec(levels, cards);
    for (let i = 0; i < 4; i++) {
      const referencePrice = referencePrices[i];
      const price = prices[i];
      chai.expect(price).to.equal(referencePrice);
    }
  });

  it('should set SFT prices', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = await setupTest();

    // Test parameters
    const levels = [0, 1, 2, 3];
    const cards = [0, 0, 0, 0];
    const caps = [40, 40, 40, 40];
    const referencePrices = ['100', '300', '100', '300'];

    // Set prices
    const tx = sftMinterContract.setBaseSpec(
      levels,
      caps,
      referencePrices,
      ADDRESS_ZERO
    );
    await chai.expect(tx).to.not.be.reverted;

    // Check new prices
    const [prices, ,] = await sftMinterContract.getBaseSpec(levels, cards);
    for (let i = 0; i < 4; i++) {
      const referencePrice = referencePrices[i];
      const price = prices[i];
      chai.expect(price).to.equal(referencePrice);
    }
  });

  it('should set reward handler', async function () {
    this.timeout(60 * 1000);

    const { rewardHandlerContract, sftMinterContract } = await setupTest();

    // Set reward handler
    const tx = sftMinterContract.setRewardHandler(
      rewardHandlerContract.address
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should mint a WOWS SFT', async function () {
    this.timeout(60 * 1000);

    const { tokenContract, sftHolderContract, sftMinterContract } =
      await setupTest();

    // Test parameters
    const level = 1;
    const cardId = 2;
    const wowsTokenId = ethers.BigNumber.from('0x01020000');
    const level1Price = '4500000000000000000';
    const cFolioType = 0;

    // Approve SFT minter spending WOWS
    let tx = tokenContract.approve(
      sftMinterContract.address,
      ethers.BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    await chai.expect(tx).to.not.be.reverted;

    // Mint the WOWS SFT
    tx = sftMinterContract.mintWowsSFT(marketingWallet.address, level, cardId);
    await chai.expect(tx).to.emit(sftMinterContract, 'Mint').withArgs(
      marketingWallet.address, // Recipient
      wowsTokenId, // Token ID
      level1Price, // Price
      cFolioType // CFolioItemType
    );

    // Check the token's ownership (NFT balance is always 1)
    const balance = await sftHolderContract.balanceOf(
      marketingWallet.address,
      wowsTokenId
    );
    chai.expect(balance).to.equal(1);

    // Check the owner's token count
    const result = await sftHolderContract.getTokenIds(marketingWallet.address);
    chai.expect(result.length).to.equal(1);
    chai.expect(result[0]).to.equal(wowsTokenId);

    // Query the token ID in the SFT contract
    const [mintTimestamp, tokenLevel] = await sftHolderContract.getTokenData(
      wowsTokenId
    );
    chai.expect(mintTimestamp).to.not.equal(0);
    chai.expect(tokenLevel).to.equal(level);

    // Get the address of the clone contract
    const cryptofolioAddress = await sftHolderContract.tokenIdToAddress(
      wowsTokenId
    );
    chai.expect(cryptofolioAddress).to.be.properAddress;
  });
});
