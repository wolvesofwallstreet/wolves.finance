/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */
/* eslint @typescript-eslint/no-unused-vars: "off" */

import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { ethers } from 'ethers';

import { hardhat } from '../../src/web3/hardhat';

chai.use(solidity);

// TODO: Qualified names
const TOKEN_CONTRACT = 'WowsToken';

// Supress type errors for properties injected by hardhat plugins
const deployEthers: any = hardhat.ethers;

describe('Token contract', function () {
  let owner: SignerWithAddress;
  let marketingWalletAddress: string;
  let teamWalletAddress: string;

  before(async function () {
    this.timeout(30 * 1000);

    // Get the Signers
    [owner] = await hardhat.ethers.getSigners();

    // Get the two wallets
    const { marketingWallet, teamWallet } = await hardhat.getNamedAccounts();
    [marketingWalletAddress, teamWalletAddress] = [marketingWallet, teamWallet];
  });

  beforeEach(async function () {
    this.timeout(30 * 1000);

    await hardhat.deployments.fixture();
  });

  it('should assign the total supply of tokens to the team', async function () {
    // Desired balances upon minting
    const MARKETING_BALANCE = ethers.BigNumber.from('3600000000000000000000'); // 3600 WOWS
    const TEAM_BALANCE = ethers.BigNumber.from('7500000000000000000000'); // 7500 WOWS

    const tokenContract = await deployEthers.getContract(TOKEN_CONTRACT);

    // Test marketing balance
    const marketingBalance = await tokenContract.balanceOf(
      marketingWalletAddress
    );
    console.log(
      `Marketing wallet ${marketingWalletAddress} has ${marketingBalance} tokens`
    );
    chai.expect(marketingBalance).to.equal(MARKETING_BALANCE);

    // Test team balance
    const teamBalance = await tokenContract.balanceOf(teamWalletAddress);
    console.log(`Team wallet ${teamWalletAddress} has ${teamBalance} tokens`);
    chai.expect(teamBalance).to.equal(TEAM_BALANCE);
  });
});
