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
import TradeFloorProxyAbi from '../../src/abi/contracts/src/proxy/TradeFloorProxy.sol/TradeFloorProxy.json';
import TradeFloorAbi from '../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import WOWSCryptofolioAbi from '../../src/abi/contracts/src/token/WOWSCryptofolio.sol/WOWSCryptofolio.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import WOWSERC1155Abi from '../../src/abi/contracts/src/token/WOWSErc1155.sol/WOWSERC1155.json';
import TestStakingContractAbi from '../../src/abi/contracts/test/TestStakingContract.sol/TestStakingContract.json';
import { hardhat } from '../../src/web3/hardhat';

chai.use(solidity);

// Contract ABIs
const TRADE_FLOOR_ABI = `${__dirname}/../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json`;

// ERC-1155 metadata URI
const METADATA_URI = 'https://4travelers.de/wolves_assets/metadata/';

// Path to generated address registry file
const GENERATED_ADDRESSES = `${__dirname}/../../src/config/generated-addresses.json`;

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
  const stakingContract = new ethers.Contract(
    addresses.stakingTest,
    TestStakingContractAbi,
    marketingWallet
  );

  return {
    tokenContract,
    rewardHandlerContract,
    sftHolderContract,
    sftMinterContract,
    tradeFloorContract,
    tradeFloorProxyContract,
    stakingContract,
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

    const {
      sftHolderContract,
      sftMinterContract,
      tradeFloorContract,
      tradeFloorProxyContract,
    } = await setupTest();

    const DEFAULT_ADMIN_ROLE = await sftHolderContract.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await sftHolderContract.MINTER_ROLE();
    const TRADEFLOOR_ROLE = await sftHolderContract.TRADEFLOOR_ROLE();
    const OPERATOR_ROLE = await sftHolderContract.OPERATOR_ROLE();

    // Test deployer
    chai.expect(
      await sftHolderContract.hasRole(DEFAULT_ADMIN_ROLE, signer.address)
    ).to.be.false;
    chai.expect(await sftHolderContract.hasRole(MINTER_ROLE, signer.address)).to
      .be.false;
    chai.expect(
      await sftHolderContract.hasRole(TRADEFLOOR_ROLE, signer.address)
    ).to.be.false;
    chai.expect(await sftHolderContract.hasRole(OPERATOR_ROLE, signer.address))
      .to.be.false;

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
      await sftHolderContract.hasRole(TRADEFLOOR_ROLE, marketingWallet.address)
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(OPERATOR_ROLE, marketingWallet.address)
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
      await sftHolderContract.hasRole(
        TRADEFLOOR_ROLE,
        sftMinterContract.address
      )
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(OPERATOR_ROLE, sftMinterContract.address)
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
      await sftHolderContract.hasRole(
        TRADEFLOOR_ROLE,
        tradeFloorContract.address
      )
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(OPERATOR_ROLE, tradeFloorContract.address)
    ).to.be.false;

    // Test trade floor proxy contract
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        tradeFloorProxyContract.address
      )
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(
        MINTER_ROLE,
        tradeFloorProxyContract.address
      )
    ).to.be.false;
    chai.expect(
      await sftHolderContract.hasRole(
        TRADEFLOOR_ROLE,
        tradeFloorProxyContract.address
      )
    ).to.be.true;
    chai.expect(
      await sftHolderContract.hasRole(
        OPERATOR_ROLE,
        tradeFloorProxyContract.address
      )
    ).to.be.false;
  });

  it('should have a trade floor', async function () {
    this.timeout(60 * 1000);

    const {
      sftHolderContract,
      tradeFloorContract,
      tradeFloorProxyContract,
    } = await setupTest();

    // Check that the SFT knows the trade floor
    let isTradeFloor = await sftHolderContract.isTradeFloor(
      tradeFloorContract.address
    );
    chai.expect(isTradeFloor).to.be.false;
    isTradeFloor = await sftHolderContract.isTradeFloor(
      tradeFloorProxyContract.address
    );
    chai.expect(isTradeFloor).to.be.true;
  });

  it('should know the next WOWS token ID', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Test parameters
    const level = 1;
    const cardId = 1;

    // Check next mintable token ID of a given level and card ID
    // Result is a tuple of (found, tokenId)
    const result = await sftHolderContract.getNextMintableTokenId(
      level,
      cardId
    );

    // The result should be found
    const found = result[0];
    chai.expect(found).to.be.true;

    // The token ID should be 0x01010000 (level = 0x01, card ID = 0x01)
    const tokenId = result[1];
    chai.expect(tokenId).to.equal('0x01010000');
  });

  it('should know the next custom token ID', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Check next mintable custom token ID for custom SFTs
    const customtokenId = await sftHolderContract.getNextMintableCustomToken();
    chai.expect(customtokenId).to.equal('0x100000000');
  });

  it('should have a WOWS URI', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Check URI of token 0x0
    let tokenId = ethers.BigNumber.from('0x0');
    let uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(METADATA_URI + '0000.json');

    // Check URI of token 0x01010000
    // (level = 0x01, card ID = 0x01, token index = 0x0000)
    tokenId = ethers.BigNumber.from('0x01010000');
    uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(METADATA_URI + '0101.json');

    // Check URI of token 0x0101ffff
    // (level = 0x01, card ID = 0x01, token index = 0xffff)
    tokenId = ethers.BigNumber.from('0x0101ffff');
    uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(METADATA_URI + '0101.json');

    // Check URI of token 0xffff0000
    // (level = 0xff, card ID = 0xff, token index = 0x0000)
    tokenId = ethers.BigNumber.from('0xffff0000');
    uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(METADATA_URI + 'FFFF.json');

    // Check URI of first custom token 0x10000000
    // (level = 0xff, card ID = 0xff, token index = 0x0000)
    // The result should be empty because no default has been set
    tokenId = ethers.BigNumber.from('0x100000000');
    uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(METADATA_URI + '0100000000.json');
  });

  it('should have a contract metadata URI', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Check contract metadata URI
    const contractUri = await sftHolderContract.contractURI();
    chai.expect(contractUri).to.equal(METADATA_URI + 'mainnet_contract.json');
  });

  it('should set custom default URI', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();
    const MINTER_ROLE = await sftHolderContract.MINTER_ROLE();

    // Default URI of first custom token should be empty initially
    const tokenId = ethers.BigNumber.from('0x100000000');
    let uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(METADATA_URI + '0100000000.json');

    // Grant minter role
    let tx = sftHolderContract.grantRole(MINTER_ROLE, marketingWallet.address);
    await chai.expect(tx).to.not.be.reverted;

    // Set default URI for custom tokens
    const referenceUri = METADATA_URI + 'custom.json';
    tx = sftHolderContract.setCustomURI(tokenId, referenceUri);
    await chai.expect(tx).to.not.be.reverted;

    // Check the default URI for custom tokens
    uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(referenceUri);
  });

  it('should set WOWS URI', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    const DEFAULT_ADMIN_ROLE = await sftHolderContract.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await sftHolderContract.MINTER_ROLE();

    // Check the URI of (level = 1, card ID = 1)
    const tokenId = ethers.BigNumber.from('0x01010000');
    let uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(METADATA_URI + '0101.json');

    // Set the URI of (level = 1, card ID = 1)
    const referenceUri = METADATA_URI + 'custom.json';
    let tx = sftHolderContract.setCustomURI(tokenId, referenceUri);
    await chai.expect(tx).to.be.revertedWith('Access denied');

    // Check roles (marketing wallet should be admin but not minter)
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        marketingWallet.address
      )
    ).to.be.true;
    chai.expect(
      await sftHolderContract.hasRole(MINTER_ROLE, marketingWallet.address)
    ).to.be.false;

    // Grant minter role
    tx = sftHolderContract.grantRole(MINTER_ROLE, marketingWallet.address);
    await chai.expect(tx).to.not.be.reverted;

    // Check roles (marketing wallet should be admin AND minter)
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        marketingWallet.address
      )
    ).to.be.true;
    chai.expect(
      await sftHolderContract.hasRole(MINTER_ROLE, marketingWallet.address)
    ).to.be.true;

    // Set the URI of (level = 1, card ID = 1)
    tx = sftHolderContract.setCustomURI(tokenId, referenceUri);
    await chai.expect(tx).to.be.revertedWith('invalid tokenId');

    // Check the URI of (level = 1, card ID = 1)
    uri = await sftHolderContract.uri(tokenId);
    chai.expect(uri).to.equal(METADATA_URI + '0101.json');
  });

  it('should set custom URI', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    const DEFAULT_ADMIN_ROLE = await sftHolderContract.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await sftHolderContract.MINTER_ROLE();

    // Test parameters
    const wowsReferenceUri = METADATA_URI + '0101.json';
    const customReferenceUri = METADATA_URI + 'custom.json';
    const baseMetadataUri = METADATA_URI + 'custom/';
    const wowsTokenId = ethers.BigNumber.from('0x01010000');
    const customTokenId = ethers.BigNumber.from('0x100000000');

    // Test access control
    let tx = sftHolderContract.setCustomURI(customTokenId, customReferenceUri);
    await chai.expect(tx).to.be.revertedWith('Access denied');

    // Check roles (marketing wallet should be admin but not minter)
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        marketingWallet.address
      )
    ).to.be.true;
    chai.expect(
      await sftHolderContract.hasRole(MINTER_ROLE, marketingWallet.address)
    ).to.be.false;

    // Grant minter role
    tx = sftHolderContract.grantRole(MINTER_ROLE, marketingWallet.address);
    await chai.expect(tx).to.not.be.reverted;

    // Check roles (marketing wallet should be admin AND minter)
    chai.expect(
      await sftHolderContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        marketingWallet.address
      )
    ).to.be.true;
    chai.expect(
      await sftHolderContract.hasRole(MINTER_ROLE, marketingWallet.address)
    ).to.be.true;

    // Check the current URI of custom token
    let uri = await sftHolderContract.uri(customTokenId);
    chai.expect(uri).to.equal(METADATA_URI + '0100000000.json');

    // Set the URI of custom token
    tx = sftHolderContract.setCustomURI(customTokenId, customReferenceUri);
    await chai.expect(tx).to.not.be.reverted;

    // Check the new URI of custom token
    uri = await sftHolderContract.uri(customTokenId);
    chai.expect(uri).to.equal(customReferenceUri);

    // Check the current URI of WOWS token
    uri = await sftHolderContract.uri(wowsTokenId);
    chai.expect(uri).to.equal(wowsReferenceUri);

    // Set the URI of WOWS token (should fail)
    tx = sftHolderContract.setCustomURI(wowsTokenId, customReferenceUri);
    await chai.expect(tx).to.be.revertedWith('invalid tokenId');

    // Check the default URI of WOWS token
    uri = await sftHolderContract.uri(0);
    chai.expect(uri).to.equal(METADATA_URI + '0000.json');

    // Set the default URI of WOWS token
    tx = sftHolderContract.setBaseMetadataURI(baseMetadataUri);
    await chai.expect(tx).to.not.be.reverted;

    // Check the new URI of WOWS token
    uri = await sftHolderContract.uri(wowsTokenId);
    chai.expect(uri).to.equal(baseMetadataUri + '0101.json');
  });

  it('should get card data', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Test parameters
    const level = 1;
    const cardId = 1;

    // Check card data
    const [cap, minted] = await sftHolderContract.getCardData(level, cardId);
    chai.expect(cap).to.equal(20);
    chai.expect(minted).to.equal(0);
  });

  it('should get card data by batch', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Test parameters
    const level = [1, 2];
    const cardId = [1, 2];

    // Check card data by batch
    const [
      cap,
      minted,
      cap2,
      minted2,
    ] = await sftHolderContract.getCardDataBatch(level, cardId);
    chai.expect(cap).to.equal(20);
    chai.expect(minted).to.equal(0);
    chai.expect(cap2).to.equal(0);
    chai.expect(minted2).to.equal(0);
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

  it('should set WOWS level cap', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = await setupTest();

    // Test empty arrays
    let levels = [];
    let newCaps = [];
    let tx = sftHolderContract.setWowsLevelCaps(levels, newCaps);
    await chai.expect(tx).to.not.be.reverted;

    // Test mismatching lengths
    levels = [0];
    newCaps = [200, 200];
    tx = sftHolderContract.setWowsLevelCaps(levels, newCaps);
    await chai.expect(tx).to.be.revertedWith("Lengths don't match");

    // Set level caps
    levels = [0, 1];
    newCaps = [200, 200];
    tx = sftHolderContract.setWowsLevelCaps(levels, newCaps);
    await chai.expect(tx).to.not.be.reverted;
  });

  //////////////////////////////////////////////////////////////////////////////
  // SFT minter contract
  //////////////////////////////////////////////////////////////////////////////

  it('should have an owner', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = await setupTest();

    // Check ownership
    chai
      .expect(await sftMinterContract.owner())
      .to.equal(marketingWallet.address);
  });

  it('should have reward role for Reward handler', async function () {
    this.timeout(60 * 1000);

    const { rewardHandlerContract, sftMinterContract } = await setupTest();

    const RH_DEFAULT_ADMIN_ROLE = await rewardHandlerContract.DEFAULT_ADMIN_ROLE();
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
    const referencePrices = [
      '1000000000000000000',
      '3000000000000000000',
      '1000000000000000000',
      '3000000000000000000',
    ];

    // Check initial prices
    const prices = await sftMinterContract.getPrices(levels);
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
    const referencePrices = ['100', '300', '100', '300'];

    // Set prices
    const tx = sftMinterContract.setPrices(levels, referencePrices);
    await chai.expect(tx).to.not.be.reverted;

    // Check new prices
    const prices = await sftMinterContract.getPrices(levels);
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

  it('should mint a WOWS SFT and stake NFTs in its cryptofolio', async function () {
    this.timeout(60 * 1000);

    const {
      tokenContract,
      sftHolderContract,
      sftMinterContract,
      tradeFloorProxyContract,
      stakingContract,
    } = await setupTest();

    // Test parameters
    const level = 1;
    const cardId = 2;
    const wowsTokenId = ethers.BigNumber.from('0x01020000');
    const level1Price = '3000000000000000000';

    // Approve SFT minter spending WOWS
    let tx = tokenContract.approve(
      sftMinterContract.address,
      ethers.BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      )
    );
    await chai.expect(tx).to.not.be.reverted;

    // Mint the WOWS token
    tx = sftMinterContract.mintWowsSFT(marketingWallet.address, level, cardId);
    await chai.expect(tx).to.emit(sftMinterContract, 'Mint').withArgs(
      marketingWallet.address, // Recipient
      wowsTokenId, // Token ID
      level1Price // Price
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

    const cryptofolioContract = new ethers.Contract(
      cryptofolioAddress,
      WOWSCryptofolioAbi,
      marketingWallet
    );

    // Mint an NFT in the contract for the clone address
    const tradeFloorTokenId = ethers.BigNumber.from('0x10000000000000000');
    tx = stakingContract.stake(cryptofolioAddress, tradeFloorTokenId);
    /*
    // TODO
    await chai
      .expect(tx)
      .to.emit(tradeFloorContract, 'TransferSingle')
      .withArgs(
        stakingContract.address,
        ethers.BigNumber.from('0'),
        cryptofolioAddress,
        tradeFloorTokenId,
        1
      );
    */
    await chai
      .expect(tx)
      .to.emit(cryptofolioContract, 'CryptoFolioAdded')
      .withArgs(
        cryptofolioAddress,
        tradeFloorProxyContract.address,
        [tradeFloorTokenId],
        [1]
      );

    const tradeFloorTokenId2 = ethers.BigNumber.from('0x10000000000000001');
    tx = stakingContract.stake(cryptofolioAddress, tradeFloorTokenId2);
    // TODO
    /*
    await chai
      .expect(tx)
      .to.emit(tradeFloorContract, 'TransferSingle')
      .withArgs(
        stakingContract.address,
        ethers.BigNumber.from('0'),
        cryptofolioAddress,
        tradeFloorTokenId2,
        1
      );
    */
    await chai
      .expect(tx)
      .to.emit(cryptofolioContract, 'CryptoFolioAdded')
      .withArgs(
        cryptofolioAddress,
        tradeFloorProxyContract.address,
        [tradeFloorTokenId2],
        [1]
      );

    // Check cryptofolio and the NFT should appear
    let [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(2);
    chai.expect(tokenIds.length).to.equal(2);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenId);
    chai.expect(tokenIds[1]).to.equal(tradeFloorTokenId2);

    // Approval is needed to burn the NFT
    tx = cryptofolioContract.setApprovalForAll(stakingContract.address, true);
    await chai.expect(tx).to.not.be.reverted;

    // Burn one NFT
    tx = stakingContract.unstake(cryptofolioAddress, tradeFloorTokenId);
    await chai.expect(tx).to.not.be.reverted;

    // Check the cryptofolio again and verify it only holds the second NFT
    [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(tradeFloorTokenId2);

    // Burn the second NFT
    tx = stakingContract.unstake(cryptofolioAddress, tradeFloorTokenId2);
    await chai.expect(tx).to.not.be.reverted;

    // Check the cryptofolio again and it should be in its original state
    [tokenIds, idsLength] = await cryptofolioContract.getCryptofolio(
      tradeFloorProxyContract.address
    );
    chai.expect(idsLength).to.equal(0);
  });
});
