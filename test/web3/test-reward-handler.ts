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

import BoosterAbi from '../../src/abi/contracts/src/booster/Booster.sol/Booster.json';
import RewardHandlerAbi from '../../src/abi/contracts/src/investment/RewardHandler.sol/RewardHandler.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import { ADDRESS_ZERO } from '../utils/constants';
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
  const boosterContract = new ethers.Contract(
    addresses.booster,
    BoosterAbi,
    marketingWallet
  );
  const rewardHandlerContract = new ethers.Contract(
    addresses.rewardHandler,
    RewardHandlerAbi,
    marketingWallet
  );

  // Grant permissions
  const TESTER_ROLE = await rewardHandlerContract.TESTER_ROLE();

  const tx = rewardHandlerContract.grantRole(
    TESTER_ROLE, // Role
    marketingWallet.address // Account
  );
  await chai.expect(tx).to.emit(rewardHandlerContract, 'RoleGranted').withArgs(
    TESTER_ROLE, // Role
    marketingWallet.address, // Account
    marketingWallet.address // Sender
  );

  return {
    tokenContract,
    boosterContract,
    rewardHandlerContract,
  };
});

// Extended fixture that grants the rewarder role
async function setupTestForRewarder(marketingWalletAddress: string) {
  const { tokenContract, boosterContract, rewardHandlerContract } =
    await setupTest();

  const REWARD_ROLE = await rewardHandlerContract.REWARD_ROLE();

  const tx = rewardHandlerContract.grantRole(
    REWARD_ROLE, // Role
    marketingWalletAddress // Account
  );
  await chai.expect(tx).to.emit(rewardHandlerContract, 'RoleGranted').withArgs(
    REWARD_ROLE, // Role
    marketingWalletAddress, // Account
    marketingWalletAddress // Sender
  );

  return {
    tokenContract,
    boosterContract,
    rewardHandlerContract,
  };
}

