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
import { ethers, utils } from 'ethers';
import fs from 'fs';

import UniswapV2ERC20Abi from '../../src/abi/contracts/depends/uniswap-v2-core/UniswapV2ERC20.sol/UniswapV2ERC20.json';
import BoosterAbi from '../../src/abi/contracts/src/booster/Booster.sol/Booster.json';
import CFolioItemHandlerLpAbi from '../../src/abi/contracts/src/cfolio/CFolioItemHandlerLP.sol/CFolioItemHandlerLP.json';
import PresaleAbi from '../../src/abi/contracts/src/crowdsale/Crowdsale.sol/Crowdsale.json';
import WOWSSftMinterAbi from '../../src/abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import ControllerAbi from '../../src/abi/contracts/src/investment/Controller.sol/Controller.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import WOWSERC1155Abi from '../../src/abi/contracts/src/token/WOWSErc1155.sol/WOWSERC1155.json';
import { hardhat } from '../utils/hardhat';

chai.use(solidity);

// Path to generated address registry file
const GENERATED_ADDRESSES = `${__dirname}/../../src/config/generated-addresses.json`;

// Addresses are lazy-loaded
let addresses = null;

// Helper function
function toEth(wei: ethers.BigNumber): number {
  // Scale to 4 decimal places for integer division
  const weiScaled = wei.mul(1e4);

  const ethScaled = weiScaled.div(1e9).div(1e9);

  const eth = ethScaled.toNumber() / 1e4;

  return eth;
}

// Helper function
function toWei(n: number, decimals = 18) {
  const parsed = typeof n === 'number' ? n.toFixed(decimals) : n;
  return ethers.utils.parseUnits(parsed, decimals);
}

type RewardInfo = {
  total?: ethers.BigNumber;
  rewardDuration?: number;
  rewardPerDuration?: ethers.BigNumber;
  rewardShare?: ethers.BigNumber;
  rewardEarned?: ethers.BigNumber;
};

// Parse RewardInfo
function parseRewardInfo(result: ethers.BigNumber[]): RewardInfo {
  let readIndex = 0;
  const ri: RewardInfo = {};

  const readUint256 = (s: string, i: number) =>
    ethers.BigNumber.from('0x' + s.substr(i * 64 + 2, 64));

  ri.total = readUint256(result, readIndex++);
  ri.rewardDuration = readUint256(result, readIndex++).toNumber();
  ri.rewardPerDuration = readUint256(result, readIndex++);
  ri.rewardShare = readUint256(result, readIndex++);
  ri.rewardEarned = readUint256(result, readIndex++);

  return ri;
}

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

  const lpBalance = ethers.BigNumber.from('12000000000000000000'); // 12 UNI-V2 LP tokens

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
    addresses.sftHolderProxy,
    WOWSERC1155Abi,
    marketingWallet
  );

  const sftMinterContract = new ethers.Contract(
    addresses.sftMinterProxy,
    WOWSSftMinterAbi,
    marketingWallet
  );

  const presaleContract = new ethers.Contract(
    addresses.presale,
    PresaleAbi,
    marketingWallet
  );

  const boosterContract = new ethers.Contract(
    addresses.boosterProxy,
    BoosterAbi,
    marketingWallet
  );

  const controllerContract = new ethers.Contract(
    addresses.controller,
    ControllerAbi,
    marketingWallet
  );

  const cfolioItemHandlerLPContract = new ethers.Contract(
    addresses.cfolioItemHandlerLPProxy,
    CFolioItemHandlerLpAbi,
    marketingWallet
  );

  //////////////////////////////////////////////////////////////////////////////
  // Setup: LP tokens
  //////////////////////////////////////////////////////////////////////////////

  //
  // Get LP tokens for the marketing wallet
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

  //
  // Refuel reward Farms
  //
  tx = controllerContract.setWorker(marketingWallet.address);
  await chai.expect(tx).to.not.be.reverted;

  tx = controllerContract.refuelFarms([], []);
  await chai.expect(tx).to.not.be.reverted;

  //
  // Approve WOWS and LP
  //

  // Approve SFT minter spending WOWS
  tx = tokenContract.approve(
    sftMinterContract.address,
    ethers.BigNumber.from(
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    )
  );
  await chai.expect(tx).to.not.be.reverted;

  // Approve CFIHLP to transfer our tokens
  tx = uniV2PairContract.approve(addresses.cfolioItemHandlerLPProxy, lpBalance);
  await chai.expect(tx).to.not.be.reverted;

  return {
    lpBalance,
    tokenContract,
    boosterContract,
    cfolioItemHandlerLPContract,
    presaleContract,
    sftHolderContract,
    sftMinterContract,
    uniV2PairContract,
  };
});

