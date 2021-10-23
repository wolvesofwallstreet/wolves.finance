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

import CFolioFarmAbi from '../../src/abi/contracts/src/investment/CFolioFarm.sol/CFolioFarm.json';
import ControllerAbi from '../../src/abi/contracts/src/investment/Controller.sol/Controller.json';
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
  const [signer, marketingWallet, teamWallet] =
    await hardhat.ethers.getSigners();

  // Get contract addresses
  const addresses = await getAddresses();

  // Construct the contract
  const cFolioFarm = new ethers.Contract(
    addresses.cfolioFarmForTest,
    CFolioFarmAbi,
    marketingWallet
  );

  // Construct the contract
  const controller = new ethers.Contract(
    addresses.controller,
    ControllerAbi,
    marketingWallet
  );

  //////////////////////////////////////////////////////////////////////////////
  // Setup: CFolioFarm
  //////////////////////////////////////////////////////////////////////////////

  // Make marketingWallet -> worker
  let tx = controller.setWorker(marketingWallet.address);
  await chai.expect(tx).to.not.be.reverted;

  // Register the test farm
  tx = controller.registerFarm(
    cFolioFarm.address,
    ethers.BigNumber.from('1000000000000000000000'), // Cap
    ethers.BigNumber.from('10000000000000000000'), // Reward per duration
    0, // Reward provided
    0, // Fee
    0, // Farm End
    false // Paused
  );
  await chai.expect(tx).to.not.be.reverted;

  // Make second token (slotId 1) same weight as default
  const SLOT1_WEIGHT = ethers.BigNumber.from('1000000000000000000');

  tx = controller.weightSlots([cFolioFarm.address], [1], [SLOT1_WEIGHT]);
  await chai.expect(tx).to.not.be.reverted;

  tx = controller.refuelFarms([], []);
  await chai.expect(tx).to.not.be.reverted;

  return {
    signer,
    marketingWallet,
    teamWallet,
    cFolioFarm,
    controller,
  };
});

describe('Multi slot farm', function () {
  const SLOT_WEIGHT_2 = ethers.BigNumber.from('2000000000000000000');

  let contracts = undefined;

  before(async function () {
    this.timeout(60 * 1000);
    // Get contracts
    contracts = await setupTest();
  });

  it('should earn even amount', async function () {
    this.timeout(60 * 1000);

    const { cFolioFarm, controller, marketingWallet, teamWallet } = contracts;
    const investment = ethers.BigNumber.from('1000000000000000000');

    // Check wallet balance
    const currentBalance = await cFolioFarm.balanceOf(
      marketingWallet.address,
      0
    );
    chai.expect(currentBalance).to.equal(0);

    // Invest 1
    let tx = cFolioFarm.addShares(marketingWallet.address, investment, 0);
    await chai.expect(tx).to.not.be.reverted;
    tx = cFolioFarm.addShares(teamWallet.address, investment, 1);
    await chai.expect(tx).to.not.be.reverted;

    // ffwd 2 weeks
    await hardhat.network.provider.send('evm_increaseTime', [
      14 * 24 * 60 * 60,
    ]);
    await hardhat.network.provider.send('evm_mine');

    console.log(
      'Slot0 earned: ',
      await cFolioFarm.earned(marketingWallet.address, 0)
    );
    console.log(
      'Slot1 earned: ',
      await cFolioFarm.earned(teamWallet.address, 1)
    );

    // frwd 1 weeks
    console.log('1 week back');
    await hardhat.network.provider.send('evm_increaseTime', [
      -7 * 24 * 60 * 60,
    ]);
    await hardhat.network.provider.send('evm_mine');

    console.log(
      'Slot0 earned: ',
      await cFolioFarm.earned(marketingWallet.address, 0)
    );
    console.log(
      'Slot1 earned: ',
      await cFolioFarm.earned(teamWallet.address, 1)
    );

    console.log('Change weight');
    tx = controller.weightSlots([cFolioFarm.address], [1], [SLOT_WEIGHT_2]);
    await chai.expect(tx).to.not.be.reverted;

    console.log(
      'Slot0 earned: ',
      await cFolioFarm.earned(marketingWallet.address, 0)
    );
    console.log(
      'Slot1 earned: ',
      await cFolioFarm.earned(teamWallet.address, 1)
    );

    // ffwd 1 weeks
    console.log('1 week ffd');
    await hardhat.network.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
    await hardhat.network.provider.send('evm_mine');

    console.log(
      'Slot0 earned: ',
      await cFolioFarm.earned(marketingWallet.address, 0)
    );
    console.log(
      'Slot1 earned: ',
      await cFolioFarm.earned(teamWallet.address, 1)
    );
  });
});
