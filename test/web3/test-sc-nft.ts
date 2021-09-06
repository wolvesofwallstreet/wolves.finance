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
import { abi as CurveYTokenAbi } from '../../contracts/bytecode/curve-contracts/CurveTokenV1.json';
import { abi as CurveYDepositAbi } from '../../contracts/bytecode/curve-contracts/DepositY.json';
import { abi as CurveYSwapAbi } from '../../contracts/bytecode/curve-contracts/StableSwapY.json';
//import CurveYDepositAbi from '../../src/abi/contracts/interfaces/curve/CurveDepositInterface.sol/ICurveFiDepositY.json';
import YearnVaultAbi from '../../src/abi/contracts/interfaces/curve/YTokenInterface.sol/IYERC20.json';
import CFolioItemHandlerScAbi from '../../src/abi/contracts/src/cfolio/CFolioItemHandlerSC.sol/CFolioItemHandlerSC.json';
import WOWSSftMinterAbi from '../../src/abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import CFolioFarmAbi from '../../src/abi/contracts/src/investment/CFolioFarm.sol/CFolioFarm.json';
import TradeFloorAbi from '../../src/abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import WOWSCryptofolioAbi from '../../src/abi/contracts/src/token/WOWSCryptofolio.sol/WOWSCryptofolio.json';
import WOWSTokenAbi from '../../src/abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import WOWSERC1155Abi from '../../src/abi/contracts/src/token/WOWSERC1155.sol/WOWSERC1155.json';
import TestERC20MintableAbi from '../../src/abi/contracts/test/token/TestERC20Mintable.sol/TestERC20Mintable.json';
import { ADDRESS_ZERO, HASH_MASK, MAX_UINT256 } from '../utils/constants';
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
  const daiContract = new ethers.Contract(
    addresses.daiToken,
    TestERC20MintableAbi,
    marketingWallet
  );
  const tusdContract = new ethers.Contract(
    addresses.tusdToken,
    TestERC20MintableAbi,
    marketingWallet
  );
  const usdcContract = new ethers.Contract(
    addresses.usdcToken,
    TestERC20MintableAbi,
    marketingWallet
  );
  const usdtContract = new ethers.Contract(
    addresses.usdtToken,
    TestERC20MintableAbi,
    marketingWallet
  );
  const ydaiContract = new ethers.Contract(
    addresses.ydaiVault,
    YearnVaultAbi,
    marketingWallet
  );
  const ytusdContract = new ethers.Contract(
    addresses.ytusdVault,
    YearnVaultAbi,
    marketingWallet
  );
  const yusdcContract = new ethers.Contract(
    addresses.yusdcVault,
    YearnVaultAbi,
    marketingWallet
  );
  const yusdtContract = new ethers.Contract(
    addresses.yusdtVault,
    YearnVaultAbi,
    marketingWallet
  );
  const curveYTokenContract = new ethers.Contract(
    addresses.curveYToken,
    CurveYTokenAbi,
    marketingWallet
  );
  const curveYSwapContract = new ethers.Contract(
    addresses.curveYSwap,
    CurveYSwapAbi,
    marketingWallet
  );
  const curveYDepositContract = new ethers.Contract(
    addresses.curveYDeposit,
    CurveYDepositAbi,
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
  const cfolioItemHandlerSCContract = new ethers.Contract(
    addresses.cfolioItemHandlerSCProxy,
    CFolioItemHandlerScAbi,
    marketingWallet
  );
  const cfolioFarmSCContract = new ethers.Contract(
    addresses.cfolioFarmSC,
    CFolioFarmAbi,
    marketingWallet
  );

  return {
    tokenContract,
    daiContract,
    tusdContract,
    usdcContract,
    usdtContract,
    ydaiContract,
    ytusdContract,
    yusdcContract,
    yusdtContract,
    curveYTokenContract,
    curveYSwapContract,
    curveYDepositContract,
    sftHolderContract,
    sftMinterContract,
    tradeFloorContract,
    cfolioItemHandlerSCContract,
    cfolioFarmSCContract,
  };
});