describe('Booster rewards', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;
  let teamWallet: SignerWithAddress;
  let contracts = undefined;

  const level1Price = '4500000000000000000';
  const levelWolf = 5;
  const cardIdWolf = 2;
  const defaultCFolioType = 0;
  const wowsTokenIdWolf = ethers.BigNumber.from('0x05020000');
  const cFolioItemType = 0; // Card type 0, registered in minter for cfolioItemHandlerLP
  let cfolioWolf = undefined;

  const investBalance = ethers.BigNumber.from('10000000000000000000'); // 10 UNI-V2 LP tokens

  before(async function () {
    this.timeout(60 * 1000);

    // Get the Signers
    [signer, marketingWallet, teamWallet] = await hardhat.ethers.getSigners();

    // Get contracts
    contracts = await setupTest();
  });

  it('should check LP wallet balance', async function () {
    this.timeout(60 * 1000);

    const { uniV2PairContract, lpBalance } = contracts;

    // Check wallet balance
    const currentLpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentLpBalance).to.equal(lpBalance);
  });

  it('should mint wolf SFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, sftMinterContract } = contracts;

    // Mint the Wolf WOWS SFT
    const tx = sftMinterContract.mintWowsSFT(
      marketingWallet.address,
      levelWolf,
      cardIdWolf
    );
    await chai.expect(tx).to.emit(sftMinterContract, 'Mint').withArgs(
      marketingWallet.address, // Recipient
      wowsTokenIdWolf, // Token ID
      level1Price, // Price
      defaultCFolioType // CFolioItemType
    );
    cfolioWolf = await sftHolderContract.tokenIdToAddress(wowsTokenIdWolf);
  });

  it('should deposit LP NFT into wolf cryptofolio', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = contracts;

    // Mint a new LP investment type into Wolf
    const tx = sftMinterContract.mintCFolioItemSFT(
      cFolioItemType,
      wowsTokenIdWolf,
      [investBalance]
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should fast forward 1 day to produce rewards', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    await hardhat.network.provider.send('evm_increaseTime', [24 * 60 * 60]);
    await hardhat.network.provider.send('evm_mine');

    // Get reward information
    const rewardInfo = parseRewardInfo(
      await cfolioItemHandlerLPContract.getRewardInfo([wowsTokenIdWolf])
    );
    // 50% prowess -> 5LP token share
    chai
      .expect(rewardInfo.rewardShare)
      .to.be.equal(ethers.BigNumber.from('5000000000000000000'));
    // ~13 WOWS earned in 24 hours
    chai
      .expect(rewardInfo.rewardEarned)
      .to.be.within(
        ethers.BigNumber.from('13736000000000000000'),
        ethers.BigNumber.from('13737000000000000000')
      );
  });

  it('should fail to lock the rewards for 1 second', async function () {
    this.timeout(60 * 1000);

    const { sftMinterContract } = contracts;

    // Mint a new LP investment type into Wolf
    const tx = sftMinterContract.claimSFTRewards(wowsTokenIdWolf, 1);
    await chai.expect(tx).to.be.revertedWith('B: LockPeriod wrong');
  });

  it('should lock the rewards for 1 month', async function () {
    this.timeout(60 * 1000);

    const { boosterContract, sftMinterContract } = contracts;

    // Mint a new LP investment type into Wolf
    const tx = await sftMinterContract.claimSFTRewards(
      wowsTokenIdWolf,
      2592000
    );

    await chai.expect(tx).to.emit(boosterContract, 'TokensLocked');

    const result = await boosterContract.getRewardInfo([wowsTokenIdWolf]);

    // Should match the initial lock value
    chai
      .expect(result.locked[0])
      .to.be.within(
        ethers.BigNumber.from('14881000000000000000'),
        ethers.BigNumber.from('14882000000000000000')
      );
    // There should be no pending directly after lock
    chai.expect(result.pending[0]).to.be.equal(ethers.BigNumber.from('0'));
  });

  it('should fast forward 15 days to produce rewards', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    await hardhat.network.provider.send('evm_increaseTime', [
      15 * 24 * 60 * 60,
    ]);
    await hardhat.network.provider.send('evm_mine');

    // Get reward information
    const rewardInfo = parseRewardInfo(
      await cfolioItemHandlerLPContract.getRewardInfo([wowsTokenIdWolf])
    );
    // ~178 WOWS earned in 15 days hours (end of farm duration)
    chai
      .expect(rewardInfo.rewardEarned)
      .to.be.within(
        ethers.BigNumber.from('178570000000000000000'),
        ethers.BigNumber.from('178580000000000000000')
      );
  });

  // Check for booster rewards, we should have ~ 5% earned (10% per month)
  it('should have booster rewards rewards', async function () {
    this.timeout(60 * 1000);

    const { boosterContract } = contracts;
    const result = await boosterContract.getRewardInfo([wowsTokenIdWolf]);

    // Should be ~ 5% of the locked value
    chai
      .expect(result.pending[0])
      .to.be.within(
        ethers.BigNumber.from('744000000000000000'),
        ethers.BigNumber.from('745000000000000000')
      );
  });

  it('should add the rewards into 1 month lock', async function () {
    this.timeout(60 * 1000);

    const { boosterContract, sftMinterContract } = contracts;

    // Mint a new LP investment type into Wolf
    const tx = await sftMinterContract.claimSFTRewards(
      wowsTokenIdWolf,
      1 // rewardDuration should be meaningless but must be > 0
    );
    await chai.expect(tx).to.emit(boosterContract, 'MoreAdded');

    const result = await boosterContract.getRewardInfo([wowsTokenIdWolf]);

    // Should match the initial lock value
    chai
      .expect(result.locked[0])
      .to.be.within(
        ethers.BigNumber.from('200891000000000000000'),
        ethers.BigNumber.from('200893000000000000000')
      );
    // Should be still ~ 5% of the orignal locked value
    chai
      .expect(result.pending[0])
      .to.be.within(
        ethers.BigNumber.from('744000000000000000'),
        ethers.BigNumber.from('745000000000000000')
      );
  });

  it('should fast forward 10 days to produce rewards', async function () {
    this.timeout(60 * 1000);

    const { boosterContract } = contracts;

    await hardhat.network.provider.send('evm_increaseTime', [
      10 * 24 * 60 * 60,
    ]);
    await hardhat.network.provider.send('evm_mine');

    const result = await boosterContract.getRewardInfo([wowsTokenIdWolf]);

    // Should match the initial lock value
    chai
      .expect(result.locked[0])
      .to.be.within(
        ethers.BigNumber.from('200891000000000000000'),
        ethers.BigNumber.from('200893000000000000000')
      );
    // Should be still ~ 5% of the orignal locked value
    chai
      .expect(result.pending[0])
      .to.be.within(
        ethers.BigNumber.from('7440000000000000000'),
        ethers.BigNumber.from('7450000000000000000')
      );
  });

  it('should fast forward over the 1 month', async function () {
    this.timeout(60 * 1000);

    const { boosterContract } = contracts;

    await hardhat.network.provider.send('evm_increaseTime', [
      10 * 24 * 60 * 60,
    ]);
    await hardhat.network.provider.send('evm_mine');

    const result = await boosterContract.getRewardInfo([wowsTokenIdWolf]);

    // Should match the initial lock value
    chai.expect(result.locked[0]).to.be.equal(result.pending[0]);
  });

  it('should fail to relock claimed the rewards', async function () {
    this.timeout(60 * 1000);

    const { boosterContract } = contracts;

    const tx = boosterContract.claimRewards(wowsTokenIdWolf, true);
    await chai.expect(tx).to.be.revertedWith('SafeMath#sub: UNDERFLOW');
  });

  it('should claim the rewards into marketingWallet', async function () {
    this.timeout(60 * 1000);

    const { boosterContract } = contracts;

    const tx = await boosterContract.claimRewards(wowsTokenIdWolf, false);

    await chai.expect(tx).to.emit(boosterContract, 'RewardsClaimed');

    const result = await boosterContract.getRewardInfo([wowsTokenIdWolf]);

    // Should be reset to 0
    chai.expect(result.locked[0]).to.be.equal(ethers.BigNumber.from('0'));
    // Should be reset to 0
    chai.expect(result.pending[0]).to.be.equal(ethers.BigNumber.from('0'));
  });
});
