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
import CFolioItemHandlerLpAbi from '../../src/abi/contracts/src/cfolio/CFolioItemHandlerLP.sol/CFolioItemHandlerLP.json';
import PresaleAbi from '../../src/abi/contracts/src/crowdsale/Crowdsale.sol/Crowdsale.json';
import WOWSSftMinterAbi from '../../src/abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import CFolioFarmAbi from '../../src/abi/contracts/src/investment/CFolioFarm.sol/CFolioFarm.json';
import TradeFloorAbi from '../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import WOWSCryptofolioAbi from '../../src/abi/contracts/src/token/WOWSCryptofolio.sol/WOWSCryptofolio.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import WOWSERC1155Abi from '../../src/abi/contracts/src/token/WOWSErc1155.sol/WOWSERC1155.json';
import { ADDRESS_ZERO, HASH_MASK } from '../utils/constants';
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
  const tradeFloorContract = new ethers.Contract(
    addresses.tradeFloorProxy,
    TradeFloorAbi,
    marketingWallet
  );
  const cfolioItemHandlerLPContract = new ethers.Contract(
    addresses.cfolioItemHandlerLPProxy,
    CFolioItemHandlerLpAbi,
    marketingWallet
  );
  const cfolioFarmLPContract = new ethers.Contract(
    addresses.cfolioFarmLP,
    CFolioFarmAbi,
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
    cfolioItemHandlerLPContract,
    cfolioFarmLPContract,
    presaleContract,
  };
});