describe('SC NFTs', function () {
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
  const daiBalance = ethers.BigNumber.from('1000000000000000000'); // 1 DAI
  const usdcBalance = ethers.BigNumber.from('1000000'); // 1 USDC
  const usdtBalance = ethers.BigNumber.from('1000000'); // 1 USDT
  const tusdBalance = ethers.BigNumber.from('1000000000000000000'); // 1 TUSD
  const yPoolBalance = ethers.BigNumber.from('4000000000000000000');
  const levelBoi = 1;
  const cardIdBoi = 2;
  const levelWolf = 5;
  const cardIdWolf = 2;
  const wowsTokenIdBoi = ethers.BigNumber.from('0x01020000');
  const wowsTokenIdWolf = ethers.BigNumber.from('0x05020000');
  let wowsTokenIdBoiTf = ethers.BigNumber.from(0);

  const cfolioItemTokenId = ethers.BigNumber.from('0x10000000000000000');
  let cfolioItemTokenIdTf = ethers.BigNumber.from(0);
  const cFolioItemType = 0x10; // Card type 0x10, registered in minter for cfolioItemHandlerSC
  let cryptofolioItemAddressBoiSC = ADDRESS_ZERO;

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
  // Setup: Stablecoin tokens
  //////////////////////////////////////////////////////////////////////////////

  it('should get underlying tokens', async function () {
    this.timeout(60 * 1000);

    const options = {
      gasLimit: ethers.BigNumber.from('100000'), // 100K
    };

    const {
      daiContract,
      tusdContract,
      usdcContract,
      usdtContract,
      curveYDepositContract,
    } = contracts;

    const underlyingCoins = [
      await curveYDepositContract.underlying_coins(0, options),
      await curveYDepositContract.underlying_coins(1, options),
      await curveYDepositContract.underlying_coins(2, options),
      await curveYDepositContract.underlying_coins(3, options),
    ];
    const tx = curveYDepositContract.underlying_coins(4, options);

    chai.expect(underlyingCoins[0]).to.equal(daiContract.address);
    chai.expect(underlyingCoins[1]).to.equal(usdcContract.address);
    chai.expect(underlyingCoins[2]).to.equal(usdtContract.address);
    chai.expect(underlyingCoins[3]).to.equal(tusdContract.address);
    await chai.expect(tx).to.be.reverted;
  });

  it('should get wrapped tokens', async function () {
    this.timeout(60 * 1000);

    const options = {
      gasLimit: ethers.BigNumber.from('100000'), // 100K GWei
    };

    const {
      ydaiContract,
      ytusdContract,
      yusdcContract,
      yusdtContract,
      curveYDepositContract,
    } = contracts;

    const wrappedCoins = [
      await curveYDepositContract.coins(0, options),
      await curveYDepositContract.coins(1, options),
      await curveYDepositContract.coins(2, options),
      await curveYDepositContract.coins(3, options),
    ];
    const tx = curveYDepositContract.coins(4, options);

    chai.expect(wrappedCoins[0]).to.equal(ydaiContract.address);
    chai.expect(wrappedCoins[1]).to.equal(yusdcContract.address);
    chai.expect(wrappedCoins[2]).to.equal(yusdtContract.address);
    chai.expect(wrappedCoins[3]).to.equal(ytusdContract.address);
    await chai.expect(tx).to.be.reverted;
  });

  it('should mint SC tokens', async function () {
    this.timeout(60 * 1000);

    const { daiContract, tusdContract, usdcContract, usdtContract } = contracts;

    let tx = daiContract.mint(marketingWallet.address, daiBalance);
    await chai.expect(tx).to.not.be.reverted;

    tx = tusdContract.mint(marketingWallet.address, tusdBalance);
    await chai.expect(tx).to.not.be.reverted;

    tx = usdcContract.mint(marketingWallet.address, usdcBalance);
    await chai.expect(tx).to.not.be.reverted;

    tx = usdtContract.mint(marketingWallet.address, usdtBalance);
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should approve CFIHSC to transfer SC tokens', async function () {
    this.timeout(60 * 1000);

    const {
      daiContract,
      tusdContract,
      usdcContract,
      usdtContract,
      cfolioItemHandlerSCContract,
    } = contracts;

    let tx = daiContract.approve(
      cfolioItemHandlerSCContract.address,
      daiBalance.add(300) // Add some dust for testing
    );
    await chai.expect(tx).to.not.be.reverted;

    tx = tusdContract.approve(cfolioItemHandlerSCContract.address, tusdBalance);
    await chai.expect(tx).to.not.be.reverted;

    tx = usdcContract.approve(cfolioItemHandlerSCContract.address, usdcBalance);
    await chai.expect(tx).to.not.be.reverted;

    tx = usdtContract.approve(cfolioItemHandlerSCContract.address, usdtBalance);
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should check curve stablecoin swap contract', async function () {
    this.timeout(60 * 1000);

    const options = {
      gasLimit: ethers.BigNumber.from('100000'), // 100K GWei
    };

    const { curveYSwapContract, curveYDepositContract } = contracts;

    const curve = await curveYDepositContract.curve(options);
    chai.expect(curve).to.be.properAddress;
    chai.expect(curve).to.equal(curveYSwapContract.address);
  });

  //////////////////////////////////////////////////////////////////////////////
  // Test SC NFTs
  //////////////////////////////////////////////////////////////////////////////

  //
  // This test suite covers SC NFTs (which are locked investment SFTs containing
  // stablecoin investments). Generally, each gas-consuming operation is
  // explained in a comment like this as we walk through the test suite.
  //
  // We start by minting SC NFTs. The user pays WOWS and provides SC tokens to
  // mint an investment SFT. The investment SFT is then locked by sending it to
  // the Trade Floor, and in return the user gets an SC NFT. To save gas, the SC
  // NFT is then sent directly into the user's cryptofolio SFT.
  //

  it('should revert when creating SC SFT / NFT into wolf cryptofolio', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, sftMinterContract } = contracts;

    // Deposit SC tokens to wolf should fail
    const tx = sftMinterContract.mintCFolioItemSFT(
      cFolioItemType,
      wowsTokenIdWolf,
      []
    );
    await chai.expect(tx).to.be.revertedWith('CFIHSC: Bois only');

    // Wolf cryptofolio should be in its original state
    const tokenIds = await sftHolderContract.getTokenIds(
      cryptofolioAddressWolf
    );
    chai.expect(tokenIds.length).to.equal(0);
  });

  it('should mint locked SC NFT into boi cryptofolio', async function () {
    this.timeout(60 * 1000);

    const options = {
      gasLimit: ethers.BigNumber.from('10000000'), // 10M
    };

    const {
      sftHolderContract,
      sftMinterContract,
      cfiBridgeProxyContract,
      cfolioFarmSCContract,
    } = contracts;

    // Mint a new SC investment type into Boi
    const tx = sftMinterContract.mintCFolioItemSFT(
      cFolioItemType,
      wowsTokenIdBoi,
      [daiBalance, usdcBalance, usdtBalance, tusdBalance, 0],
      options
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
      `    Mint locked SC NFT (into card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );

    // Get the address of the investment card clone contract
    cryptofolioItemAddressBoiSC = await sftHolderContract.tokenIdToAddress(
      cfolioItemTokenId
    );

    await chai.expect(tx).to.emit(sftMinterContract, 'Mint');
    await chai.expect(tx).to.emit(cfolioFarmSCContract, 'AssetAdded').withArgs(
      cryptofolioItemAddressBoiSC, // Recipient
      yPoolBalance, // Amount
      yPoolBalance, // totalAmount
      0 // slotId
    );
    await chai.expect(tx).to.emit(cfolioFarmSCContract, 'ShareAdded').withArgs(
      cryptofolioAddressBoi, // User
      yPoolBalance.div(2), // Amount
      0 // slotId
    );
  });

  it('should check cryptofolio for SC NFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Check cryptofolio and the SC NFT should appear
    const tokenIds = await sftHolderContract.getTokenIds(cryptofolioAddressBoi);
    chai.expect(tokenIds.length).to.equal(1);
    chai.expect(tokenIds[0]).to.equal(cfolioItemTokenId);
  });

  it('should check CFIHSC for yCRV tokens', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract, curveYTokenContract } = contracts;

    // Check CFolioItemHandlerSC balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      cfolioItemHandlerSCContract.address
    );
    chai.expect(currentYPoolBalance).to.equal(yPoolBalance);
  });

  it('should check marketing wallet for yCRV tokens', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract } = contracts;

    // Check marketing balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentYPoolBalance).to.equal(0);
  });

  it('should check c-folio item shares', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tokenAmounts = await cfolioItemHandlerSCContract.getAmounts(
      cryptofolioItemAddressBoiSC
    );

    chai
      .expect(tokenAmounts[0].div('1000000000000000').toNumber())
      .to.be.closeTo(4000, 2);
    chai.expect(tokenAmounts[1].div('1000').toNumber()).to.be.closeTo(4000, 2);
    chai.expect(tokenAmounts[2].div('1000').toNumber()).to.be.closeTo(4000, 2);
    chai
      .expect(tokenAmounts[3].div('1000000000000000').toNumber())
      .to.be.closeTo(4000, 2);
    chai.expect(tokenAmounts[4]).to.equal(yPoolBalance);
  });

  //
  // Now that we've minted an SC NFT into a cryptofolio, we move it out of the
  // cryptofolio and into the user's wallet, and after this into the TradeFloor.
  //

  it('should remove c-folio item from base SFT c-folio', async function () {
    this.timeout(60 * 1000);

    const { cfolioFarmSCContract, sftHolderContract } = contracts;

    // Transfer cryptofolio item NFT
    const tx = sftHolderContract.safeTransferFrom(
      cryptofolioAddressBoi,
      marketingWallet.address,
      cfolioItemTokenId,
      1,
      []
    );
    await chai
      .expect(tx)
      .to.emit(cfolioFarmSCContract, 'ShareRemoved')
      .withArgs(cryptofolioAddressBoi, yPoolBalance.div(2), 0);

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Burn SC NFT (from card to wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
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
      `    Transfer SC NFT (from Wallet to TF) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check empty cryptofolio for no c-folio items', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Check cryptofolio and the SC NFT shouldn't appear
    const tokenIds = await sftHolderContract.getTokenIds(cryptofolioAddressBoi);
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
  // The SC NFT is now in the user's wallet. Because it's locked, withdrawals
  // should fail.
  //

  it('should fail to withdraw from locked NFT', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.withdraw(
      wowsTokenIdBoi,
      cfolioItemTokenId,
      [1, 0, 0, 0, 0]
    );
    await chai.expect(tx).to.be.revertedWith('CFHI: Access denied');
  });

  //
  // Next we burn the SC NFT (held in the user's wallet) to redeem the
  // investment SFT (back into the user's wallet).
  //

  it('should burn the c-folio item NFT in wallet', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract, tradeFloorContract } = contracts;

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
      `    Burn locked SC NFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );

    await chai
      .expect(tx)
      .to.emit(sftHolderContract, 'SftTokenTransfer')
      .withArgs(
        tradeFloorContract.address, // operator
        tradeFloorContract.address, // from
        marketingWallet.address, // to
        [cfolioItemTokenId] // ids
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

  it('should fail to withdraw too much DAI', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.withdraw(
      MAX_UINT256,
      cfolioItemTokenId,
      [daiBalance.mul(10), 0, 0, 0]
    );
    await chai.expect(tx).to.be.reverted;
  });

  it('should withdraw DAI from CFIHSC', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.withdraw(
      MAX_UINT256,
      cfolioItemTokenId,
      [100, 0, 0, 0, 100]
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
      `    Withdraw DAI from unlocked SC SFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check wallet for withdrawn DAI', async function () {
    this.timeout(60 * 1000);

    const { daiContract } = contracts;

    // Check wallet balance
    const currentDaiBalance = await daiContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentDaiBalance).to.equal(100);
  });

  it('should check CFIHSC for remaining yCRV tokens', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract, cfolioItemHandlerSCContract } = contracts;

    // Check CFolioItemHandlerSC balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      cfolioItemHandlerSCContract.address
    );
    chai.expect(currentYPoolBalance).to.equal(yPoolBalance.sub(100));
  });

  it('should deposit DAI to CFIHSC (unlocked investment SFT)', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.deposit(
      marketingWallet.address,
      MAX_UINT256,
      cfolioItemTokenId,
      [100, 0, 0, 0, 0]
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
      `    Deposit DAI into unlocked SC SFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  //
  // Test deposits and withdrawals again, this time with Y pool tokens instead of DAI
  //

  it('should approve CFIHSC to spend yCRV tokens', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract, cfolioItemHandlerSCContract } = contracts;

    const tx = curveYTokenContract.approve(
      cfolioItemHandlerSCContract.address,
      100
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should withdraw yCRV from CFIHSC', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.withdraw(
      MAX_UINT256,
      cfolioItemTokenId,
      [0, 0, 0, 0, 100]
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
      `    Withdraw yCRV from unlocked SC SFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check wallet for withdrawn yCRV', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract } = contracts;

    // Check wallet balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentYPoolBalance).to.equal(100);
  });

  it('should check CFIHSC for remaining yCRV tokens', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract, cfolioItemHandlerSCContract } = contracts;

    // Check CFolioItemHandlerSC balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      cfolioItemHandlerSCContract.address
    );
    chai.expect(currentYPoolBalance).to.equal(yPoolBalance.sub(100));
  });

  it('should deposit yCRV to CFIHSC (unlocked investment SFT)', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.deposit(
      marketingWallet.address,
      MAX_UINT256,
      cfolioItemTokenId,
      [0, 0, 0, 0, 100]
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
      `    Deposit yCRV into unlocked SC SFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check wallet for no yCRV tokens', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract } = contracts;

    // Check wallet balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentYPoolBalance).to.equal(0);
  });

  it('should check CFIHSC for all yCRV tokens', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract, cfolioItemHandlerSCContract } = contracts;

    // Check CFolioItemHandlerSC balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      cfolioItemHandlerSCContract.address
    );
    chai.expect(currentYPoolBalance).to.equal(yPoolBalance);
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
      `    Lock SC SFT (into wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  //
  // Test depositing into a CFolioItem that sits inside an unlocked
  //

  it('should remove c-folio from tradefloor', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract } = contracts;

    // Return NFT from trade floor
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
      `    Burn SC SFT (from card to wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
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
    chai.expect(balance).to.equal(0);
  });

  it('should check trade floor for investment SFT', async function () {
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
  // The SC NFT is now sitting in our wallet. Now, we transfer it into the
  // cryptofolio SFT. Like the locking procedure, this was also done
  // automatically by the crowdsale minting contract. Here we do it manually.
  //

  it('should transfer the NFT into the boi card', async function () {
    this.timeout(60 * 1000);

    const { cfolioFarmSCContract, sftHolderContract } = contracts;

    // Transfer cryptofolio item NFT
    const tx = sftHolderContract.safeTransferFrom(
      marketingWallet.address,
      cryptofolioAddressBoi,
      cfolioItemTokenId,
      1,
      cryptofolioAddressBoi
    );
    await chai.expect(tx).to.emit(cfolioFarmSCContract, 'ShareAdded');
    //.withArgs(cryptofolioAddressBoi, lpBalance.div(2)); // TODO

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Transfer locked SC NFT (from wallet to card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should withdraw DAI from CFIHSC (unlocked card)', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.withdraw(
      wowsTokenIdBoi,
      cfolioItemTokenId,
      [100, 0, 0, 0, 100]
    );

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Withdraw DAI from locked SC NFT (in card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  it('should check wallet for withdrawn DAI', async function () {
    this.timeout(60 * 1000);

    const { daiContract } = contracts;

    // Check wallet balance
    const currentDaiBalance = await daiContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentDaiBalance).to.equal(100);
  });

  it('should check CFIHSC for remaining yCRV tokens', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract, cfolioItemHandlerSCContract } = contracts;

    // Check CFolioItemHandlerSC balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      cfolioItemHandlerSCContract.address
    );
    chai.expect(currentYPoolBalance).to.equal(yPoolBalance.sub(100));
  });

  it('should deposit DAI to CFIHSC', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.deposit(
      marketingWallet.address,
      wowsTokenIdBoi,
      cfolioItemTokenId,
      [100, 0, 0, 0, 0]
    );

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Deposit DAI into locked SC NFT (in card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
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
    const balanceBoi = await sftHolderContract.balanceOf(
      marketingWallet.address,
      wowsTokenIdBoi
    );
    chai.expect(balanceBoi).to.equal(1);

    // Lock boi cryptofolio
    const tx = await sftHolderContract.safeTransferFrom(
      marketingWallet.address,
      tradeFloorContract.address,
      wowsTokenIdBoi,
      1,
      []
    );
    await chai
      .expect(tx)
      .to.emit(sftHolderContract, 'SftTokenTransfer')
      .withArgs(
        marketingWallet.address,
        marketingWallet.address,
        tradeFloorContract.address,
        [wowsTokenIdBoi]
      );

    // Get the new minted TradeFloor tokenId
    const tokenIds = await tradeFloorContract.getTokenIds(
      marketingWallet.address
    );
    chai.expect(tokenIds.length).to.equal(1);
    wowsTokenIdBoiTf = tokenIds[0];
  });

  it('should fail to withdraw DAI from CFIHSC (locked NFT, locked card)', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tx = cfolioItemHandlerSCContract.withdraw(
      wowsTokenIdBoi,
      cfolioItemTokenIdTf,
      [1, 0, 0, 0, 0]
    );
    await chai.expect(tx).to.be.revertedWith('CFHI: Access denied (B)');
  });

  it('should burn locked cryptofolio NFT', async function () {
    this.timeout(60 * 1000);

    const { tradeFloorContract } = contracts;

    // Burn locked cryptofolio NFT
    const tx = tradeFloorContract.burn(
      marketingWallet.address,
      wowsTokenIdBoiTf,
      1
    );
    //await (await tx).wait();
    await chai.expect(tx).to.not.be.reverted;
  });

  //
  // Previously, we burned the SC NFT from the user's wallet to redeem the
  // investment SFT. Now try burning the SC NFT from within the user's
  // cryptofolio.
  //

  it('should burn locked NFT in boi card', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Burn locked cryptofolio NFT
    const tx = sftHolderContract.safeTransferFrom(
      cryptofolioAddressBoi,
      marketingWallet.address,
      cfolioItemTokenId,
      1,
      []
    );

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Burn locked SC NFT (in card) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });

  //
  // Finally, we burn the investment SFT after withdrawing all SC tokens.
  //

  it('should fail to burn the non-empty investment SFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Burn investment SFT
    const tx = sftHolderContract.burnBatch(marketingWallet.address, [
      cfolioItemTokenId,
    ]);
    await chai.expect(tx).to.be.revertedWith('CFIH: Not empty');
  });

  it('should get the remaining yCRV balance in CFIHSC', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract, cfolioItemHandlerSCContract } = contracts;

    // Get the remaining balance
    const remainingYPoolBalance = await curveYTokenContract.balanceOf(
      cfolioItemHandlerSCContract.address
    );
    chai.expect(remainingYPoolBalance).to.equal(yPoolBalance);
  });

  it('should withdraw all DAI from CFIHSC', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tokenAmounts = await cfolioItemHandlerSCContract.getAmounts(
      cryptofolioItemAddressBoiSC
    );

    const tx = cfolioItemHandlerSCContract.withdraw(
      MAX_UINT256,
      cfolioItemTokenId,
      [tokenAmounts[0], 0, 0, 0, tokenAmounts[4]]
    );
    await chai.expect(tx).to.not.be.reverted;
  });

  it('should check that DAI was returned to wallet', async function () {
    this.timeout(60 * 1000);

    const { daiContract } = contracts;

    // Check marketing wallet balance
    const currentDaiBalance = await daiContract.balanceOf(
      marketingWallet.address
    );
    chai
      .expect(
        currentDaiBalance
          .div(ethers.BigNumber.from('1000000000000000'))
          .toNumber()
      ) // 1e15
      .to.be.closeTo(4000, 2); // 4 DAI
  });

  it('should check the remaining yCRV balance in wallet', async function () {
    this.timeout(60 * 1000);

    const { curveYTokenContract } = contracts;

    // Check CFolioItemHandlerSC balance
    const currentYPoolBalance = await curveYTokenContract.balanceOf(
      marketingWallet.address
    );
    chai.expect(currentYPoolBalance).to.equal(0);
  });

  it('should check c-folio item shares in c-folio farm', async function () {
    this.timeout(60 * 1000);

    const { cfolioItemHandlerSCContract } = contracts;

    const tokenAmounts = await cfolioItemHandlerSCContract.getAmounts(
      cryptofolioItemAddressBoiSC
    );

    chai.expect(tokenAmounts[0].toNumber()).to.be.closeTo(0, 1);
    chai.expect(tokenAmounts[1].toNumber()).to.be.closeTo(0, 1);
    chai.expect(tokenAmounts[2].toNumber()).to.be.closeTo(0, 1);
    chai.expect(tokenAmounts[3].toNumber()).to.be.closeTo(0, 1);
    chai.expect(tokenAmounts[4]).to.equal(0);
  });

  it('should burn the empty investment SFT', async function () {
    this.timeout(60 * 1000);

    const { sftHolderContract } = contracts;

    // Burn investment SFT
    const tx = sftHolderContract.burnBatch(marketingWallet.address, [
      cfolioItemTokenId,
    ]);
    await chai.expect(tx).to.not.be.reverted;

    // Log gas cost
    const receipt = await (await tx).wait();
    const gasUsedGwei = receipt.gasUsed;
    const gasCost =
      gasUsedGwei
        .mul(await getGasPrice())
        .div(ethers.BigNumber.from('1000000000000000')) / 1000.0;
    console.log(
      `    Burn unlocked SC SFT (in wallet) gas: ${gasUsedGwei} (${gasCost} ETH / $${await toUsd(
        gasCost
      )})`
    );
  });
});
