/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import WalletConnectProvider from '@walletconnect/web3-provider';
import IERC20Abi from 'abi/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json';
import UniV2PairAbi from 'abi/contracts/interfaces/uniswap/IUniswapV2Pair.sol/IUniswapV2Pair.json';
import CFolioItemHandlerAbi from 'abi/contracts/src/cfolio/interfaces/ICFolioItemHandler.sol/ICFolioItemHandler.json';
import SFTMinterAbi from 'abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import CFolioFarmAbi from 'abi/contracts/src/investment/CFolioFarm.sol/CFolioFarm.json';
import StakeAbi from 'abi/contracts/src/investment/UniV2StakeFarm.sol/UniV2StakeFarm.json';
import TradeFloorAbi from 'abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import TokenAbi from 'abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import SFTHolderAbi from 'abi/contracts/src/token/WOWSErc1155.sol/WOWSERC1155.json';
import async from 'async';
import { ethers } from 'ethers';
import Emitter from 'events';
import Dispatcher from 'flux';
import React from 'react';
import { WalletLink } from 'walletlink';
import Web3Modal, {
  getInjectedProvider,
  getProviderDescription,
  IProviderOptions,
} from 'web3modal';

import WalletLinkLogo from '../assets/coinbase-wallet.svg';
import { CARD_LEVEL, CARDS, CFOLIO_ITEMS } from '../components/types/cards';
import { addresses } from '../config/addresses';
import { privateNetworkRPC, privateNetworkWS } from '../config/networks';
import {
  ASSETS_STATE,
  CFOLIO_ITEM_BUY,
  CFOLIO_ITEM_DEPOSIT_LP,
  CFOLIO_ITEM_LOCK_TRANSFER,
  CFOLIO_ITEM_WITHDRAW_LP,
  CONNECTION_CHANGED,
  ERC20_TOKEN_CONTRACT,
  NEW_BLOCK,
  SFT_BUY,
  SFT_CLAIM,
  SFT_LOCK,
  SFT_REWARD,
  SFT_UNLOCK,
  STAKE_ADD,
  STAKE_CLAIM,
  STAKE_EXIT,
  STAKE_LP_AVAILABLE,
  STAKE_STATE,
} from './constants';

const emitter = new Emitter.EventEmitter();
const dispatcher = new Dispatcher.Dispatcher();

type PayloadContent = {
  amount?: number;
  investment?: number;
  id?: ethers.BigNumber;
  type?: number;
  filter?: Array<string>;
};

type PayloadContentCFolioItem = {
  wowsAmount: number;
  investAmount: number[];
  sftTokenId: ethers.BigNumber;
  cfolioTokenId?: ethers.BigNumber;
  cfolioType: number;
};

export type PayloadContentCFolioItemLT = {
  src: ethers.BigNumber;
  dst: ethers.BigNumber;
  lockCFIs: ethers.BigNumber[];
  transferCFIs: ethers.BigNumber[];
};

export type Payload = {
  type: string;
  content: PayloadContent;
};

type ChainAddresses = {
  token: string;
  stakeFarm: string;
  sftMinter: string;
  sftHolder: string;
  tradeFloorProxy: string;
  cfolioItemHandlerLPProxy: string;
  cfolioFarmLP: string;
};
interface IIndexable {
  [key: number]: ChainAddresses;
}

export type AssetStateresult = {
  status: 'error' | 'loaded' | 'cards' | 'tokens' | 'cfolio_amount' | 'rewards';
};

export type TokenContractResult = {
  error: string | undefined;
  tokenAmount: number | undefined;
};

export type ConnectResult = {
  type: 'event' | 'prod';
  address: string;
  networkName: string;
};

export type StatusResult = {
  status: 'error' | 'tx' | 'success' | 'approve';
  type: string;
  errorMessage: string | undefined;
  tx: string | undefined;
};

export type StakeResult = {
  error: string | undefined;
  state: {
    poolSupply: number; // amount tokens in pool
    reserve0: number; // amount pair::token0
    reserve1: number; // amount pair::token1
    priceReserve0: number; // price per token0
    stakeSupply: number; // amount tokens staked
    stakeSupplyUser: number; // amount tokens staked user
    rewardsDuration: number; // duration in seconds reward is based on
    rewardPerDuration: number; // reward per rewardsDuration time
    earned: number; // amount of reward tokens earned
  };
};

export type SFTCHILD = {
  tokenId: ethers.BigNumber;
  levelId: number;
  cardId: number;
  locked: boolean;
  type: number;
  assets: number[];
};

export type SFT = {
  tokenId: ethers.BigNumber;
  levelId: number;
  cardId: number;
  isBaseCard: boolean;
  isStockCard: boolean;
  isWallet: boolean;
  locked: boolean;
  rewardRate: number;
  rewardShare: number;
  rewardEarned: number;
  mintTimestamp: number;
  cfolioItems: SFTCHILD[];
};

export const BIGNUMBER_MAX = ethers.BigNumber.from(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
);

type cbf = async.AsyncResultCallback<unknown, Error>;

export const REWARD_POOL_LP = 0;
export const REWARD_POOL_SC = 1;

type REWARD_INFO = {
  total: number;
  rewardDuration: number;
  rewardPerDuration: number;
};

type ASSETS = {
  userSFT: SFT[];
  cards: CARDS;
  cfolioItems: CFOLIO_ITEMS[];
  rewardInfo: REWARD_INFO[];
};

const readUint256 = (s: string, i: number) =>
  ethers.BigNumber.from('0x' + s.substr(i * 64 + 2, 64));

class Store {
  web3Modal: Web3Modal;
  /* Provider */
  ethersProvider: ethers.providers.JsonRpcProvider | null = null;
  eventProvider: ethers.providers.WebSocketProvider | null = null;
  ethersSigner?: ethers.Signer;
  /* Contracts */
  tokenContract: ethers.Contract | null = null;
  cfihLpContract: ethers.Contract | null = null;

  sftHolderContractRO: ethers.Contract | null = null;
  sftMintContractRO: ethers.Contract | null = null;
  stakeContractRO: ethers.Contract | null = null;
  tradeFloorContractRO: ethers.Contract | null = null;
  lpContractRO: ethers.Contract | null = null;
  uniDaiWethPairContractRO: ethers.Contract | null = null;

  cfolioFarmLpAddress = '';

  static nullAddress = '0x0000000000000000000000000000000000000000';
  static BASE_CARD_MAX = ethers.BigNumber.from('0xFFFFFFFFFFFFFFFF');
  static STOCK_CARD_MAX = ethers.BigNumber.from('0xFFFFFFFF');
  static DUST_18 = ethers.BigNumber.from(1000000000000);