describe('LP NFTs', function () {
  let signer: SignerWithAddress;
  let marketingWallet: SignerWithAddress;
  let contracts: any;

  let cryptofolioAddressBoi: string;
  let cryptofolioAddressWolf: string;

  let cryptofolioContractBoi: ethers.Contract;
  let cryptofolioContractWolf: ethers.Contract;

  // Test parameters
  const level1Price = '4500000000000000000';
  const defaultCFolioType = 0;
  const lpBalance = ethers.BigNumber.from('12000000000000000000'); // 12 UNI-V2 LP tokens
  const levelBoi = 1;
  const cardIdBoi = 2;
  const levelWolf = 5;
  const cardIdWolf = 2;
  const wowsTokenIdBoi = ethers.BigNumber.from('0x01020000');
  const wowsTokenIdWolf = ethers.BigNumber.from('0x05020000');
  let wowsTokenIdWolfTf = ethers.BigNumber.from(0);

  const cfolioItemTokenId = ethers.BigNumber.from('0x10000000000000000');
  let cfolioItemTokenIdTf = ethers.BigNumber.from(0);
  const cFolioItemType = 0; // Card type 0, registered in minter for cfolioItemHandlerLP
  const MAX_UINT256 = ethers.BigNumber.from(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
  );

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
      level1Price, // Price
      defaultCFolioType // CFolioItemType
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
      level1Price, // Price
      defaultCFolioType // CFolioItemType
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
    chai.expect(cryptofolioAddressBoi).to.not.equal(ADDRESS_ZERO);

    // Get the address of the clone contract
    cryptofolioAddressWolf = await sftHolderContract.tokenIdToAddress(
      wowsTokenIdWolf
    );
    chai.expect(cryptofolioAddressWolf).to.be.properAddress;
    chai.expect(cryptofolioAddressWolf).to.not.equal(ADDRESS_ZERO);
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

  it('should approve CFIHLP to transfer tokens', async function () {
    this.timeout(60 * 1000);

    const { uniV2PairContract, cfolioItemHandlerLPContract } = contracts;

    // Approve CFIHLP to transfer our tokens
    // Multiply by 2 so we can deposit twice
    const tx = await uniV2PairContract.approve(
      cfolioItemHandlerLPContract.address,
      lpBalance.mul(2)
    );
    await chai.expect(tx).to.emit(uniV2PairContract, 'Approval').withArgs(
      marketingWallet.address, // owner
      cfolioItemHandlerLPContract.address, // spender
      lpBalance.mul(2) // balance
    );
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test LP NFTs
  //////////////////////////////////////////////////////////////////////////////

  //
  // This test suite covers LP NFTs (which are locked investment SFTs containing
  // LP tokens). Generally, each gas-consuming operation is explained in a
  // comment like this as we walk through the test suite.
  //
  // We start by minting LP NFTs. The user pays WOWS and provides LP tokens to
  // mint an investment SFT. The investment SFT is then locked by sending it to
  // the Trade Floor, and in return the user gets an LP NFT. To save gas, the LP
  // NFT is then sent directly into the user's cryptofolio SFT.
  //

  it('should revert when creating LP SFT / NFT into boi cryptofolio', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, sftMinterContract } = contracts;

    // Deposit LP tokens to boi should fail
    const tx = sftMinterContract.mintCFolioItemSFT(
      cFolioItemType,
      wowsTokenIdBoi,
      []
    );
    await chai.expect(tx).to.be.revertedWith('CFIHLP: Wolves only');

    // Boi cryptofolio should be in its original state
    const tokenIds = await sftHolderContract.getTokenIds(cryptofolioAddressBoi);
    chai.expect(tokenIds.length).to.equal(0);
  });

  it('should deposit LP NFT into wolf cryptofolio', async function () {
    this.timeout(60 * 1000);

    const {
      cfolioFarmLPContract,
      cfolioItemHandlerLPContract,
      sftHolderContract,
      sftMinterContract,
      uniV2PairContract,
    } = contracts;

    // Mint a new LP investment type into Wolf
    const tx = await sftMinterContract.mintCFolioItemSFT(
      cFolioItemType,
      wowsTokenIdWolf,
      [lpBalance]
    );

    await chai
      .expect(tx)
      .to.emit(uniV2PairContract, 'Transfer')
      .withArgs(
        marketingWallet.address,
        cfolioItemHandlerLPContract.address,
        lpBalance
      );
    await chai
      .expect(tx)
      .to.emit(cfolioFarmLPContract, 'ShareAdded')
      .withArgs(cryptofolioAddressWolf, lpBalance.div(2), 0);

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Mint LP NFT (into card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );

    // Get the address of the investment card clone contract
    const cryptofolioItemAddressWolfLP =
      await sftHolderContract.tokenIdToAddress(cfolioItemTokenId);
    await chai.expect(tx).to.emit(cfolioFarmLPContract, 'AssetAdded').withArgs(
      cryptofolioItemAddressWolfLP, // Recipient
      lpBalance, // Amount
      lpBalance, // totalAmount
      0 // slotId
    );
  });

  it('should check cryptofolio for LP NFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Check cryptofolio and the LP NFT should appear
    const tokenIds = await sftHolderContract.getTokenIds(
      cryptofolioAddressWolf
    );
    chai.expect(tokenIds.length).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(cfolioItemTokenId);
  });

  it('should check CFIHLP for LP tokens', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract, uniV2PairContract } = contracts;

    // Check CFolioItemHandlerLP balance
    const currentLpBalance = await uniV2PairContract.balanceOf(
      cfolioItemHandlerLPContract.address
    );
    chai.expect(currentLpBalance).to.equal(lpBalance);
  });

  //
  // Now that we've minted an LP NFT into a cryptofolio, we move it out of the
  // cryptofolio and into the user's wallet, and after this into the trade floor.
  //

  it('should remove c-folio item from base SFT c-folio', async function () {
    this.timeout(60 * 1000);

    const { cfolioFarmLPContract, sftHolderContract } = contracts;

    // Transfer cryptofolio item NFT into wallet
    const tx = sftHolderContract.safeTransferFrom(
      cryptofolioAddressWolf,
      marketingWallet.address,
      cfolioItemTokenId,
      1,
      []
    );
    await chai
      .expect(tx)
      .to.emit(cfolioFarmLPContract, 'ShareRemoved')
      .withArgs(cryptofolioAddressWolf, lpBalance.div(2), 0);

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Burn LP NFT (from card to wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should transfer cfolioitem to tradefloor', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, tradeFloorContract } = contracts;

    // Transfer SFT into the TradeFloor contract
    const tx = await sftHolderContract.safeTransferFrom(
      marketingWallet.address,
      tradeFloorContract.address,
      cfolioItemTokenId,
      1,
      []
    );

    // Fetch the generated tokenID
    const tokenIds = await tradeFloorContract.getTokenIds(
      marketingWallet.address
    );
    chai.expect(tokenIds.length).to.equal(1);
    cfolioItemTokenIdTf = tokenIds[0];

    await chai
      .expect(tx)
      .to.emit(tradeFloorContract, 'TransferSingle')
      .withArgs(
        sftHolderContract.address,
        ADDRESS_ZERO,
        marketingWallet.address,
        cfolioItemTokenIdTf,
        1
      );

    it('should check trade floor ID', async function () {
      chai
        .expect(cfolioItemTokenIdTf.and(HASH_MASK))
        .to.equal(cfolioItemTokenId);
    });

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Transfer LP NFT (from Wallet to TF) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check empty cryptofolio', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Check cryptofolio and the LP NFT shouldn't appear
    const tokenIds = await sftHolderContract.getTokenIds(
      cryptofolioAddressWolf
    );
    chai.expect(tokenIds.length).to.equal(0);
  });

  it('should check wallet for trade floor NFT', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract } = contracts;

    // Item in the trade floor contract should belong to the wallet
    const balance = await tradeFloorContract.balanceOf(
      marketingWallet.address,
      cfolioItemTokenIdTf
    );
    chai.expect(balance).to.equal(1);
  });

  //
  // The LP NFT is now in the user's wallet. Because it's locked, withdrawals
  // should fail.
  //

  it('should fail to withdraw from locked NFT', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    const tx = cfolioItemHandlerLPContract.withdraw(
      MAX_UINT256,
      cfolioItemTokenId,
      [lpBalance.div(2)]
    );
    await chai.expect(tx).to.be.revertedWith('CFHI: Access denied');
  });

  //
  // Next we burn the LP NFT (held in the user's wallet) to redeem the
  // investment SFT (back into the user's wallet).
  //

  it('should burn the c-folio item NFT in wallet', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract } = contracts;

    // Burn locked cryptofolio NFT
    const tx = tradeFloorContract.burn(
      marketingWallet.address,
      cfolioItemTokenIdTf,
      1
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Burn LP NFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check wallet for investment SFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Item in the SFT holder should belong to the trade floor
    const balance = await sftHolderContract.balanceOf(
      marketingWallet.address,
      cfolioItemTokenId
    );
    chai.expect(balance).to.equal(1);
  });

  //
  // Now that the investment SFT is unlocked, we test deposits and withdrawals.
  //

  it('should fail to withdraw too much', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    const tx = cfolioItemHandlerLPContract.withdraw(
      MAX_UINT256,
      cfolioItemTokenId,
      [lpBalance.add(1)]
    );
    await chai.expect(tx).to.be.revertedWith('SafeMath: subtraction overflow');
  });

  it('should withdraw from CFIHLP', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    const tx = cfolioItemHandlerLPContract.withdraw(
      MAX_UINT256,
      cfolioItemTokenId,
      [lpBalance.div(2)]
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Withdraw from LP SFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check wallet for withdrawn LP tokens', async function () {
    this.timeout(60 * 1000);

    const { uniV2PairContract } = contracts;

    // Check wallet balance
    const currentLpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentLpBalance).to.equal(lpBalance.div(2));
  });

  it('should check CFIHLP for remaining LP tokens', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract, uniV2PairContract } = contracts;

    // Check CFolioItemHandlerLP balance
    const currentLpBalance = await uniV2PairContract.balanceOf(
      cfolioItemHandlerLPContract.address
    );
    chai.expect(currentLpBalance).to.equal(lpBalance.div(2));
  });

  it('should deposit to CFIHLP', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    const tx = cfolioItemHandlerLPContract.deposit(
      marketingWallet.address,
      MAX_UINT256,
      cfolioItemTokenId,
      [lpBalance.div(2)]
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Deposit into LP SFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  //
  // Next, we test locking the investment SFT on the Trade Floor. This step
  // was previously done automatically as part of the crowdsale minting
  // function at the beginning of this test suite. Now we perform it manually.
  //
  // To lock the investment SFT, we send it to the TradeFloor. The TradeFloor
  // sends back a new NFT.
  //

  it('should lock investment SFT into trade floor', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, tradeFloorContract } = contracts;

    // Transfer investment SFT to trade floor to lock it and receive an NFT
    const tx = sftHolderContract.safeTransferFrom(
      marketingWallet.address,
      tradeFloorContract.address,
      cfolioItemTokenId,
      1,
      []
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Lock LP SFT (into wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check wallet for trade floor NFT', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract } = contracts;

    // Item in the trade floor contract should belong to the wallet
    const balance = await tradeFloorContract.balanceOf(
      marketingWallet.address,
      cfolioItemTokenIdTf
    );
    chai.expect(balance).to.equal(1);
  });

  it('should check trade floor for investment SFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, tradeFloorContract } = contracts;

    // Item in the SFT holder should belong to the trade floor
    const balance = await sftHolderContract.balanceOf(
      tradeFloorContract.address,
      cfolioItemTokenId
    );
    chai.expect(balance).to.equal(1);
  });

  //
  // The LP NFT is now sitting in our wallet. Now, we transfer it into the
  // cryptofolio SFT. Like the locking procedure, this was also done
  // automatically by the crowdsale minting contract. Here we do it manually.
  //

  it('should transfer the locked NFT into the wolf card', async function () {
    this.timeout(60 * 1000);

    const { cfolioFarmLPContract } = contracts;
    const { tradeFloorContract } = contracts;

    // Transfer locked cryptofolio item NFT
    const tx = tradeFloorContract.safeTransferFrom(
      marketingWallet.address,
      cryptofolioAddressWolf,
      cfolioItemTokenIdTf,
      1,
      []
    );
    await chai.expect(tx).to.be.revertedWith('CF: Only deployer');
  });

  //
  // Test depositing into a CFolioItem that sits inside an unlocked
  //

  it('should remove c-folio from tradefloor', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract } = contracts;

    // Transfer bridged cryptofolio item NFT
    const tx = tradeFloorContract.burnBatch(
      marketingWallet.address,
      [cfolioItemTokenIdTf],
      [1]
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Burn LP NFT (from card to wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should transfer cfolio item into card', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Transfer investment SFT to trade floor to lock it and receive an NFT
    const tx = sftHolderContract.safeTransferFrom(
      marketingWallet.address,
      cryptofolioAddressWolf,
      cfolioItemTokenId,
      1,
      []
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Transfer LP SFT (into cFolio) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should withdraw from CFIHLP (unlocked card)', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    const tx = cfolioItemHandlerLPContract.withdraw(
      wowsTokenIdWolf,
      cfolioItemTokenId,
      [lpBalance.div(2)]
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Withdraw from LP NFT (in card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check wallet for withdrawn LP tokens', async function () {
    this.timeout(60 * 1000);

    const { uniV2PairContract } = contracts;

    // Check wallet balance
    const currentLpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentLpBalance).to.equal(lpBalance.div(2));
  });

  it('should check CFIHLP for remaining LP tokens', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract, uniV2PairContract } = contracts;

    // Check CFolioItemHandlerLP balance
    const currentLpBalance = await uniV2PairContract.balanceOf(
      cfolioItemHandlerLPContract.address
    );
    chai.expect(currentLpBalance).to.equal(lpBalance.div(2));
  });

  it('should deposit to CFIHLP', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    const tx = cfolioItemHandlerLPContract.deposit(
      marketingWallet.address,
      wowsTokenIdWolf,
      cfolioItemTokenId,
      [lpBalance.div(2)]
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Deposit into LP NFT (in card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  //
  // Here we lock the cryptofolio, and try interacting with the locked NFT again
  //

  it('should lock cryptofolio', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, tradeFloorContract } = contracts;

    // Check that we have the cryptofolio
    const balanceWolf = await sftHolderContract.balanceOf(
      marketingWallet.address,
      wowsTokenIdWolf
    );
    chai.expect(balanceWolf).to.equal(1);

    // Lock wolf cryptofolio
    const tx = await sftHolderContract.safeTransferFrom(
      marketingWallet.address,
      tradeFloorContract.address,
      wowsTokenIdWolf,
      1,
      []
    );
    await chai
      .expect(tx)
      .to.emit(sftHolderContract, 'TransferSingle')
      .withArgs(
        marketingWallet.address,
        marketingWallet.address,
        tradeFloorContract.address,
        wowsTokenIdWolf,
        1
      );

    // Get the new minted TradeFloor tokenId
    const tokenIds = await tradeFloorContract.getTokenIds(
      marketingWallet.address
    );
    chai.expect(tokenIds.length).to.equal(1);
    wowsTokenIdWolfTf = tokenIds[0];
  });

  it('should fail to withdraw from CFIHLP (locked NFT, locked card)', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    const tx = cfolioItemHandlerLPContract.withdraw(
      wowsTokenIdWolf,
      cfolioItemTokenIdTf,
      [lpBalance.div(2)]
    );
    await chai.expect(tx).to.be.revertedWith('CFHI: Access denied (B)');
  });

  it('should burn locked cryptofolio NFT', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract } = contracts;

    // Burn locked cryptofolio NFT
    const tx = tradeFloorContract.burn(
      marketingWallet.address,
      wowsTokenIdWolfTf,
      1
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  //
  // Previously, we burned the LP NFT from the user's wallet to redeem the
  // investment SFT. Now try transfer the LP NFT from within the user'
  // cryptofolio.
  //

  it('should transfer NFT in wolf card', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Transfer cryptofolio NFT
    const tx = sftHolderContract.safeTransferFrom(
      cryptofolioAddressWolf,
      marketingWallet.address,
      cfolioItemTokenId,
      1,
      []
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Burn LP NFT (in card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  //
  // Finally, we burn the investment SFT after withdrawing all LP tokens.
  //

  it('should fail to burn the non-empty investment SFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Burn investment SFT
    const tx = sftHolderContract.burn(
      marketingWallet.address,
      cfolioItemTokenId,
      1
    );
    await chai.expect(tx).to.be.revertedWith('CFIH: Not empty');
  });

  it('should withdraw everything from CFIHLP', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerLPContract } = contracts;

    const tx = cfolioItemHandlerLPContract.withdraw(
      MAX_UINT256,
      cfolioItemTokenId,
      [lpBalance]
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should check that LP tokens were returned', async function () {
    this.timeout(60 * 1000);

    const { uniV2PairContract } = contracts;

    // Check wallet balance
    const currentLpBalance = await uniV2PairContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentLpBalance).to.equal(lpBalance);
  });

  it('should burn the empty investment SFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Burn investment SFT
    const tx = sftHolderContract.burn(
      marketingWallet.address,
      cfolioItemTokenId,
      1
    );
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Burn LP SFT gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });
});