describe('Reward handler', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;
  let teamWallet: SignerWithAddress;

  before(async function () {
    this.timeout(60 * 1000);

    // Get the Signers
    [signer, marketingWallet, teamWallet] = await hardhat.ethers.getSigners();
  });

  it('should set minimal mint amount', async function () {
    this.timeout(60 * 1000);

    const { rewardHandlerContract } = await setupTest();

    // Test parameters
    const minimalMintAmount = '100000000000000000'; // 0.1 WOWS

    // Set amount using public API
    const tx = rewardHandlerContract.setMinimalMintAmount(minimalMintAmount);
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should distribute to targets', async function () {
    this.timeout(60 * 1000);

    const { tokenContract, boosterContract, rewardHandlerContract } =
      await setupTest();

    // Test parameters
    const amountToDistribute = '1000000000000000000'; // 1 WOWS

    // Distribute with no funds should fail
    let tx = rewardHandlerContract.distributeAll();
    await chai.expect(tx).to.be.revertedWith('Nothing to distribute');

    // Adding funds without role should revert
    tx = rewardHandlerContract.distribute2(
      teamWallet.address,
      amountToDistribute,
      10 * 1e6
    );
    await chai.expect(tx).to.be.revertedWith('Only rewarders');

    // Grant permissions
    const REWARD_ROLE = await rewardHandlerContract.REWARD_ROLE();

    tx = rewardHandlerContract.grantRole(
      REWARD_ROLE, // Role
      marketingWallet.address // Account
    );
    await chai
      .expect(tx)
      .to.emit(rewardHandlerContract, 'RoleGranted')
      .withArgs(
        REWARD_ROLE, // Role
        marketingWallet.address, // Account
        marketingWallet.address // Sender
      );

    // Adding funds with invalid fee should revert
    tx = rewardHandlerContract.distribute2(
      teamWallet.address,
      amountToDistribute,
      1 * 1e7
    );
    await chai.expect(tx).to.be.revertedWith('subtraction overflow');

    // Add funds to the reward handler
    tx = rewardHandlerContract.distribute2(
      teamWallet.address,
      amountToDistribute,
      1 * 1e5
    );

    // Check logs for tokens being minted
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      ADDRESS_ZERO,
      rewardHandlerContract.address,
      '100000000000000000000' // 100 WOWS
    );

    // Check logs for tokens being transfered
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      teamWallet.address,
      '900000000000000000' // 0.9 WOWS
    );

    // Distribute with funds now should succeed
    tx = rewardHandlerContract.distributeAll();

    // Check logs for tokens being transfered
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      teamWallet.address,
      '15000000000000000' // 0.015 WOWS
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      marketingWallet.address,
      '15000000000000000' // 0.015 WOWS
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      boosterContract.address,
      '40000000000000000' // 0.04 WOWS
    );
  });

  it('should terminate contract without selfdestruct', async function () {
    this.timeout(60 * 1000);

    const { tokenContract, boosterContract, rewardHandlerContract } =
      await setupTestForRewarder(marketingWallet.address);

    // Test parameters
    const amountToDistribute = '1000000000000000000'; // 1 WOWS

    // Add funds to the reward handler
    let tx = rewardHandlerContract.distribute2(
      teamWallet.address,
      amountToDistribute,
      1 * 1e5
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      ADDRESS_ZERO,
      rewardHandlerContract.address,
      '100000000000000000000' // 100 WOWS
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      teamWallet.address,
      '900000000000000000' // 0.9 WOWS
    );

    // Transfer to address 0 should revert
    tx = rewardHandlerContract.terminate(ADDRESS_ZERO, false);
    await chai.expect(tx).to.be.revertedWith("Can't transfer to address 0");

    // Transfer to self should revert
    //tx = rewardHandlerContract.terminate(rewardHandlerContract.address, false); // TODO

    // selfdestruct() on the EthereumJS EVM seems to noop, so check ETH balances
    let marketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWallet.address)
    );
    let rewardHandlerBalance = toEth(
      await hardhat.ethers.provider.getBalance(rewardHandlerContract.address)
    );
    chai.expect(marketingBalance).to.be.closeTo(10000, 1);
    chai.expect(rewardHandlerBalance).to.equal(0);

    // Send an amount to reward handler for testing self-destruct
    tx = {
      to: rewardHandlerContract.address,
      value: utils.parseEther('10.0'),
    };
    await marketingWallet.sendTransaction(tx);

    // In production, this must be a contract that inherits from IRewardHandler
    const newRewardHandler = marketingWallet.address;

    // Terminate and transfer funds
    tx = rewardHandlerContract.terminate(newRewardHandler, false);
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      teamWallet.address,
      '15000000000000000' // 0.015 WOWS
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      marketingWallet.address,
      '15000000000000000' // 0.015 WOWS
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      boosterContract.address,
      '40000000000000000' // 0.04 WOWS
    );

    // Check new balances to make sure selfdestruct() wasn't called
    marketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWallet.address)
    );
    rewardHandlerBalance = toEth(
      await hardhat.ethers.provider.getBalance(rewardHandlerContract.address)
    );
    chai.expect(marketingBalance).to.be.closeTo(9990, 1);
    chai.expect(rewardHandlerBalance).to.be.closeTo(10, 1);

    // Second call to terminate should revert
    chai.expect(teamWallet.address).to.be.properAddress;
    tx = rewardHandlerContract.terminate(teamWallet.address, false);
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should terminate contract with selfdestruct', async function () {
    this.timeout(60 * 1000);

    const { tokenContract, boosterContract, rewardHandlerContract } =
      await setupTestForRewarder(marketingWallet.address);

    // Test parameters
    const amountToDistribute = '1000000000000000000'; // 1 WOWS

    // Add funds to the reward handler
    let tx = rewardHandlerContract.distribute2(
      teamWallet.address,
      amountToDistribute,
      1 * 1e5
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      ADDRESS_ZERO,
      rewardHandlerContract.address,
      '100000000000000000000' // 100 WOWS
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      teamWallet.address,
      '900000000000000000' // 0.9 WOWS
    );

    // Transfer to address 0 should revert
    tx = rewardHandlerContract.terminate(ADDRESS_ZERO, true);
    await chai.expect(tx).to.be.revertedWith("Can't transfer to address 0");

    // Transfer to self should revert
    //tx = rewardHandlerContract.terminate(rewardHandlerContract.address, true); // TODO

    // selfdestruct() on the EthereumJS EVM seems to noop, so check ETH balances
    let marketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWallet.address)
    );
    let rewardHandlerBalance = toEth(
      await hardhat.ethers.provider.getBalance(rewardHandlerContract.address)
    );
    chai.expect(marketingBalance).to.be.closeTo(10000, 1);
    chai.expect(rewardHandlerBalance).to.equal(0);

    // Send an amount to reward handler for testing self-destruct
    tx = {
      to: rewardHandlerContract.address,
      value: utils.parseEther('10.0'),
    };
    await marketingWallet.sendTransaction(tx);

    // In production, this must be a contract that inherits from IRewardHandler
    const newRewardHandler = marketingWallet.address;

    // Terminate and transfer funds
    tx = rewardHandlerContract.terminate(newRewardHandler, true);
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      teamWallet.address,
      '15000000000000000' // 0.015 WOWS
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      marketingWallet.address,
      '15000000000000000' // 0.015 WOWS
    );
    await chai.expect(tx).to.emit(tokenContract, 'Transfer').withArgs(
      rewardHandlerContract.address,
      boosterContract.address,
      '40000000000000000' // 0.04 WOWS
    );

    // Check new balances for self-destruct balance transfer
    marketingBalance = toEth(
      await hardhat.ethers.provider.getBalance(marketingWallet.address)
    );
    rewardHandlerBalance = toEth(
      await hardhat.ethers.provider.getBalance(rewardHandlerContract.address)
    );
    chai.expect(marketingBalance).to.be.closeTo(10000, 1);
    chai.expect(rewardHandlerBalance).to.equal(0);
  });
});