  /* Misc */
  networkName = 'mainnet';
  accountId = 0;
  chainId = 0;
  address = '';
  tokenContractAddress = Store.nullAddress;
  pauseSFTUser = false;
  eventBlockNumber = 0;

  dispatchQueue: Payload[] = [];

  assets = {
    userSFT: [],
    cards: { levelNames: [], cards: [], myPackLevelDescriptions: [] },
    cfolioItems: [],
    rewardInfo: new Array(2).fill({
      total: 0,
      rewardDuration: 0,
      rewardPerDuration: 0,
    }),
  } as ASSETS;

  constructor() {
    const providerOptions: IProviderOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID,
        },
      },
      'custom-walletlink': {
        display: {
          logo: WalletLinkLogo,
          name: 'WalletLink',
          description: 'Scan with WalletLink to connect',
        },
        options: {
          appName: 'WolvesOfWallStreet', // Your app name
          networkUrl: `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID}`,
          chainId: this.chainId,
        },
        package: WalletLink,
        connector: async (_, options) => {
          const { appName, networkUrl, chainId } = options;
          const walletLink = new WalletLink({
            appName,
          });
          const provider = walletLink.makeWeb3Provider(networkUrl, chainId);
          await provider.enable();
          return provider;
        },
      },
    };

    const providerInfo = getInjectedProvider();
    if (providerInfo) {
      providerOptions.injected = {
        display: {
          logo: providerInfo.logo,
          name: providerInfo.name,
          description: getProviderDescription(providerInfo),
        },
        package: null,
      };
    }

    this.web3Modal = new Web3Modal({
      network: this.networkName,
      cacheProvider: true,
      providerOptions: providerOptions,
    });

    dispatcher.register((payload) => {
      const _payload = payload as Payload;
      switch (_payload.type) {
        case CFOLIO_ITEM_BUY:
          this._doCFolioItemBuy(_payload.content as PayloadContentCFolioItem);
          break;
        case CFOLIO_ITEM_DEPOSIT_LP:
          this._doCFolioItemDepositLP(
            _payload.content as PayloadContentCFolioItem
          );
          break;
        case CFOLIO_ITEM_WITHDRAW_LP:
          this._doCFolioItemWithdrawLP(
            _payload.content as PayloadContentCFolioItem
          );
          break;
        case CFOLIO_ITEM_LOCK_TRANSFER:
          this._doCFolioItemLockAndTransfer(
            _payload.content as PayloadContentCFolioItemLT
          );
          break;
        case ERC20_TOKEN_CONTRACT:
          this._getTokenContractData(_payload.content);
          break;
        /** Staking */
        case STAKE_ADD:
          this._doStakeAdd(_payload.content);
          break;
        case STAKE_CLAIM:
          this._doStakeClaim(_payload.content);
          break;
        case STAKE_EXIT:
          this._doStakeExit(_payload.content);
          break;
        case STAKE_STATE:
          this._getStakeState(_payload.content);
          break;
        case STAKE_LP_AVAILABLE:
          this._getPoolTokenAmount(_payload.content);
          break;
        /** SFT */
        case SFT_BUY:
          this._doSftBuy(_payload.content);
          break;
        case SFT_CLAIM:
          this._doSftClaim(_payload.content);
          break;
        case SFT_LOCK:
          this._doSftLock(_payload.content);
          break;
        case SFT_REWARD:
          this._getSftRewards(_payload.content);
          break;
        case ASSETS_STATE:
          if (_payload.content.filter?.includes('cards'))
            this._getSftState(_payload.content);
          if (_payload.content.filter?.includes('tokens'))
            this._getUserSft(_payload.content);
          break;
        case SFT_UNLOCK:
          this._doSftUnlock(_payload.content);
          break;
        default: {
          return;
        }
      }
    });

    /** Load assets **/
    import('locales/en_US/cards.json').then((content) => {
      this.assets.cards.levelNames = content.default.levelNames;
      this.assets.cards.cards = content.default.levels as CARD_LEVEL[];
      // Temporary remove NOLE and WARG
      this.assets.cards.cards[1].cards.splice(3, 1);
      this.assets.cards.cards[5].cards.splice(3, 1);
      // Load CFolioItems
      import('locales/en_US/cFolioItems.json').then((content) => {
        this.assets.cfolioItems = content.default as CFOLIO_ITEMS[];
        emitter.emit(ASSETS_STATE, { status: 'loaded' } as AssetStateresult);
      });
    });
  }

  mount() {
    this.autoconnect();
  }

  unmount() {
    this.close();
  }

  getAssets = () => {
    return this.assets;
  };

  /*********************** NETWORK ******************/

  connect = async () => {
    try {
      if (this.ethersProvider !== null) {
        await this.disconnect(false);
      }

      let ethersProvider: ethers.providers.JsonRpcProvider;
      if (this.networkName === 'private') {
        ethersProvider = new ethers.providers.JsonRpcProvider(
          privateNetworkRPC
        );
      } else {
        const web3Provider = await this.web3Modal.connect();
        await this.subscribeProvider(web3Provider);

        ethersProvider = new ethers.providers.Web3Provider(web3Provider);
      }
      const accounts = await ethersProvider.listAccounts();
      this.address = ethers.utils.getAddress(accounts[this.accountId]);
      const network = await ethersProvider.getNetwork();
      this.chainId = network.chainId;
      if (this.networkName !== 'private') this.networkName = network.name;
      await this._launchEventProvider();
      if (await this._setupContracts(ethersProvider)) this._emitNetworkChange();
      this.ethersProvider = ethersProvider;
      this.ethersSigner = ethersProvider.getSigner(this.accountId);
    } catch (e) {
      console.log(e);
      await this.disconnect(true);
    }
  };

  autoconnect = async () => {
    const query = new URLSearchParams(window.location.search);
    const defaultNetwork = query.get('network');
    const defaultAccountId = query.get('accountId');

    if (defaultNetwork) this.networkName = defaultNetwork;
    if (defaultAccountId) this.accountId = parseInt(defaultAccountId);

    if (this.web3Modal.cachedProvider) {
      await this.connect();
    } else await this._launchEventProvider();
  };

  subscribeProvider = async (provider: ethers.providers.Provider) => {
    if (!provider.on) {
      return;
    }

    provider.on('close', () => {
      this.disconnect(true);
    });

    provider.on('disconnect', () => {
      this.disconnect(true);
    });

    provider.on('accountsChanged', async (accounts: string[]) => {
      if (accounts[0] !== this.address) {
        this.address = accounts[0];
        this._emitNetworkChange();
      }
    });

    provider.on('chainChanged', async (chainId: number) => {
      if (chainId !== this.chainId) {
        await this.connect();
      }
    });

    provider.on('networkChanged', async () => {
      if (this.ethersProvider !== null) {
        const network = await this.ethersProvider.getNetwork();
        if (network.chainId !== this.chainId) await this.connect();
      }
    });
  };

  disconnect = async (clearCache: boolean) => {
    if (this.ethersProvider) {
      localStorage.removeItem('walletconnect');
      this.ethersProvider.removeAllListeners();
      this.tokenContract = null;
      this.ethersProvider = null;
      this.cfihLpContract = null;
      this.ethersSigner = undefined;
    }
    this.address = '';
    if (clearCache) {
      this.web3Modal.clearCachedProvider();
    }
    this._emitNetworkChange();
  };

  close = async () => {
    this.stakeContractRO = null;
    this.sftHolderContractRO?.removeAllListeners();
    this.sftHolderContractRO = null;
    this.sftMintContractRO = null;
    this.tradeFloorContractRO?.removeAllListeners();
    this.tradeFloorContractRO = null;
    this.lpContractRO = null;
    await this.disconnect(false);
    if (this.eventProvider) {
      this.eventProvider?.removeAllListeners();
      this.eventProvider._websocket.onclose = null;
      await this.eventProvider?.destroy();
      this.eventProvider = null;
    }
  };

  isConnected = () => {
    return this.ethersProvider !== null;
  };

  isEventConnected = () => {
    return this.eventProvider !== null;
  };

  _addDQ = async (block: number, payload: Payload) => {
    if (block > this.eventBlockNumber) {
      if (
        !this.dispatchQueue.find(
          (elem) => JSON.stringify(elem) === JSON.stringify(payload)
        )
      )
        this.dispatchQueue.push(payload);
    } else {
      dispatcher.dispatch(payload);
    }
  };

  _setupEvents(): boolean {
    this.eventProvider?.removeAllListeners();
    this.sftHolderContractRO?.removeAllListeners();
    this.tradeFloorContractRO?.removeAllListeners();

    const handleTransfer = (from: string, to: string) => {
      const filter = ['cards'];
      if (
        !this.pauseSFTUser &&
        (from === this.address || to === this.address)
      ) {
        filter.push('tokens');
      }
      this._addDQ(0, { type: ASSETS_STATE, content: { filter } } as Payload);
    };

    // Our Block ticker
    this.eventProvider?.on('block', (blockNumber) => {
      emitter.emit(NEW_BLOCK, { blockNumber });
      this.eventBlockNumber = blockNumber;
      this.dispatchQueue.forEach((payload) => dispatcher.dispatch(payload));
      this.dispatchQueue = [];
    });
    this.sftHolderContractRO?.on('TransferSingle', (operator, from, to) =>
      handleTransfer(from, to)
    );
    this.sftHolderContractRO?.on('TransferBatch', (operator, from, to) =>
      handleTransfer(from, to)
    );
    this.tradeFloorContractRO?.on('TransferSingle', (operator, from, to) =>
      handleTransfer(from, to)
    );
    this.tradeFloorContractRO?.on('TransferBatch', (operator, from, to) =>
      handleTransfer(from, to)
    );
    this.lpContractRO?.on('Transfer', (from, to) => {
      if (from === this.address || to === this.address) {
        dispatcher.dispatch({ type: STAKE_LP_AVAILABLE } as Payload);
      }
    });
    return true;
  }

  _emitNetworkChange() {
    emitter.emit(CONNECTION_CHANGED, {
      type: 'prod',
      address: this.address,
      networkName: this.networkName,
    } as ConnectResult);
    // Request new SFT List
    if (this.address !== '')
      dispatcher.dispatch({
        type: ASSETS_STATE,
        content: { filter: ['tokens'] },
      } as Payload);
    else {
      this.assets.userSFT = [];
      emitter.emit(ASSETS_STATE, { status: 'tokens' } as AssetStateresult);
    }
  }

  _launchEventProvider = async () => {
    try {
      if (
        !this.eventProvider ||
        (await this.eventProvider?.getNetwork()).chainId !== this.chainId
      ) {
        let eventProvider: ethers.providers.WebSocketProvider;
        if (this.networkName === 'private') {
          eventProvider = new ethers.providers.WebSocketProvider(
            privateNetworkWS
          );
        } else {
          eventProvider = ethers.providers.InfuraProvider.getWebSocketProvider(
            this.networkName,
            process.env.REACT_APP_INFURA_ID
          );
        }
        if (!this.chainId)
          this.chainId = (await eventProvider.getNetwork()).chainId;

        await this._setupEventContracts(eventProvider);
        eventProvider._websocket.onclose = () => {
          this.close();
        };
        eventProvider._websocket.onerror = () => {
          this.close();
        };

        this.eventProvider?.removeAllListeners();
        this.eventProvider = eventProvider;

        console.log('EventProvider launched on network: ', this.networkName);
        emitter.emit(CONNECTION_CHANGED, {
          type: 'event',
          address: '',
          networkName: this.networkName,
        } as ConnectResult);
      }
      dispatcher.dispatch({
        type: ASSETS_STATE,
        content: { filter: ['cards'] },
      } as Payload);
      this._setupEvents();
    } catch (e) {
      console.log(e);
      if (this.eventProvider) {
        this.eventProvider = null;
      }
    }
  };

  /******************** Contracts *********************/

  _getChainAddresses(): ChainAddresses | undefined {
    return (addresses as IIndexable)[this.chainId];
  }

  async _setupEventContracts(
    provider: ethers.providers.WebSocketProvider
  ): Promise<void> {
    const chainAddresses = this._getChainAddresses();

    if (chainAddresses) {
      this.tokenContractAddress = chainAddresses.token;
      this.stakeContractRO = new ethers.Contract(
        chainAddresses.stakeFarm,
        StakeAbi,
        provider
      );
      this.lpContractRO = new ethers.Contract(
        await this.stakeContractRO.stakingToken(),
        IERC20Abi,
        provider
      );
      this.sftHolderContractRO = new ethers.Contract(
        chainAddresses.sftHolder,
        SFTHolderAbi,
        provider
      );
      this.sftMintContractRO = new ethers.Contract(
        chainAddresses.sftMinter,
        SFTMinterAbi,
        provider
      );
      if (chainAddresses.tradeFloorProxy !== '') {
        this.tradeFloorContractRO = new ethers.Contract(
          chainAddresses.tradeFloorProxy,
          TradeFloorAbi,
          provider
        );
      }

      this.cfolioFarmLpAddress = chainAddresses.cfolioFarmLP;

      // Temporary because of missing route in stakefarm
      if (this.chainId === 1) {
        this.uniDaiWethPairContractRO = new ethers.Contract(
          '0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11', // UniV2Pair DAI/ETH
          UniV2PairAbi,
          provider
        );
      }
    } else {
      this.tokenContractAddress = Store.nullAddress;
    }
  }

  async _setupContracts(
    provider: ethers.providers.JsonRpcProvider
  ): Promise<boolean> {
    const chainAddresses = this._getChainAddresses();
    if (chainAddresses) {
      const signer = provider.getSigner(this.accountId);
      this.tokenContract = new ethers.Contract(
        chainAddresses.token,
        TokenAbi,
        signer
      );
      this.cfihLpContract = new ethers.Contract(
        chainAddresses.cfolioItemHandlerLPProxy,
        CFolioItemHandlerAbi,
        signer
      );
      return true;
    }
    return false;
  }

  // Should be from getStakeState() in a next iteration
  _getPoolTokenAmount = async (payloadContent: PayloadContent | undefined) => {
    try {
      const result = !this.lpContractRO
        ? 0
        : await this.lpContractRO?.balanceOf(this.address);
      emitter.emit(STAKE_LP_AVAILABLE, {
        tokenAmount: this.fromWei(result),
      } as TokenContractResult);
    } catch (e) {
      emitter.emit(STAKE_LP_AVAILABLE, {
        error: e.message,
      } as TokenContractResult);
    }
  };

  _getStakeState = async (payloadContent: PayloadContent | undefined) => {
    try {
      const result: ethers.BigNumber[] | undefined =
        await this.stakeContractRO?.getUIData(
          this.address === '' ? Store.nullAddress : this.address
        );

      if (result) {
        const stakeInfo: StakeResult = {
          error: undefined,
          state: {
            poolSupply: this.fromWei(result[0]),
            reserve0: this.fromWei(result[1]),
            reserve1: this.fromWei(result[2]),
            priceReserve0: this.fromWei(result[3]),
            stakeSupply: this.fromWei(result[4]),
            stakeSupplyUser: this.fromWei(result[5]),
            rewardsDuration: result[6].toNumber(),
            rewardPerDuration: this.fromWei(result[7]),
            earned: this.fromWei(result[8]),
          },
        };
        if (this.uniDaiWethPairContractRO) {
          const reserves = await this.uniDaiWethPairContractRO.getReserves();
          stakeInfo.state.priceReserve0 = reserves.reserve0.div(
            reserves.reserve1
          );
        }
        emitter.emit(STAKE_STATE, stakeInfo);
      }
    } catch (e) {
      emitter.emit(STAKE_STATE, { error: e.message });
    }
  };

  _getSftState = async (payloadContent: PayloadContent | undefined) => {
    // Loop through the assets and build up level / cardIds to query
    const levels: ethers.BigNumber[] = [];
    const cardIds: ethers.BigNumber[] = [];

    this.assets.cards.cards.forEach((level) =>
      level.cards.forEach((card) => {
        levels.push(ethers.BigNumber.from(level.chainRef));
        cardIds.push(ethers.BigNumber.from(card.chainRef));
      })
    );

    try {
      const sftResult: number[] | undefined =
        await this.sftHolderContractRO?.getCardDataBatch(levels, cardIds);

      if (sftResult !== undefined && sftResult.length > 0) {
        let index = 0;
        this.assets.cards.cards.forEach((level) =>
          level.cards.forEach((card) => {
            level.quantity = sftResult[index++];
            card.minted = sftResult[index++];
          })
        );
      }

      const cfolioTypes: number[] = [];
      this.assets.cfolioItems.forEach((elem) =>
        elem.cards.forEach((card) => cfolioTypes.push(card.chainRef))
      );

      const cfolioResult: [
        ethers.BigNumber[],
        ethers.BigNumber[],
        ethers.BigNumber[]
      ] = await this.sftMintContractRO?.getCFolioSpec(cfolioTypes);
      let index = 0;

      this.assets.cfolioItems.forEach((elem) =>
        elem.cards.forEach((card) => {
          card.price = this.fromWei(cfolioResult[0][index]);
          card.minted = cfolioResult[1][index].toNumber();
          card.maxMintable = cfolioResult[2][index].toNumber();
          ++index;
        })
      );
      emitter.emit(ASSETS_STATE, { status: 'cards' } as AssetStateresult);
    } catch (e) {
      console.log(e.message);
    }
  };

  _getUserSft = async (payloadContent: PayloadContent | undefined) => {
    if (this.address === '' || !this.sftMintContractRO) return;

    const filterSpecialCards = (data: ethers.BigNumber[]) =>
      data.filter(
        (n) =>
          n.mask(128).gt(Store.BASE_CARD_MAX) ||
          (n.mask(128).toNumber() >> 16 !== 0x0103 &&
            n.mask(128).toNumber() >> 16 !== 0x0503)
      );

    try {
      const result: [ethers.BigNumber[], ethers.BigNumber[]] =
        await this.sftMintContractRO.getTokenIds(this.address);

      const mergeList = filterSpecialCards(result[0]);
      mergeList.push(...filterSpecialCards(result[1]));

      const newUserSFT: SFT[] = mergeList
        .filter((n) => n.mask(128).lte(Store.BASE_CARD_MAX))
        .map((bn, index) => {
          const cr = bn.mask(32).toNumber() >> 16;
          let cardIndex = 0;
          const levelIndex = this.assets.cards.cards.findIndex(
            (l) =>
              l.chainRef << 8 === (cr & 0xff00) &&
              (cardIndex = l.cards.findIndex(
                (c) => c.chainRef === (cr & 0xff)
              )) >= 0
          );
          return {
            tokenId: bn,
            levelId: levelIndex,
            cardId: cardIndex,
            isBaseCard: bn.mask(128).lte(Store.BASE_CARD_MAX),
            isStockCard: bn.mask(128).lte(Store.STOCK_CARD_MAX),
            isWallet: false,
            locked: result[1].find((b) => b.eq(bn)) !== undefined,
            rewardRate: 0,
            rewardShare: 0,
            rewardEarned: 0,
            mintTimestamp: 0,
            cfolioItems: [],
          };
        })
        .sort((a, b) =>
          a.tokenId.mask(128).gt(b.tokenId.mask(128))
            ? 1
            : a.tokenId.mask(128).lt(b.tokenId.mask(128))
            ? -1
            : 0
        );
      // Create a dummy UserTokenId UINT256Max for the users wallet
      newUserSFT.unshift({
        tokenId: BIGNUMBER_MAX,
        levelId: -1,
        cardId: -1,
        isBaseCard: false,
        isStockCard: false,
        isWallet: true,
        locked: false,
        rewardRate: 0,
        rewardShare: 0,
        rewardEarned: 0,
        mintTimestamp: 0,
        cfolioItems: [],
      });

      // Get all CFolio Items and tokenId information, root cFolioItems go into wallet (-1)
      // We expect uint256: [%,MintTime,NumItems,[tokenId,type,numAssetValues,[assetValue]]]...
      const result2: string = await this.sftMintContractRO.getTokenInformation(
        mergeList
      );
      let readIndex = 0;
      // We have now a string of uint256Hex values
      mergeList.forEach((tokenId) => {
        //get destination tokenId
        let destinationId: number;
        if (tokenId.mask(128).gt(Store.BASE_CARD_MAX)) destinationId = 0;
        else
          destinationId = newUserSFT.findIndex((sft) =>
            sft.tokenId.eq(tokenId)
          );
        if (destinationId >= 0) {
          newUserSFT[destinationId].rewardRate = readUint256(
            result2,
            readIndex++
          ).toNumber();
          newUserSFT[destinationId].mintTimestamp = readUint256(
            result2,
            readIndex++
          ).toNumber();

          let numCFolios = readUint256(result2, readIndex++).toNumber();
          while (numCFolios > 0) {
            const childId = readUint256(result2, readIndex++);
            const child: SFTCHILD = {
              tokenId: childId,
              levelId: -1,
              cardId: -1,
              locked:
                destinationId !== 0 ||
                result[1].find((b) => b.eq(childId)) !== undefined,
              type: readUint256(result2, readIndex++).toNumber(),
              assets: [],
            };
            child.levelId = this.assets.cfolioItems.findIndex(
              (l) =>
                (child.cardId = l.cards.findIndex(
                  (c) => c.chainRef === child.type
                )) >= 0
            );
            let numAssets = readUint256(result2, readIndex++).toNumber();
            while (numAssets > 0) {
              child.assets.push(
                this.fromWei(readUint256(result2, readIndex++))
              );
              --numAssets;
            }
            newUserSFT[destinationId].cfolioItems.push(child);
            --numCFolios;
          }
        } else throw new Error('Mismatch in tokenId array');
      });

      this.assets.userSFT = newUserSFT;
      emitter.emit(ASSETS_STATE, { status: 'tokens' } as AssetStateresult);
    } catch (e) {
      console.log(e.message);
    }
  };

  _getSftRewards = async (plc: PayloadContent) => {
    try {
      if (!this.cfihLpContract) return;

      const wolves = this.assets.userSFT.filter(
        (sft) =>
          sft.isBaseCard &&
          this.assets.cards.cards[sft.levelId].type === 'wolves'
      );

      if (wolves.length === 0) return;

      // Returns totalsupply, rewardDur, rewardsPerDur, [share, earned]
      const result = await this.cfihLpContract.getRewardInfo(
        wolves.map((sft) => sft.tokenId)
      );
      let readIndex = 0;
      const ri = this.assets.rewardInfo[0];
      ri.total = this.fromWei(readUint256(result, readIndex++));
      ri.rewardDuration = readUint256(result, readIndex++).toNumber();
      ri.rewardPerDuration = this.fromWei(readUint256(result, readIndex++));
      wolves.forEach((sft) => {
        sft.rewardShare = this.fromWei(readUint256(result, readIndex++));
        sft.rewardEarned = this.fromWei(readUint256(result, readIndex++));
      });
      emitter.emit(ASSETS_STATE, { status: 'rewards' } as AssetStateresult);
    } catch (e) {
      console.log(e.message);
    }
  };

  _setCFolioAmount(
    receipt: ethers.providers.TransactionReceipt,
    sft: ethers.BigNumber,
    cfolio: ethers.BigNumber
  ) {
    const iface = new ethers.utils.Interface(CFolioFarmAbi);
    receipt.logs.find((log) => {
      if (log.address === this.cfolioFarmLpAddress) {
        const parsed = iface.parseLog(log);
        if (['AssetAdded', 'AssetRemoved'].includes(parsed.name)) {
          this.assets.userSFT.find(
            (isft) =>
              isft.tokenId === sft &&
              isft.cfolioItems.find((item) => {
                if (item.tokenId === cfolio) {
                  item.assets[0] = this.fromWei(parsed.args[2]);
                  emitter.emit(ASSETS_STATE, {
                    status: 'cfolio_amount',
                  } as AssetStateresult);
                  return true;
                }
                return false;
              })
          );
          return true;
        }
      }
      return false;
    });
  }

  _getTokenContractAddress() {
    return this.tokenContractAddress;
  }

  _getTokenContractData = async (payloadContent: PayloadContent) => {
    async.parallel(
      [
        (callbackInner) => {
          this._getTokenAmount(payloadContent, callbackInner);
        },
      ],
      (err, data: unknown) => {
        if (err) {
          console.log(err);
          emitter.emit(ERC20_TOKEN_CONTRACT, { error: err.toString() });
        } else {
          const asset: TokenContractResult = {
            error: undefined,
            tokenAmount: 0,
          };
          const numberArray = data as Array<number>;
          asset.tokenAmount = numberArray[0];
          emitter.emit(ERC20_TOKEN_CONTRACT, asset);
        }
      }
    );
  };

  /************** TX ****************/

  _doStakeAdd = async (payloadContent: PayloadContent) => {
    const { amount } = payloadContent;

    try {
      if (!amount) {
        throw new Error('Invalid amount');
      }

      if (!this.lpContractRO || !this.stakeContractRO || !this.ethersSigner) {
        throw new Error('Invalid contract');
      }

      let stakeAmount = this.toWei(amount);
      // Fix math inaccuraties
      const available: ethers.BigNumber = await this.lpContractRO.balanceOf(
        this.address
      );
      if (
        (available.gt(stakeAmount) && available.sub(stakeAmount).lt(1000)) ||
        (available.lt(stakeAmount) && stakeAmount.sub(available).lt(1000))
      )
        stakeAmount = available;

      if (stakeAmount > available) {
        throw new Error('Insufficient LP token');
      }

      const allowance = await this.lpContractRO.allowance(
        this.address,
        this.stakeContractRO.address
      );

      if (allowance.lt(stakeAmount)) {
        const lpContract = this.lpContractRO.connect(this.ethersSigner);
        const tx = await lpContract.approve(
          this.stakeContractRO.address,
          stakeAmount
        );
        emitter.emit(STAKE_ADD, {
          status: 'approve',
          tx: tx?.hash,
        } as StatusResult);

        await tx.wait();
      }

      const stakeContract = this.stakeContractRO.connect(this.ethersSigner);
      const tx: ethers.ContractTransaction | undefined =
        await stakeContract?.stake(stakeAmount);
      emitter.emit(STAKE_ADD, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      await tx?.wait();
      emitter.emit(STAKE_ADD, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      emitter.emit(STAKE_ADD, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doStakeClaim = async (payloadContent: PayloadContent) => {
    try {
      if (!this.stakeContractRO || !this.ethersSigner) {
        throw new Error('Invalid contract');
      }

      const stakeContract = this.stakeContractRO.connect(this.ethersSigner);
      const tx: ethers.ContractTransaction | undefined =
        await stakeContract.getReward();
      emitter.emit(STAKE_CLAIM, {
        status: 'tx',
        type: STAKE_CLAIM,
        tx: tx?.hash,
      } as StatusResult);

      await tx?.wait();
      emitter.emit(STAKE_CLAIM, {
        status: 'success',
        type: STAKE_CLAIM,
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      emitter.emit(STAKE_CLAIM, {
        status: 'error',
        type: STAKE_CLAIM,
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doStakeExit = async (payloadContent: PayloadContent) => {
    try {
      if (!this.stakeContractRO || !this.ethersSigner) {
        throw new Error('Invalid contract');
      }

      const stakeContract = this.stakeContractRO.connect(this.ethersSigner);
      const tx: ethers.ContractTransaction | undefined =
        await stakeContract.exit();
      emitter.emit(STAKE_EXIT, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      await tx?.wait();
      emitter.emit(STAKE_EXIT, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      emitter.emit(STAKE_EXIT, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doSftBuy = async (payloadContent: PayloadContent) => {
    const { amount, id } = payloadContent;

    try {
      if (!amount || id === undefined) {
        throw new Error('Invalid input');
      }

      if (
        !this.sftMintContractRO ||
        !this.tokenContract ||
        !this.sftHolderContractRO ||
        !this.ethersSigner
      ) {
        throw new Error('Invalid contract');
      }

      const sftAmount = this.toWei(amount);
      const walletAmount = await this.tokenContract.balanceOf(this.address);

      if (sftAmount.gt(walletAmount)) {
        throw new Error('Insufficient balances');
      }

      const cardData = await this.sftHolderContractRO?.getCardDataBatch(
        [id.toNumber() >> 8],
        [id.toNumber() & 0xff]
      );
      if (cardData[0] <= cardData[1]) {
        throw new Error('No cards available');
      }

      const sftMintContract = this.sftMintContractRO.connect(this.ethersSigner);
      const allowance = await this.tokenContract.allowance(
        this.address,
        sftMintContract.address
      );

      if (allowance.lt(sftAmount)) {
        const tx = await this.tokenContract.approve(
          sftMintContract.address,
          sftAmount
        );
        emitter.emit(SFT_BUY, {
          status: 'approve',
          tx: tx?.hash,
        } as StatusResult);

        await tx.wait();
      }

      const tx: ethers.ContractTransaction | undefined =
        await sftMintContract?.mintWowsSFT(
          this.address,
          id.toNumber() >> 8,
          id.toNumber() & 0xff,
          { gasLimit: 420000 }
        );
      emitter.emit(SFT_BUY, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      await tx?.wait();
      emitter.emit(SFT_BUY, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      emitter.emit(SFT_BUY, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doSftLock = async (payloadContent: PayloadContent) => {
    const { id } = payloadContent;
    if (id === undefined) {
      emitter.emit(SFT_LOCK, {
        status: 'error',
        errorMessage: 'Invalid id',
      } as StatusResult);
      return;
    }

    if (
      !this.sftHolderContractRO ||
      !this.tradeFloorContractRO ||
      !this.ethersProvider
    ) {
      emitter.emit(SFT_LOCK, {
        status: 'error',
        errorMessage: 'Invalid contract state',
      } as StatusResult);
      return;
    }

    const sftHolderContract = new ethers.Contract(
      this.sftHolderContractRO.address,
      this.sftHolderContractRO.interface,
      this.ethersProvider.getSigner(this.accountId)
    );

    try {
      this.pauseSFTUser = true;
      const tx: ethers.ContractTransaction | undefined =
        await sftHolderContract.safeTransferFrom(
          this.address,
          this.tradeFloorContractRO.address,
          id,
          1,
          []
        );
      emitter.emit(SFT_LOCK, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      await tx?.wait();
      this._resolveSFTUser(id, true);
      emitter.emit(SFT_LOCK, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      this.pauseSFTUser = true;
      emitter.emit(SFT_LOCK, {
        status: 'error',
        type: SFT_LOCK,
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doSftUnlock = async (payloadContent: PayloadContent) => {
    const { id } = payloadContent;
    if (id === undefined) {
      emitter.emit(SFT_UNLOCK, {
        status: 'error',
        errorMessage: 'Invalid id',
      } as StatusResult);
      return;
    }

    if (!this.tradeFloorContractRO || !this.ethersSigner) {
      emitter.emit(SFT_UNLOCK, {
        status: 'error',
        errorMessage: 'Invalid contract state',
      } as StatusResult);
      return;
    }

    try {
      const tradeFloorContract = this.tradeFloorContractRO.connect(
        this.ethersSigner
      );

      this.pauseSFTUser = true;
      const tx: ethers.ContractTransaction | undefined =
        await tradeFloorContract.burn(this.address, id, 1);
      emitter.emit(SFT_UNLOCK, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      await tx?.wait();
      this._resolveSFTUser(id, false);
      emitter.emit(SFT_UNLOCK, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      this.pauseSFTUser = true;
      emitter.emit(SFT_UNLOCK, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doCFolioItemBuy = async (payloadContent: PayloadContentCFolioItem) => {
    const { wowsAmount, investAmount, sftTokenId, cfolioType } = payloadContent;

    try {
      if (
        !this.sftMintContractRO ||
        !this.tokenContract ||
        !this.lpContractRO ||
        !this.cfihLpContract ||
        !this.ethersSigner
      ) {
        throw new Error('Contract not initialized');
      }

      if (wowsAmount > 0) {
        const weiAmount = this.toWei(wowsAmount);
        const walletAmount = await this.tokenContract.balanceOf(this.address);
        if (weiAmount.gt(walletAmount)) {
          throw new Error('Insufficient WOWS balances');
        }
      }

      let investWeiAmount = ethers.BigNumber.from(0);
      if (investAmount[0] > 0) {
        investWeiAmount = this.toWei(investAmount[0]);
        const walletAmount = await this.lpContractRO.balanceOf(this.address);
        if (investWeiAmount.gt(walletAmount)) {
          if (investWeiAmount.sub(walletAmount).lt(Store.DUST_18)) {
            investWeiAmount = walletAmount;
          } else {
            throw new Error('Insufficient LP balances');
          }
        } else if (walletAmount.sub(investWeiAmount).lt(Store.DUST_18))
          // Try to invest dust, too
          investWeiAmount = walletAmount;
      }

      const sftMintContract = this.sftMintContractRO.connect(this.ethersSigner);

      if (wowsAmount > 0) {
        const allowance = await this.tokenContract.allowance(
          this.address,
          sftMintContract.address
        );
        const weiAmount = this.toWei(wowsAmount);
        if (allowance.lt(weiAmount)) {
          const tx = await this.tokenContract.approve(
            sftMintContract.address,
            weiAmount
          );
          emitter.emit(CFOLIO_ITEM_BUY, {
            status: 'approve',
            tx: tx?.hash,
          } as StatusResult);
          await tx.wait();
        }
      }

      if (!investWeiAmount.isZero()) {
        const allowance = await this.lpContractRO.allowance(
          this.address,
          this.cfihLpContract.address
        );
        if (allowance.lt(investWeiAmount)) {
          const lpContract = this.lpContractRO.connect(this.ethersSigner);
          const tx = await lpContract.approve(
            this.cfihLpContract.address,
            investWeiAmount
          );
          emitter.emit(CFOLIO_ITEM_BUY, {
            status: 'approve',
            tx: tx?.hash,
          } as StatusResult);
          await tx.wait();
        }
      }

      const tx: ethers.ContractTransaction =
        await sftMintContract?.mintCFolioItemSFT(
          this.address,
          cfolioType,
          sftTokenId,
          cfolioType < 0x10 ? [investWeiAmount] : []
        );
      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'tx',
        tx: tx.hash,
      } as StatusResult);

      //await tx?.wait();
      this.ethersProvider?.once(
        tx.hash,
        (receipt: ethers.providers.TransactionReceipt) => {
          emitter.emit(CFOLIO_ITEM_BUY, {
            status: 'success',
            tx: tx?.hash,
          } as StatusResult);

          // There is no transfer with our address emitted,
          // in case of valid SFT: Request an tokenId update
          if (!sftTokenId.eq(BIGNUMBER_MAX))
            this._addDQ(tx?.blockNumber ?? 0, {
              type: ASSETS_STATE,
              content: { filter: ['tokens'] },
            } as Payload);
        }
      );
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doCFolioItemDepositLP = async (payloadContent: PayloadContentCFolioItem) => {
    const { investAmount, sftTokenId, cfolioTokenId } = payloadContent;

    try {
      if (!cfolioTokenId || !investAmount[0]) {
        throw new Error('Invalid input');
      }

      if (!this.cfihLpContract || !this.lpContractRO || !this.ethersSigner) {
        throw new Error('Contract not initialized');
      }

      let investWeiAmount = this.toWei(investAmount[0]);
      const walletAmount = await this.lpContractRO.balanceOf(this.address);
      if (investWeiAmount.gt(walletAmount)) {
        if (investWeiAmount.sub(walletAmount).lt(Store.DUST_18)) {
          investWeiAmount = walletAmount;
        } else {
          throw new Error('Insufficient LP balances');
        }
      } else if (walletAmount.sub(investWeiAmount).lt(Store.DUST_18)) {
        // Try to invest dust, too
        investWeiAmount = walletAmount;
      }

      const allowance = await this.lpContractRO.allowance(
        this.address,
        this.cfihLpContract.address
      );
      if (allowance.lt(investWeiAmount)) {
        const lpContract = this.lpContractRO.connect(this.ethersSigner);
        const tx = await lpContract.approve(
          this.cfihLpContract.address,
          investWeiAmount
        );
        emitter.emit(CFOLIO_ITEM_DEPOSIT_LP, {
          status: 'approve',
          tx: tx?.hash,
        } as StatusResult);
        await tx.wait();
      }
      const tx = await this.cfihLpContract.deposit(sftTokenId, cfolioTokenId, [
        investWeiAmount,
      ]);
      emitter.emit(CFOLIO_ITEM_DEPOSIT_LP, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      //await tx?.wait();
      this.ethersProvider?.once(
        tx.hash,
        (receipt: ethers.providers.TransactionReceipt) => {
          emitter.emit(CFOLIO_ITEM_DEPOSIT_LP, {
            status: 'success',
            tx: tx?.hash,
          } as StatusResult);
          this._setCFolioAmount(receipt, sftTokenId, cfolioTokenId);
        }
      );
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_DEPOSIT_LP, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doCFolioItemWithdrawLP = async (
    payloadContent: PayloadContentCFolioItem
  ) => {
    const { investAmount, sftTokenId, cfolioTokenId } = payloadContent;

    try {
      if (!cfolioTokenId || !investAmount[0]) {
        throw new Error('Invalid input');
      }

      if (!this.cfihLpContract || !this.sftHolderContractRO) {
        throw new Error('Contract not initialized');
      }

      // get cFolioAddress from cFolioTokenId
      const cfa = await this.sftHolderContractRO.tokenIdToAddress(
        cfolioTokenId.mask(128)
      );
      if (cfa === Store.nullAddress) {
        throw new Error('Cannot get cfolio address');
      }

      let withdrawWeiAmount = this.toWei(investAmount[0]);
      const cfolioAmount = (await this.cfihLpContract.getAmounts(cfa))[0];
      if (withdrawWeiAmount.gt(cfolioAmount)) {
        if (withdrawWeiAmount.sub(cfolioAmount).lt(Store.DUST_18)) {
          withdrawWeiAmount = cfolioAmount;
        } else {
          throw new Error('Insufficient LP balances');
        }
      } else if (cfolioAmount.sub(withdrawWeiAmount).lt(Store.DUST_18)) {
        // Try to invest dust, too
        withdrawWeiAmount = cfolioAmount;
      }
      const tx = await this.cfihLpContract.withdraw(sftTokenId, cfolioTokenId, [
        withdrawWeiAmount,
      ]);
      emitter.emit(CFOLIO_ITEM_WITHDRAW_LP, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      //await tx?.wait();
      this.ethersProvider?.once(
        tx.hash,
        (receipt: ethers.providers.TransactionReceipt) => {
          emitter.emit(CFOLIO_ITEM_WITHDRAW_LP, {
            status: 'success',
            tx: receipt.transactionHash,
          } as StatusResult);
          this._setCFolioAmount(receipt, sftTokenId, cfolioTokenId);
        }
      );
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_WITHDRAW_LP, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doCFolioItemLockAndTransfer = async (
    payloadContent: PayloadContentCFolioItemLT
  ) => {
    const { src, dst, lockCFIs, transferCFIs } = payloadContent;

    try {
      if (
        !this.sftHolderContractRO ||
        !this.tradeFloorContractRO ||
        !this.ethersSigner
      ) {
        throw new Error('Contract not initialized');
      }
      if (src === dst) {
        throw new Error('Ooups! src === dest');
      }

      // get destination address
      let dstAddress = this.address;
      if (dst !== BIGNUMBER_MAX) {
        dstAddress = this.sftHolderContractRO.tokenIdToAddress(dst);
        if (dstAddress === Store.nullAddress) {
          throw new Error('Cannot get cfolio address');
        }
      }

      let txBlockNumber = 0;
      if (lockCFIs.length > 0) {
        if (src !== BIGNUMBER_MAX) {
          throw new Error('Lock only from Wallet');
        }
        const sftHolderContract = this.sftHolderContractRO.connect(
          this.ethersSigner
        );
        const tx = await sftHolderContract.safeBatchTransferFrom(
          this.address,
          this.tradeFloorContractRO.address,
          lockCFIs,
          new Array(lockCFIs.length).fill(1),
          dstAddress
        );
        emitter.emit(CFOLIO_ITEM_LOCK_TRANSFER, {
          status: 'tx',
          tx: tx?.hash,
        } as StatusResult);

        await tx?.wait();
        if (transferCFIs.length === 0) {
          txBlockNumber = tx?.blockNumber ?? 0;
          emitter.emit(CFOLIO_ITEM_LOCK_TRANSFER, {
            status: 'success',
            tx: tx?.hash,
          } as StatusResult);
        }
      }
      if (transferCFIs.length > 0) {
        // CFI's has to be in TF contract!
        let srcAddress = this.address;
        if (src !== BIGNUMBER_MAX) {
          srcAddress = this.sftHolderContractRO.tokenIdToAddress(src);
          if (srcAddress === Store.nullAddress) {
            throw new Error('Cannot get cfolio address');
          }
        }
        const tradeFloorContract = this.tradeFloorContractRO.connect(
          this.ethersSigner
        );
        const tx = await tradeFloorContract.safeBatchTransferFrom(
          srcAddress,
          dstAddress,
          transferCFIs,
          new Array(transferCFIs.length).fill(1),
          []
        );
        emitter.emit(CFOLIO_ITEM_LOCK_TRANSFER, {
          status: 'tx',
          tx: tx?.hash,
        } as StatusResult);

        await tx?.wait();
        txBlockNumber = tx?.blockNumber ?? 0;
        emitter.emit(CFOLIO_ITEM_LOCK_TRANSFER, {
          status: 'success',
          tx: tx?.hash,
        } as StatusResult);
      }
      // If we transfer from SFT to SFT, events are not catched
      if (!src.eq(BIGNUMBER_MAX) && !dst.eq(BIGNUMBER_MAX)) {
        this._addDQ(txBlockNumber, {
          type: ASSETS_STATE,
          content: { filter: ['tokens'] },
        } as Payload);
      }
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_LOCK_TRANSFER, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doSftClaim = async (payloadContent: PayloadContent) => {
    try {
      if (!payloadContent.id) {
        throw new Error('Invalid id');
      }
      if (!this.sftMintContractRO || !this.ethersSigner) {
        throw new Error('Invalid contract state');
      }

      const mintContract = this.sftMintContractRO.connect(this.ethersSigner);
      const tx: ethers.ContractTransaction = await mintContract.claimSFTRewards(
        payloadContent.id
      );
      emitter.emit(SFT_CLAIM, {
        status: 'tx',
        type: SFT_CLAIM,
        tx: tx.hash,
      } as StatusResult);

      this.ethersProvider?.once(
        tx.hash,
        (receipt: ethers.providers.TransactionReceipt) => {
          emitter.emit(SFT_CLAIM, {
            status: 'success',
            type: SFT_CLAIM,
            tx: tx.hash,
          } as StatusResult);
          this._addDQ(tx.blockNumber ?? 0, {
            type: SFT_REWARD,
            content: {},
          } as Payload);
        }
      );
    } catch (e) {
      emitter.emit(SFT_CLAIM, {
        status: 'error',
        type: SFT_CLAIM,
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  /************** Getter ****************/

  _getTokenAmount = async (payloadContent: PayloadContent, callback: cbf) => {
    try {
      const result = ethers.BigNumber.from(0);
      //const result = await this.tokenContract.balanceOf(this.address);
      callback(null, this.fromWei(result));
    } catch (e) {
      console.log(e);
      return callback(e);
    }
  };

  /******************** Misc *********************/

  fromWei(n: ethers.BigNumber, decimals = 18) {
    return parseFloat(ethers.utils.formatUnits(n, decimals));
  }

  toWei(n: number, decimals = 18) {
    const parsed = typeof n === 'number' ? n.toFixed(decimals) : n;
    return ethers.utils.parseUnits(parsed, decimals);
  }

  _resolveSFTUser(tokenId: ethers.BigNumber, locked: boolean) {
    if (this.pauseSFTUser) {
      const elem = this.assets.userSFT.find((entry) =>
        entry.tokenId.eq(tokenId)
      );
      if (elem) elem.locked = locked;
      this.pauseSFTUser = false;
      emitter.emit(ASSETS_STATE, { status: 'tokens' } as AssetStateresult);
    }
  }
}

const StoreClasses = {
  store: new Store(),
  emitter: emitter,
  dispatcher: dispatcher,
};

export class StoreContainer extends React.Component<unknown> {
  componentDidMount(): void {
    StoreClasses.store.mount();
  }

  componentWillUnmount(): void {
    StoreClasses.store.unmount();
  }

  render(): React.ReactNode {
    return <>{this.props.children}</>;
  }
}

export { StoreClasses };
