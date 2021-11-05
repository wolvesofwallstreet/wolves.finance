/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import WalletConnectProvider from '@walletconnect/web3-provider';
import ERC20Abi from 'abi/contracts/0xerc1155/interfaces/IERC20.sol/IERC20.json';
import CurveDepositAbi from 'abi/contracts/interfaces/curve/CurveDepositInterface3.sol/ICurveFiDeposit3.json';
import UniV2PairAbi from 'abi/contracts/interfaces/uniswap/IUniswapV2Pair.sol/IUniswapV2Pair.json';
import BoosterAbi from 'abi/contracts/src/booster/Booster.sol/Booster.json';
import CFolioItemHandlerAbi from 'abi/contracts/src/cfolio/interfaces/ICFolioItemHandler.sol/ICFolioItemHandler.json';
import SftEvaluatorAbi from 'abi/contracts/src/cfolio/SFTEvaluator.sol/SFTEvaluator.json';
import SFTMinterAbi from 'abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
import CFolioFarmAbi from 'abi/contracts/src/investment/CFolioFarm.sol/CFolioFarm.json';
import RootTunnelAbi from 'abi/contracts/src/polygon/WOWSERC1155RootTunnel.sol/WOWSERC1155RootTunnel.json';
import TradeFloorAbi from 'abi/contracts/src/token/TradeFloor.sol/TradeFloor.json';
import TokenAbi from 'abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import SFTHolderAbi from 'abi/contracts/src/token/WOWSERC1155.sol/WOWSERC1155.json';
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
import {
  ASSETS_STATE,
  CFOLIO_ITEM_BUY,
  CFOLIO_ITEM_DEPOSIT,
  CFOLIO_ITEM_UNLOCK_TRANSFER,
  CFOLIO_ITEM_WITHDRAW,
  CONNECTION_CHANGED,
  REVOKE_APPROVAL,
  SFT_BUY,
  SFT_CLAIM,
  SFT_CLAIM_BOOSTER,
  SFT_LOCK,
  SFT_PROOF,
  SFT_REWARD,
  SFT_TRANSFER,
  SFT_UNLOCK,
  SFT_UPGRADE,
} from './constants';
import { MessageProof } from './polygon';

const emitter = new Emitter.EventEmitter();
const dispatcher = new Dispatcher.Dispatcher();

type PayloadContent = {
  amount?: number;
  investment?: number;
  time?: number;
  id?: ethers.BigNumber;
  status?: 'locked';
  filter?: Array<string>;
  address?: string;
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
  lockedCFIs: ethers.BigNumber[];
  transferCFIs: ethers.BigNumber[];
};

export type Payload = {
  type: string;
  content: PayloadContent;
};

interface ChainAddresses {
  rpcEndpoint?: string;
  wssEndpoint?: string;
  token: string;
  uniV2Pair: string;
  uniV2PairNative: string;
  stakeFarm?: string;
  sftMinterProxy: string;
  sftHolderProxy: string;
  boosterProxy: string;
  tradeFloorProxy: string;
  sftEvaluatorProxy: string;
  cfolioFarmLP?: string;
  cfolioItemHandlerLPProxy?: string;
  cfolioFarmSC?: string;
  cfiBridgeProxy?: string;
  cfolioItemHandlerSCProxy?: string;
  bridgeTarget: string;
  uniDaiWeth: string;
  daiToken?: string;
  tusdToken?: string;
  usdcToken?: string;
  usdtToken?: string;
  curveADeposit?: string;
  curveAToken?: string;
  curveYDeposit?: string;
  curveYToken?: string;
}

interface PolygonAddresses {
  p_checkpointManager?: string;
  p_sftHolderProxy?: string;
  p_childTunnel?: string;
  polygonRootTunnelProxy?: string;
}

interface IIndexable {
  [key: number]: ChainAddresses;
}

export type AssetStateresult = {
  status:
    | 'error'
    | 'loaded'
    | 'cards'
    | 'tokens'
    | 'cfolio_amount'
    | 'rewards'
    | 'balances'
    | 'allowance';
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

export enum SFTS {
  UNLOCKED,
  LOCKED,
  BRIDGE_PENDING,
  BRIDGE_READY,
}

export interface SFTCHILD {
  tokenId: ethers.BigNumber;
  levelId: number;
  cardId: number;
  status: SFTS;
  type: number;
  assets: number[];
}

export interface BoosterRewards {
  total: number;
  pending: number;
  apr: number;
  secsLeft?: number;
}

export interface SFT {
  tokenId: ethers.BigNumber;
  levelId: number;
  cardId: number;
  isBaseCard: boolean;
  isStockCard: boolean;
  isWallet: boolean;
  status: SFTS;
  rewardRate: number;
  rewardShare: number[];
  rewardEarned: number[];
  mintTimestamp: number;
  cfolioItems: SFTCHILD[];
  boosterRewards: BoosterRewards;
}

export const BIGNUMBER_MAX = ethers.BigNumber.from(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
);

export const STAKE_CURRENCIES = [
  [],
  ['WETH/WOWS', 'WMATIC/WOWS'],
  ['WETH/WOWS', 'WFTM/WOWS'],
];

export const STABLE_CURRENCIES = [
  [['DAI', 'USDC', 'USDT', 'am3Crv']],
  [['DAI', 'USDC', 'USDT', 'TUSD', 'yCrv']],
  [[]],
];

const SECONDS_PER_YEAR = 31536000;

export const REWARD_POOL_LP = 0;
export const REWARD_POOL_SC = 1;

interface REWARD_INFO_SLOT {
  total: ethers.BigNumber;
  rewardPerDuration: ethers.BigNumber;
  priceToken: number;
  apr: number;
}

const INITIAL_REWARD_SLOT: REWARD_INFO_SLOT = {
  total: ethers.BigNumber.from(0),
  rewardPerDuration: ethers.BigNumber.from(0),
  priceToken: 0,
  apr: 0,
};

interface REWARD_INFO {
  rewardDuration: number;
  priceWOWS: number;
  slotInfo: REWARD_INFO_SLOT[];
}

const INITIAL_REWARD: REWARD_INFO = {
  rewardDuration: 0,
  priceWOWS: 0,
  slotInfo: [],
};

export type ASSET_BALANCE = {
  [key: string]: {
    decimals: number;
    dust: ethers.BigNumber;
    value: number;
    address?: string;
    allowance: number;
    handlerAddress?: string;
    handlerSlotId?: number;
  };
};

type ASSETS = {
  balances: ASSET_BALANCE;
  userSFT: SFT[];
  cards: CARDS;
  cfolioItems: CFOLIO_ITEMS[];
  rewardInfo: REWARD_INFO[];
};

const readUint256 = (s: string, i: number) =>
  ethers.BigNumber.from('0x' + s.substr(i * 64 + 2, 64));

class AsyncLock {
  disable: () => void;
  promise: Promise<void>;
  constructor() {
    this.disable = () => {
      if (!this) alert('');
    };
    this.promise = Promise.resolve();
  }
  enable() {
    this.promise = new Promise((resolve) => (this.disable = resolve));
  }
}

class Store {
  web3Modal: Web3Modal;
  /* Provider */
  ethersProvider?: ethers.providers.JsonRpcProvider;
  eventProvider?: ethers.providers.BaseProvider;
  ethersSigner?: ethers.Signer;
  isWSEventProvider = false;

  /* Contracts */
  tokenContract?: ethers.Contract;
  cfihLpContract?: ethers.Contract;
  cfihScContract?: ethers.Contract;
  sftEvaluatorContract?: ethers.Contract;
  boosterContract?: ethers.Contract;

  sftHolderContractRO?: ethers.Contract;
  sftMintContractRO?: ethers.Contract;
  tradeFloorContractRO?: ethers.Contract;
  uniDaiWethPairContractRO?: ethers.Contract;

  cfolioFarmLpAddress = '';
  cfolioFarmScAddress = '';
  bridgeTargetAddress = '';
  curveDepositAddress = '';

  static nullAddress = '0x0000000000000000000000000000000000000000';
  static BASE_CARD_MAX = ethers.BigNumber.from('0xFFFFFFFFFFFFFFFF');
  static STOCK_CARD_MAX = ethers.BigNumber.from('0xFFFFFFFF');
  static DUST_6 = ethers.BigNumber.from(10);
  static DUST_18 = ethers.BigNumber.from(1000000000000);

  /* Misc */
  networkName = 'mainnet';
  accountId = 0;
  chainId = 0;
  address = '';
  tokenContractAddress = Store.nullAddress;
  lastAprTime = 0;
  eventsSuspended = false;
  lock = new AsyncLock();

  dispatchQueue: Payload[] = [];

  polygonBridge?: MessageProof;

  assets = {
    balances: {
      WOWS: {
        decimals: 18,
        dust: Store.DUST_18,
        value: 0,
        allowance: 0,
      },
      'WETH/WOWS': {
        decimals: 18,
        dust: Store.DUST_18,
        value: 0,
        allowance: 0,
      },
      'WMATIC/WOWS': {
        decimals: 18,
        dust: Store.DUST_18,
        value: 0,
        allowance: 0,
      },
      'WFTM/WOWS': {
        decimals: 18,
        dust: Store.DUST_18,
        value: 0,
        allowance: 0,
      },
      USDC: {
        decimals: 6,
        dust: Store.DUST_6,
        value: 0,
        allowance: 0,
      },
      USDT: {
        decimals: 6,
        dust: Store.DUST_6,
        value: 0,
        allowance: 0,
      },
      DAI: {
        decimals: 18,
        dust: Store.DUST_18,
        value: 0,
        allowance: 0,
      },
      TUSD: {
        decimals: 18,
        dust: Store.DUST_18,
        value: 0,
        allowance: 0,
      },
      yCrv: {
        decimals: 18,
        dust: Store.DUST_18,
        value: 0,
        allowance: 0,
      },
      am3Crv: {
        decimals: 18,
        dust: Store.DUST_18,
        value: 0,
        allowance: 0,
      },
    },
    userSFT: [],
    cards: { levelNames: [], cards: [], myPackLevelDescriptions: [] },
    cfolioItems: [],
    rewardInfo: Array.from({ length: 2 }, () => ({ ...INITIAL_REWARD })),
  } as ASSETS;

  constructor() {
    const providerOptions: IProviderOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID,
          rpc: { 137: 'https://polygon-rpc.com/' },
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
        case CFOLIO_ITEM_DEPOSIT:
          this._doCFolioItemDeposit(
            _payload.content as PayloadContentCFolioItem
          );
          break;
        case CFOLIO_ITEM_WITHDRAW:
          this._doCFolioItemWithdraw(
            _payload.content as PayloadContentCFolioItem
          );
          break;
        case CFOLIO_ITEM_UNLOCK_TRANSFER:
          this._doCFolioItemUnlockAndTransfer(
            _payload.content as PayloadContentCFolioItemLT
          );
          break;
        /** Staking */
        case REVOKE_APPROVAL:
          this._doRevokeApproval(_payload.content);
          break;
        /** SFT */
        case SFT_BUY:
          this._doSftBuy(_payload.content);
          break;
        case SFT_CLAIM:
          this._doSftClaim(_payload.content);
          break;
        case SFT_CLAIM_BOOSTER:
          this._doSftClaimBooster(_payload.content);
          break;
        case SFT_LOCK:
          this._doSftLock(_payload.content);
          break;
        case SFT_REWARD:
          this._getSftRewards(_payload.content);
          break;
        case SFT_PROOF:
          this._doSftMessageProof(_payload.content);
          break;
        case SFT_TRANSFER:
          this._doSftTransfer(_payload.content);
          break;
        case ASSETS_STATE:
          if (_payload.content.filter?.includes('cards'))
            this._getSftState(_payload.content);
          if (_payload.content.filter?.includes('tokens'))
            this._getUserSft(_payload.content).then(() =>
              this._getSftRewards(_payload.content)
            );
          if (_payload.content.filter?.includes('balances'))
            this._getAssetsBalances(_payload.content);
          if (_payload.content.filter?.includes('allowance'))
            this._getAssetsAllowances(_payload.content);
          break;
        case SFT_UNLOCK:
          this._doSftUnlock(_payload.content);
          break;
        case SFT_UPGRADE:
          this._doSftUpgrade(_payload.content);
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
      // Load CFolioItems
      import('locales/en_US/cFolioItems.json').then((content) => {
        this.assets.cfolioItems = content.default as CFOLIO_ITEMS[];
        emitter.emit(ASSETS_STATE, { status: 'loaded' } as AssetStateresult);
        dispatcher.dispatch({
          type: ASSETS_STATE,
          content: { filter: ['cards', 'tokens'] },
        } as Payload);
      });
    });
  }

  mount() {
    if (window.ethereum) {
      this.chainId = parseInt(window.ethereum.chainId);
      switch (this.chainId) {
        case 4:
          this.networkName = 'rinkeby';
          break;
        case 5:
          this.networkName = 'goerli';
          break;
        case 137:
          this.networkName = 'matic';
          break;
        case 80001:
          this.networkName = 'maticmum';
          break;
        default: {
          this.networkName = ' mainnet';
          this.chainId = 1;
        }
      }
      console.log(
        'Mount with chainId: ',
        this.chainId,
        ' and Network: ',
        this.networkName
      );
    }
    this.autoconnect();
  }

  unmount() {
    this.close();
  }

  getAssets = () => {
    return this.assets;
  };

  handleBridgeChange = () => {
    console.log('BrigeChange');
    dispatcher.dispatch({
      type: ASSETS_STATE,
      content: { filter: ['tokens'] },
    } as Payload);
  };

  /*********************** NETWORK ******************/

  getEndpoint(wss: boolean): string | undefined {
    const chainAddresses = this._getChainAddresses();
    return wss ? chainAddresses?.wssEndpoint : chainAddresses?.rpcEndpoint;
  }

  isSidechain(): boolean {
    return this.networkName.startsWith('matic');
  }

  getBridgeTarget(): { name: string; address: string } {
    return this.networkName.startsWith('matic')
      ? { name: 'ETHEREUM', address: this.bridgeTargetAddress }
      : { name: 'POLYGON', address: this.bridgeTargetAddress };
  }

  connect = async () => {
    try {
      if (this.ethersProvider) {
        await this.disconnect(false, false);
      }

      let ethersProvider: ethers.providers.JsonRpcProvider;
      const endpoint = this.getEndpoint(false);
      if (endpoint) {
        ethersProvider = new ethers.providers.JsonRpcProvider(endpoint);
      } else {
        const web3Provider = await this.web3Modal.connect();
        await this.subscribeProvider(web3Provider);

        ethersProvider = new ethers.providers.Web3Provider(web3Provider);
      }
      const accounts = await ethersProvider.listAccounts();
      this.address = ethers.utils.getAddress(accounts[this.accountId]);
      const network = await ethersProvider.getNetwork();
      this.chainId = network.chainId;
      this.networkName = network.name;
      await this._launchEventProvider();
      if (await this._setupContracts(ethersProvider)) this._emitNetworkChange();
      this.ethersProvider = ethersProvider;
      this.ethersSigner = ethersProvider.getSigner(this.accountId);

      // Enable MessageProof for bidging back from Polygon
      if (this.chainId === 1 || this.chainId === 5) {
        const chainAddresses = (this._getChainAddresses() ??
          {}) as PolygonAddresses;
        this.polygonBridge = new MessageProof(
          this.eventProvider ?? ethersProvider,
          this.chainId,
          chainAddresses.p_checkpointManager ?? '',
          this.address,
          chainAddresses.polygonRootTunnelProxy ?? '',
          chainAddresses.p_childTunnel ?? '',
          this.handleBridgeChange
        );
      }
    } catch (e) {
      console.log(e);
      await this.disconnect(true, true);
    }
  };

  autoconnect = async () => {
    const query = new URLSearchParams(window.location.search);
    const defaultChain = query.get('chainId');
    const defaultAccountId = query.get('accountId');

    if (defaultChain) this.chainId = parseInt(defaultChain);
    if (defaultAccountId) this.accountId = parseInt(defaultAccountId);

    if (this.web3Modal.cachedProvider) {
      await this.connect();
    } else await this._launchEventProvider();
  };

  subscribeProvider = async (provider: ethers.providers.Provider) => {
    if (!provider.on) {
      return;
    }

    provider.on('disconnect', () => {
      this.disconnect(false, true);
    });

    provider.on('accountsChanged', async (accounts: string[]) => {
      const account = ethers.utils.getAddress(accounts[0]);
      if (this.address !== '' && account !== this.address) {
        this.address = account;
        this._emitNetworkChange();
      }
    });

    provider.on('chainChanged', async (chainId: number) => {
      if (chainId !== this.chainId) {
        this.chainId = chainId;
        await this.connect();
      }
    });
  };

  disconnect = async (clearCache: boolean, fireEvent: boolean) => {
    if (this.ethersProvider) {
      localStorage.removeItem('walletconnect');
      this.ethersProvider.removeAllListeners();
      this.tokenContract = undefined;
      this.ethersProvider = undefined;
      this.cfihLpContract = undefined;
      this.cfihScContract = undefined;
      this.sftEvaluatorContract = undefined;
      this.boosterContract = undefined;
      this.ethersSigner = undefined;
      this.polygonBridge = undefined;

      this.address = '';
      if (clearCache) {
        this.web3Modal.clearCachedProvider();
        window.localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
      }
      if (fireEvent) {
        this._emitNetworkChange();
      }
    }
  };

  close = async () => {
    try {
      this.sftHolderContractRO?.removeAllListeners();
      this.sftHolderContractRO = undefined;
      this.sftMintContractRO = undefined;
      this.tradeFloorContractRO?.removeAllListeners();
      this.tradeFloorContractRO = undefined;
      this.uniDaiWethPairContractRO = undefined;
    } catch (e) {
      console.log(e);
    }
    console.log('Disconnect due to WS close');
    await this.disconnect(false, true);
    if (this.eventProvider) {
      try {
        this.eventProvider?.removeAllListeners();
      } catch (e) {
        console.log(e);
      }
      if (this.isWSEventProvider) {
        const wsEventProvider = this
          .eventProvider as ethers.providers.WebSocketProvider;
        wsEventProvider._websocket.onclose = null;
        wsEventProvider._websocket.onerror = null;
        await wsEventProvider.destroy();
      }
      this.eventProvider = undefined;
    }
  };

  isConnected = () => {
    return this.ethersProvider !== undefined;
  };

  isEventConnected = () => {
    return this.eventProvider !== undefined;
  };

  _addDQ = async (block: number, payload: Payload) => {
    if (this.eventsSuspended) {
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

  _resolveDQ = () => {
    if (this.eventsSuspended) {
      this.dispatchQueue.forEach((payload) => dispatcher.dispatch(payload));
      this.dispatchQueue = [];
      /*if (this.lastAprTime + 300000 < Date.now()) {
        this.lastAprTime = Date.now();
        this._updatePoolAPR();
      }*/
      this.eventsSuspended = false;
    }
  };

  _setupEvents(): boolean {
    this.eventProvider?.removeAllListeners();
    this.sftHolderContractRO?.removeAllListeners();
    this.tradeFloorContractRO?.removeAllListeners();

    const handleTransfer = (
      operator: string,
      from: string,
      to: string,
      cards: boolean
    ) => {
      const filter = [];
      if (cards && from === Store.nullAddress) filter.push('cards');
      if (
        ethers.utils.getAddress(operator) === this.address ||
        ethers.utils.getAddress(from) === this.address ||
        ethers.utils.getAddress(to) === this.address
      ) {
        filter.push('tokens');
      }
      if (filter.length > 0) {
        console.log('TransferEvent: ', filter);
        this._addDQ(0, { type: ASSETS_STATE, content: { filter } } as Payload);
      }
    };

    this.sftHolderContractRO?.on('SftTokenTransfer', (operator, from, to) =>
      handleTransfer(operator, from, to, true)
    );
    this.tradeFloorContractRO?.on('TransferSingle', (operator, from, to) =>
      handleTransfer(operator, from, to, false)
    );
    this.tradeFloorContractRO?.on('TransferBatch', (operator, from, to) =>
      handleTransfer(operator, from, to, false)
    );
    return true;
  }

  _emitNetworkChange() {
    // Request new SFT List
    if (this.address) {
      if (this.polygonBridge) this.polygonBridge.accountChanged(this.address);
      dispatcher.dispatch({
        type: ASSETS_STATE,
        content: { filter: ['tokens', 'balances', 'rewards'] },
      } as Payload);
    } else {
      for (const [, value] of Object.entries(this.assets.balances)) {
        value.value = 0;
      }
      this.assets.userSFT = [];
      emitter.emit(ASSETS_STATE, { status: 'tokens' } as AssetStateresult);
    }
    emitter.emit(CONNECTION_CHANGED, {
      type: 'prod',
      address: this.address,
      networkName: this.networkName,
    } as ConnectResult);
  }

  _launchEventProvider = async () => {
    await this.lock.promise;
    this.lock.enable();
    try {
      if (
        !this.eventProvider ||
        (await this.eventProvider?.getNetwork()).chainId !== this.chainId
      ) {
        let eventProvider:
          | ethers.providers.WebSocketProvider
          | ethers.providers.JsonRpcProvider;
        this.isWSEventProvider = true;
        const endpoint = this.getEndpoint(true);
        if (endpoint) {
          if (endpoint.startsWith('http')) {
            this.isWSEventProvider = false;
            eventProvider = new ethers.providers.JsonRpcProvider(endpoint);
          } else {
            eventProvider = new ethers.providers.WebSocketProvider(endpoint);
          }
        } else {
          eventProvider = ethers.providers.InfuraProvider.getWebSocketProvider(
            this.networkName,
            process.env.REACT_APP_INFURA_ID
          );
        }
        if (!this.chainId)
          this.chainId = (await eventProvider.getNetwork()).chainId;

        await this._setupEventContracts(eventProvider);
        if (this.isWSEventProvider) {
          const wsEventProvider =
            eventProvider as ethers.providers.WebSocketProvider;
          wsEventProvider._websocket.onclose = () => {
            this.close();
          };
          wsEventProvider._websocket.onerror = () => {
            this.close();
          };
        }

        this.eventProvider?.removeAllListeners();
        this.eventProvider = eventProvider;

        console.log('EventProvider launched on network: ', this.networkName);
        emitter.emit(CONNECTION_CHANGED, {
          type: 'event',
          address: '',
          networkName: this.networkName,
        } as ConnectResult);
        if (this.assets.cfolioItems.length > 0) {
          dispatcher.dispatch({
            type: ASSETS_STATE,
            content: { filter: ['cards'] },
          } as Payload);
        }
        this._setupEvents();
      }
    } catch (e) {
      console.log(e);
      if (this.eventProvider) {
        this.eventProvider = undefined;
      }
    }
    this.lock.disable();
  };

  switchChain = async (chain: string) => {
    if (window.ethereum) {
      let newChain = 0;
      if (chain === 'polygon') {
        newChain = this.chainId === 1 ? 137 : 80001;
      } else {
        newChain = this.chainId === 137 ? 1 : 5;
      }
      if (newChain) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + newChain.toString(16) }],
          });
        } catch (e) {
          if ((e.code === 4902 || e.code === -32603) && newChain === 137) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x89',
                    chainName: 'Matic(Polygon) Mainnet',
                    rpcUrls: ['https://polygon-rpc.com/'],
                    blockExplorerUrls: ['https://polygonscan.com'],
                    nativeCurrency: {
                      name: 'MATIC',
                      symbol: 'MATIC',
                      decimals: 18,
                    },
                  },
                ],
              });
            } catch (e) {
              console.log(e);
            }
          }
          console.log(e);
        }
      }
    }
  };

  getStakeCurrencies() {
    switch (this.chainId) {
      case 137:
      case 80001:
        return STAKE_CURRENCIES[1];
      case 250:
      case 4001:
        return STAKE_CURRENCIES[2];
      default:
        return STAKE_CURRENCIES[0];
    }
  }

  getStableCurrencies() {
    switch (this.chainId) {
      case 137:
        return STABLE_CURRENCIES[0];
      case 80001:
        return STABLE_CURRENCIES[1];
      default:
        return STABLE_CURRENCIES[2];
    }
  }
  /******************** Contracts *********************/

  _getChainAddresses(): ChainAddresses | undefined {
    return (addresses as IIndexable)[this.chainId];
  }

  async _setupEventContracts(
    provider: ethers.providers.BaseProvider
  ): Promise<void> {
    const chainAddresses = this._getChainAddresses();

    if (chainAddresses) {
      this.tokenContractAddress = chainAddresses.token;
      if (chainAddresses.sftHolderProxy) {
        this.sftHolderContractRO = new ethers.Contract(
          chainAddresses.sftHolderProxy,
          SFTHolderAbi,
          provider
        );
      }

      if (chainAddresses.sftMinterProxy) {
        this.sftMintContractRO = new ethers.Contract(
          chainAddresses.sftMinterProxy,
          SFTMinterAbi,
          provider
        );
      }
      if (chainAddresses.tradeFloorProxy) {
        this.tradeFloorContractRO = new ethers.Contract(
          chainAddresses.tradeFloorProxy,
          TradeFloorAbi,
          provider
        );
      }

      this.cfolioFarmLpAddress = chainAddresses.cfolioFarmLP || '';
      this.cfolioFarmScAddress = chainAddresses.cfolioFarmSC || '';

      if (chainAddresses.uniDaiWeth !== '') {
        this.uniDaiWethPairContractRO = new ethers.Contract(
          chainAddresses.uniDaiWeth,
          UniV2PairAbi,
          provider
        );
      } else this.uniDaiWethPairContractRO = undefined;

      // Setup our balances
      this.assets.balances['WOWS'].address = chainAddresses.token;
      this.assets.balances['WETH/WOWS'].address = chainAddresses.uniV2Pair;
      this.assets.balances['WMATIC/WOWS'].address =
        this.chainId === 137 || this.chainId === 80001
          ? chainAddresses.uniV2PairNative || undefined
          : undefined;
      this.assets.balances['WFTM/WOWS'].address =
        this.chainId === 250 || this.chainId === 4001
          ? chainAddresses.uniV2PairNative || undefined
          : undefined;

      this.assets.balances['USDC'].address = chainAddresses.usdcToken;
      this.assets.balances['USDT'].address = chainAddresses.usdtToken;
      this.assets.balances['DAI'].address = chainAddresses.daiToken;
      this.assets.balances['TUSD'].address = chainAddresses.tusdToken;
      this.assets.balances['yCrv'].address = chainAddresses.curveYToken;
      this.assets.balances['am3Crv'].address = chainAddresses.curveAToken;

      this.assets.balances['WOWS'].handlerAddress =
        chainAddresses.sftMinterProxy;
      this.assets.balances['WETH/WOWS'].handlerAddress =
        chainAddresses.cfolioItemHandlerLPProxy;
      this.assets.balances['WETH/WOWS'].handlerSlotId = 0;
      this.assets.balances['WMATIC/WOWS'].handlerAddress =
        chainAddresses.cfolioItemHandlerLPProxy;
      this.assets.balances['WMATIC/WOWS'].handlerSlotId = 1;
      this.assets.balances['WFTM/WOWS'].handlerAddress =
        chainAddresses.cfolioItemHandlerLPProxy;
      this.assets.balances['WFTM/WOWS'].handlerSlotId = 1;
      this.assets.balances['USDC'].handlerAddress =
        chainAddresses.cfolioItemHandlerSCProxy;
      this.assets.balances['USDT'].handlerAddress =
        chainAddresses.cfolioItemHandlerSCProxy;
      this.assets.balances['DAI'].handlerAddress =
        chainAddresses.cfolioItemHandlerSCProxy;
      this.assets.balances['TUSD'].handlerAddress =
        chainAddresses.cfolioItemHandlerSCProxy;
      this.assets.balances['yCrv'].handlerAddress =
        chainAddresses.cfolioItemHandlerSCProxy;

      this.assets.rewardInfo[0] = { ...INITIAL_REWARD };
      this.assets.rewardInfo[1] = { ...INITIAL_REWARD };

      if (chainAddresses.curveYDeposit)
        this.curveDepositAddress = chainAddresses.curveYDeposit;
      else if (chainAddresses.curveADeposit)
        this.curveDepositAddress = chainAddresses.curveADeposit;
      else this.curveDepositAddress = '';
    } else {
      this.tokenContractAddress = Store.nullAddress;
      for (const [, value] of Object.entries(this.assets.balances)) {
        value.address = undefined;
        value.value = 0;
      }
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
      if (chainAddresses.cfolioItemHandlerLPProxy) {
        this.cfihLpContract = new ethers.Contract(
          chainAddresses.cfolioItemHandlerLPProxy,
          CFolioItemHandlerAbi,
          signer
        );
      }
      if (chainAddresses.cfolioItemHandlerSCProxy) {
        this.cfihScContract = new ethers.Contract(
          chainAddresses.cfolioItemHandlerSCProxy,
          CFolioItemHandlerAbi,
          signer
        );
      }
      if (chainAddresses.sftEvaluatorProxy) {
        this.sftEvaluatorContract = new ethers.Contract(
          chainAddresses.sftEvaluatorProxy,
          SftEvaluatorAbi,
          signer
        );
      }
      if (chainAddresses.boosterProxy) {
        this.boosterContract = new ethers.Contract(
          chainAddresses.boosterProxy,
          BoosterAbi,
          signer
        );
      }
      this.bridgeTargetAddress = chainAddresses.bridgeTarget;

      return true;
    }
    return false;
  }

  _getSftState = async (payloadContent: PayloadContent | undefined) => {
    if (!this.sftMintContractRO) {
      return;
    }

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
      if (!this.isSidechain()) {
        const sftResult:
          | {
              prices: ethers.BigNumber[];
              numMinted: number[];
              maxMintable: number[];
            }
          | undefined = await this.sftMintContractRO?.getBaseSpec(
          levels,
          cardIds
        );

        if (sftResult !== undefined) {
          let index = 0;
          for (const level of this.assets.cards.cards) {
            level.price = this.fromWei(sftResult.prices[index]);
            level.quantity = sftResult.maxMintable[index];
            for (const card of level.cards) {
              card.minted = sftResult.numMinted[index];
              index++;
            }
            if (index >= sftResult.prices.length) break;
          }
        }
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

    try {
      const result: [ethers.BigNumber[], ethers.BigNumber[]] =
        await this.sftMintContractRO.getTokenIds(this.address);

      const bridgeToken = this.polygonBridge
        ? this.polygonBridge.getTokenIds(this.address)
        : [];

      const mergeList = result[0].map((t) => t);
      mergeList.push(...result[1]);
      mergeList.push(...bridgeToken.map((item) => item.tokenId));

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
          const bridgeItem = bridgeToken.find((item) => item.tokenId.eq(bn));
          return {
            tokenId: bn,
            levelId: levelIndex,
            cardId: cardIndex,
            isBaseCard: bn.mask(128).lte(Store.BASE_CARD_MAX),
            isStockCard: bn.mask(128).lte(Store.STOCK_CARD_MAX),
            isWallet: false,
            status: bridgeItem
              ? bridgeItem.available
                ? SFTS.BRIDGE_READY
                : SFTS.BRIDGE_PENDING
              : result[1].find((b) => b.eq(bn)) !== undefined
              ? SFTS.LOCKED
              : SFTS.UNLOCKED,
            rewardRate: 0,
            rewardShare: [],
            rewardEarned: [],
            mintTimestamp: 0,
            cfolioItems: [],
            boosterRewards: {
              total: 0,
              pending: 0,
              apr: 0,
            },
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
        status: SFTS.UNLOCKED,
        rewardRate: 0,
        rewardShare: [],
        rewardEarned: [],
        mintTimestamp: 0,
        cfolioItems: [],
        boosterRewards: {
          total: 0,
          pending: 0,
          apr: 0,
        },
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
              status:
                destinationId === 0 &&
                result[1].find((b) => b.eq(childId)) !== undefined
                  ? SFTS.LOCKED
                  : SFTS.UNLOCKED,
              type: readUint256(result2, readIndex++).toNumber(),
              assets: [],
            };
            child.levelId = this.assets.cfolioItems.findIndex(
              (l) =>
                (child.cardId = l.cards.findIndex(
                  (c) => c.chainRef === child.type
                )) >= 0
            );
            const numAssets = readUint256(result2, readIndex++).toNumber();
            const bidx =
              this.assets.cfolioItems[child.levelId].type === 'lpInvestment'
                ? this.getStakeCurrencies()
                : this.getStableCurrencies()[0];
            for (let index = 0; index < numAssets; ++index) {
              child.assets.push(
                this.fromWei(
                  readUint256(result2, readIndex++),
                  this.assets.balances[bidx[index]].decimals
                )
              );
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
      if (!this.sftMintContractRO) return;
      const filter = ['wolves', 'bois'];
      const contracts = [this.cfihLpContract, this.cfihScContract];

      for (let i = 0; i < 2; ++i) {
        if (!contracts[i]) {
          continue;
        }

        const sfts = this.assets.userSFT.filter(
          (sft) =>
            sft.isBaseCard &&
            this.assets.cards.cards[sft.levelId].type === filter[i]
        );

        if (sfts.length === 0) continue;

        // Returns:
        //  result: rewardDur, slotCount, [totalSupply, rewardPerDuration, [share, earned]
        //  boosterLocked
        //  boosterPending
        //  boosterApr
        //  boosterSecsLeft
        const result = await this.sftMintContractRO.getRewardInfo(
          contracts[i]?.address,
          sfts.map((sft) => sft.tokenId)
        );
        let readIndex = 0;
        const cfiResult = result.result;
        const ri = this.assets.rewardInfo[i];
        ri.rewardDuration = readUint256(cfiResult, readIndex++).toNumber();
        const numSlots = readUint256(cfiResult, readIndex++).toNumber();
        ri.slotInfo = Array.from({ length: numSlots }, () => ({
          ...INITIAL_REWARD_SLOT,
        }));
        for (let slotId = 0; slotId < numSlots; ++slotId) {
          const ris = ri.slotInfo[slotId];
          ris.total = readUint256(cfiResult, readIndex++);
          const total = this.fromWei(ris.total);
          ris.rewardPerDuration = readUint256(cfiResult, readIndex++);
          for (let index = 0; index < sfts.length; ++index) {
            const sft = sfts[index];
            if (slotId === 0) {
              sft.rewardShare = [];
              sft.rewardEarned = [];
            }
            sft.rewardShare.push(
              (this.fromWei(readUint256(cfiResult, readIndex++)) * 100) / total
            );
            sft.rewardEarned.push(
              this.fromWei(readUint256(cfiResult, readIndex++))
            );
            sft.boosterRewards.total = this.fromWei(
              result.boosterLocked[index]
            );
            sft.boosterRewards.pending = this.fromWei(
              result.boosterPending[index]
            );
            sft.boosterRewards.apr = this.fromWei(result.boosterApr[index]);
            sft.boosterRewards.secsLeft = result.boosterSecsLeft[index].eq(
              BIGNUMBER_MAX
            )
              ? undefined
              : result.boosterSecsLeft[index].toNumber();
          }
        }
      }
      await this._updatePoolAPR();
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
    const stableCurrencies = this.getStableCurrencies();
    receipt.logs.find((log) => {
      if (
        log.address === this.cfolioFarmLpAddress ||
        log.address === this.cfolioFarmScAddress
      ) {
        const parsed = iface.parseLog(log);
        if (['AssetAdded', 'AssetRemoved'].includes(parsed.name)) {
          this.assets.userSFT.find(
            (isft) =>
              isft.tokenId === sft &&
              isft.cfolioItems.find((item) => {
                if (item.tokenId === cfolio) {
                  if (log.address === this.cfolioFarmLpAddress) {
                    item.assets[0] = this.fromWei(parsed.args[2]);
                    emitter.emit(ASSETS_STATE, {
                      status: 'cfolio_amount',
                    } as AssetStateresult);
                  } else if (this.cfihScContract) {
                    this.cfihScContract
                      .getAmounts(parsed.args[0])
                      .then((amounts: ethers.BigNumber[]) => {
                        amounts.forEach(
                          (amount, index) =>
                            (item.assets[index] = this.fromWei(
                              amount,
                              this.assets.balances[stableCurrencies[0][index]]
                                .decimals
                            ))
                        );
                        emitter.emit(ASSETS_STATE, {
                          status: 'cfolio_amount',
                        } as AssetStateresult);
                      });
                  }
                  dispatcher.dispatch({
                    type: ASSETS_STATE,
                    content: { filter: ['tokens', 'balances'] },
                  } as Payload);
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

  _setRewardRate(receipt: ethers.providers.TransactionReceipt): void {
    const iface = new ethers.utils.Interface(SftEvaluatorAbi);
    receipt.logs.find((log) => {
      if (log.address === this.sftEvaluatorContract?.address) {
        const parsed = iface.parseLog(log);
        if (parsed.name === 'RewardRate') {
          const sft = this.assets.userSFT.find((sft) =>
            sft.tokenId.eq(parsed.args[0])
          );
          if (sft) {
            sft.rewardRate = parsed.args[1];
          }
          return true;
        }
      }
      return false;
    });
  }

  _getTokenContractAddress() {
    return this.tokenContractAddress;
  }

  _getAssetsBalances = async (payloadContent: PayloadContent) => {
    if (!this.sftMintContractRO || this.address === '') return;
    try {
      const input = Object.entries(this.assets.balances).map(
        ([_, value]) => value.address ?? Store.nullAddress
      );
      const balances = await this.sftMintContractRO.getErc20Balances(
        this.address,
        input
      );
      Object.entries(this.assets.balances).forEach(
        ([_, value], index) =>
          (value.value = this.fromWei(balances[index], value.decimals))
      );
      emitter.emit(ASSETS_STATE, { status: 'balances' } as AssetStateresult);
    } catch (e) {
      console.log(e);
    }
  };

  _getAssetsAllowances = async (payloadContent: PayloadContent) => {
    if (!this.sftMintContractRO || this.address === '') return;
    try {
      const input = Object.entries(this.assets.balances).map(
        ([_, value]) => value.address ?? Store.nullAddress
      );
      const spender = Object.entries(this.assets.balances).map(
        ([_, value]) => value.handlerAddress ?? Store.nullAddress
      );
      const balances = await this.sftMintContractRO.getErc20Allowances(
        this.address,
        spender,
        input
      );
      Object.entries(this.assets.balances).forEach(
        ([_, value], index) =>
          (value.allowance = balances[index].gt(
            ethers.BigNumber.from(0xffffffff).mul(
              ethers.BigNumber.from(10).pow(value.decimals)
            )
          )
            ? -1
            : this.fromWei(balances[index], value.decimals))
      );
      emitter.emit(ASSETS_STATE, { status: 'allowance' } as AssetStateresult);
    } catch (e) {
      console.log(e);
    }
  };

  async _updatePoolAPR() {
    let nativeWowsPrice = ethers.BigNumber.from(0);
    let stakePrice = ethers.BigNumber.from(0);
    const e18 = ethers.BigNumber.from('10').pow(18);

    // Step 1 get WOWS/WETH ETH
    if (this.isSidechain()) {
      const results = await (
        await fetch(
          'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
          {
            method: 'POST', // or 'PUT'
            headers: {
              'Content-Type': 'application/json',
            },
            body: `{"query":"{pair(id:\\"0xdf21bb85a5bfb606bfca4562aa8cea2017622415\\") { reserve0 reserveUSD totalSupply}}","variables":null}`,
          }
        )
      ).json();
      const reserve0 = this.toWei(results.data.pair.reserve0.slice(0, 19));
      const reserveUSD = this.toWei(results.data.pair.reserveUSD.slice(0, 19));
      const totalSupply = this.toWei(
        results.data.pair.totalSupply.slice(0, 19)
      );
      nativeWowsPrice = reserveUSD.mul(e18).div(reserve0.mul(2));
      stakePrice = reserveUSD.mul(e18).div(totalSupply);
    } else if (
      this.assets.balances['WETH/WOWS'].address &&
      this.uniDaiWethPairContractRO
    ) {
      const lpContract = new ethers.Contract(
        this.assets.balances['WETH/WOWS'].address,
        UniV2PairAbi,
        this.eventProvider
      );
      const daiWethReserves = await this.uniDaiWethPairContractRO.getReserves();
      // Price of 1 WETH in DAI
      const wethPrice = daiWethReserves.reserve0.gt(daiWethReserves.reserve1)
        ? daiWethReserves.reserve0.mul(e18).div(daiWethReserves.reserve1)
        : daiWethReserves.reserve1.mul(e18).div(daiWethReserves.reserve0);

      const wowsWethReserves = await lpContract.getReserves();
      // Price of 1 WOWS
      nativeWowsPrice = wowsWethReserves.reserve1
        .mul(wethPrice)
        .div(wowsWethReserves.reserve0);
      stakePrice = nativeWowsPrice
        .mul(2)
        .mul(wowsWethReserves.reserve0)
        .div(await lpContract.totalSupply());
    }
    for (let i = 0; i < 2; ++i) {
      const ri = this.assets.rewardInfo[i];
      ri.priceWOWS = this.fromWei(nativeWowsPrice);
      for (let slotId = 0; slotId < ri.slotInfo.length; ++slotId) {
        const ris = ri.slotInfo[slotId];
        if (i === 0 && slotId === 0) {
          //lead pool
          ris.priceToken = this.fromWei(stakePrice);
        } else if (i === 0) {
          // native pool, todo
          stakePrice = ethers.BigNumber.from(0);
        } else if (this.curveDepositAddress) {
          const curveContract = new ethers.Contract(
            this.curveDepositAddress,
            CurveDepositAbi,
            this.eventProvider
          );
          // Get the DAI price of one yCrv token
          stakePrice = await curveContract.calc_withdraw_one_coin(
            this.toWei(1),
            0
          );
          ris.priceToken = this.fromWei(stakePrice);
        } else stakePrice = ethers.BigNumber.from(0);

        if (ri.rewardDuration) {
          // yearly emission
          const emmission = nativeWowsPrice.mul(
            ris.rewardPerDuration
              .mul(ethers.BigNumber.from(SECONDS_PER_YEAR))
              .div(ethers.BigNumber.from(ri.rewardDuration))
          );
          const apr = stakePrice.gt(0)
            ? emmission.mul(100).div(stakePrice.mul(ris.total)).toNumber()
            : 0;
          ris.apr = apr;
        }
      }
    }
  }

  aprToApy(apr: number): string {
    const apy = (Math.pow(1.0 + apr / 100 / 52, 52) - 1.0) * 100;
    return apy > 1e4 ? 'INF' : apy.toFixed(2);
  }

  /************** TX ****************/

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

      const cardData = await this.sftMintContractRO?.getBaseSpec(
        [id.toNumber() >> 8],
        [id.toNumber() & 0xff]
      );
      if (cardData.maxMintable[0] <= cardData.numMinted[0]) {
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
          this._checkUnlimited('WOWS', sftAmount)
        );
        emitter.emit(SFT_BUY, {
          status: 'approve',
          tx: tx?.hash,
        } as StatusResult);

        await tx.wait();
      }

      this.eventsSuspended = true;
      const tx: ethers.ContractTransaction | undefined =
        await sftMintContract?.mintWowsSFT(
          this.address,
          id.toNumber() >> 8,
          id.toNumber() & 0xff
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
    this._resolveDQ();
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
      this.eventsSuspended = true;
      const tx: ethers.ContractTransaction =
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

      await tx.wait();
      emitter.emit(SFT_LOCK, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      emitter.emit(SFT_LOCK, {
        status: 'error',
        type: SFT_LOCK,
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
    this._resolveDQ();
  };

  _doSftTransfer = async (payloadContent: PayloadContent) => {
    const { id, status, address } = payloadContent;
    if (id === undefined || !address) {
      emitter.emit(SFT_TRANSFER, {
        status: 'error',
        errorMessage: 'Invalid input',
      } as StatusResult);
      return;
    }

    const contract =
      status === 'locked'
        ? this.tradeFloorContractRO
        : this.sftHolderContractRO;

    if (!contract || !this.ethersProvider) {
      emitter.emit(SFT_TRANSFER, {
        status: 'error',
        errorMessage: 'Invalid contract state',
      } as StatusResult);
      return;
    }

    try {
      const signedContract = contract.connect(
        this.ethersProvider.getSigner(this.accountId)
      );
      this.eventsSuspended = true;
      const tx: ethers.ContractTransaction =
        await signedContract.safeTransferFrom(this.address, address, id, 1, []);
      emitter.emit(SFT_TRANSFER, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      await tx.wait();

      emitter.emit(SFT_TRANSFER, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      emitter.emit(SFT_TRANSFER, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
    this._resolveDQ();
  };

  _doSftMessageProof = async (payloadContent: PayloadContent) => {
    const { id } = payloadContent;
    if (id === undefined) {
      emitter.emit(SFT_PROOF, {
        status: 'error',
        errorMessage: 'Invalid input',
      } as StatusResult);
      return;
    }

    if (!this.ethersSigner || !this.polygonBridge) {
      emitter.emit(SFT_PROOF, {
        status: 'error',
        errorMessage: 'Invalid contract state',
      } as StatusResult);
      return;
    }
    try {
      const proof = await this.polygonBridge.processPending(id);
      const contract = new ethers.Contract(
        this.bridgeTargetAddress,
        RootTunnelAbi,
        this.ethersSigner
      );

      this.eventsSuspended = true;
      const tx = await contract.receiveMessage(proof);

      emitter.emit(SFT_PROOF, {
        status: 'tx',
        tx: tx.hash,
      } as StatusResult);

      await tx.wait();

      emitter.emit(SFT_PROOF, {
        status: 'success',
        tx: tx.hash,
      } as StatusResult);

      this.polygonBridge?.removeItem(id);
    } catch (e) {
      this.polygonBridge?.resetPending(id);
      emitter.emit(SFT_PROOF, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
    this._resolveDQ();
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

      this.eventsSuspended = true;
      const tx: ethers.ContractTransaction = await tradeFloorContract.burn(
        this.address,
        id,
        1
      );
      emitter.emit(SFT_UNLOCK, {
        status: 'tx',
        tx: tx.hash,
      } as StatusResult);

      await tx.wait();
      emitter.emit(SFT_UNLOCK, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      emitter.emit(SFT_UNLOCK, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
    this._resolveDQ();
  };

  _doCFolioItemBuy = async (payloadContent: PayloadContentCFolioItem) => {
    const { wowsAmount, investAmount, sftTokenId, cfolioType } = payloadContent;

    try {
      if (
        !this.sftMintContractRO ||
        !this.tokenContract ||
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

      const investWeiAmounts: ethers.BigNumber[] = [];
      const { additionalGas } = await this._investmentApproval(
        CFOLIO_ITEM_BUY,
        cfolioType,
        false,
        investAmount,
        investWeiAmounts
      );

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
            this._checkUnlimited('WOWS', weiAmount)
          );
          emitter.emit(CFOLIO_ITEM_BUY, {
            status: 'approve',
            tx: tx?.hash,
          } as StatusResult);
          await tx.wait();
        }
      }

      let options = {};
      if (additionalGas) {
        const gasEstimation: ethers.BigNumber =
          await sftMintContract.estimateGas.mintCFolioItemSFT(
            this.address,
            cfolioType,
            sftTokenId,
            0,
            investWeiAmounts
          );
        options = { gasLimit: gasEstimation.toNumber() + additionalGas };
      }

      this.eventsSuspended = true;
      const tx: ethers.ContractTransaction =
        await sftMintContract.mintCFolioItemSFT(
          this.address,
          cfolioType,
          sftTokenId,
          investWeiAmounts,
          options
        );
      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'tx',
        tx: tx.hash,
      } as StatusResult);

      await tx.wait();

      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);

      // There is no transfer with our address emitted,
      // in case of valid SFT: Request an tokenId update
      if (!sftTokenId.eq(BIGNUMBER_MAX)) {
        this._addDQ(tx?.blockNumber ?? 0, {
          type: ASSETS_STATE,
          content: { filter: ['tokens', 'balances'] },
        } as Payload);
      }
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
    this._resolveDQ();
  };

  _doCFolioItemDeposit = async (payloadContent: PayloadContentCFolioItem) => {
    const { investAmount, sftTokenId, cfolioTokenId, cfolioType } =
      payloadContent;

    try {
      if (!cfolioTokenId) {
        throw new Error('Invalid input');
      }

      const investWeiAmounts: ethers.BigNumber[] = [];
      const { additionalGas, cfihContract } = await this._investmentApproval(
        CFOLIO_ITEM_DEPOSIT,
        cfolioType,
        true,
        investAmount,
        investWeiAmounts
      );

      let options = {};
      if (additionalGas) {
        const gasEstimation: ethers.BigNumber =
          await cfihContract.estimateGas.deposit(
            this.address,
            sftTokenId,
            cfolioTokenId,
            0,
            investWeiAmounts
          );
        options = { gasLimit: gasEstimation.toNumber() + additionalGas };
      }

      const tx = await cfihContract.deposit(
        this.address,
        sftTokenId,
        cfolioTokenId,
        0,
        investWeiAmounts,
        options
      );
      emitter.emit(CFOLIO_ITEM_DEPOSIT, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      const receipt = await tx.wait();
      emitter.emit(CFOLIO_ITEM_DEPOSIT, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);

      this._setCFolioAmount(receipt, sftTokenId, cfolioTokenId);
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_DEPOSIT, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _investmentApproval = async (
    msgType: string,
    cfiType: number,
    requireOneSet: boolean,
    investAmount: number[],
    investWeiAmounts: ethers.BigNumber[]
  ) => {
    const cfiLevel = this.assets.cfolioItems.find((cf) =>
      cf.cards.find((cfc) => cfc.chainRef === cfiType)
    );
    if (!cfiLevel) {
      throw new Error('Unsupported cfolioType');
    }

    let cfihContract, balances;
    if (cfiLevel.type === 'lpInvestment') {
      cfihContract = this.cfihLpContract;
      balances = this.getStakeCurrencies();
    } else {
      cfihContract = this.cfihScContract;
      balances = this.getStableCurrencies()[0];
    }

    if (!cfihContract || !this.ethersSigner) {
      throw new Error('Contract not initialized');
    }

    const approvalContracts: (ethers.Contract | undefined)[] = [];
    let oneSet = false;
    let oneStableSet = false;

    for (const index in investAmount) {
      if (investAmount[index] > 0) {
        const balance = this.assets.balances[balances[index]];
        if (!balance.address) throw new Error('ERC20 address missing');
        const approvalContract = new ethers.Contract(
          balance.address,
          ERC20Abi,
          this.ethersSigner
        );
        let investWeiAmount = this.toWei(investAmount[index], balance.decimals);

        const walletAmount = await approvalContract.balanceOf(this.address);
        if (investWeiAmount.gt(walletAmount)) {
          if (investWeiAmount.sub(walletAmount).lt(balance.dust)) {
            investWeiAmount = walletAmount;
          } else {
            throw new Error('Insufficient balances');
          }
        } else if (walletAmount.sub(investWeiAmount).lt(balance.dust)) {
          // Try to invest dust, too
          investWeiAmount = walletAmount;
        }
        investWeiAmounts.push(investWeiAmount);
        approvalContracts.push(approvalContract);

        if (
          cfihContract === this.cfihScContract &&
          index !== (balances.length - 1).toString()
        )
          oneStableSet = true;
        oneSet = true;
      } else {
        investWeiAmounts.push(ethers.BigNumber.from(0));
        approvalContracts.push(undefined);
      }
    }

    if (requireOneSet && !oneSet) throw new Error('ERC20 address missing');
    if (!oneSet) investWeiAmounts.length = 0;

    for (const index in investWeiAmounts) {
      if (approvalContracts[index] !== undefined) {
        const allowance = await approvalContracts[index]?.allowance(
          this.address,
          cfihContract?.address
        );
        if (allowance.lt(investWeiAmounts[index])) {
          // USDT doesn't allow increase of existing allowance
          if (balances[index] === 'USDT' && !allowance.eq(0)) {
            throw new Error(
              "Revoke USDT allowance in 'Manage Approval' required!"
            );
          }
          const tx = await approvalContracts[index]?.approve(
            cfihContract?.address,
            this._checkUnlimited(
              balances[parseInt(index)],
              investWeiAmounts[index]
            )
          );
          emitter.emit(msgType, {
            status: 'approve',
            tx: tx?.hash,
          } as StatusResult);
          await tx.wait();
        }
      }
    }
    return { additionalGas: oneStableSet ? 400000 : 0, cfihContract };
  };

  _doCFolioItemWithdraw = async (payloadContent: PayloadContentCFolioItem) => {
    const { investAmount, sftTokenId, cfolioTokenId, cfolioType } =
      payloadContent;

    try {
      if (!cfolioTokenId) {
        throw new Error('Invalid input');
      }

      if (!this.sftHolderContractRO) {
        throw new Error('Contract not initialized');
      }

      // get cFolioAddress from cFolioTokenId
      const cfa = await this.sftHolderContractRO.tokenIdToAddress(
        cfolioTokenId.mask(128)
      );
      if (cfa === Store.nullAddress) {
        throw new Error('Cannot get cfolio address');
      }

      const cfiLevel = this.assets.cfolioItems.find((cf) =>
        cf.cards.find((cfc) => cfc.chainRef === cfolioType)
      );
      if (!cfiLevel) {
        throw new Error('Unsupported cfolioType');
      }

      let cfihContract, balances;
      if (cfiLevel.type === 'lpInvestment') {
        cfihContract = this.cfihLpContract;
        balances = this.getStakeCurrencies();
      } else {
        cfihContract = this.cfihScContract;
        balances = this.getStableCurrencies()[0];
      }

      if (!cfihContract || !this.ethersSigner) {
        throw new Error('Contract not initialized');
      }

      if (investAmount.length !== balances.length) {
        throw new Error('Amount lengths do not match');
      }

      const cfolioAmounts: ethers.BigNumber[] = await cfihContract.getAmounts(
        cfa
      );

      if (cfolioAmounts.length !== balances.length) {
        throw new Error('Amount lengths do not match');
      }

      const withdrawWeiAmounts: ethers.BigNumber[] = [];
      let oneStableSet = false;
      for (const index in investAmount) {
        const balance = this.assets.balances[balances[index]];
        let withdrawWeiAmount = this.toWei(
          investAmount[index],
          balance.decimals
        );
        if (withdrawWeiAmount.gt(cfolioAmounts[index])) {
          if (withdrawWeiAmount.sub(cfolioAmounts[index]).lt(balance.dust)) {
            withdrawWeiAmount = cfolioAmounts[index];
          } else {
            throw new Error('Insufficient balances');
          }
        } else if (
          cfolioAmounts[index].sub(withdrawWeiAmount).lt(balance.dust)
        ) {
          // Try to invest dust, too
          withdrawWeiAmount = cfolioAmounts[index];
        }
        if (
          cfihContract === this.cfihScContract &&
          withdrawWeiAmount.gt(0) &&
          index !== (balances.length - 1).toString()
        )
          oneStableSet = true;

        withdrawWeiAmounts.push(withdrawWeiAmount);
      }

      let options = {};
      if (oneStableSet) {
        const gasEstimation: ethers.BigNumber =
          await cfihContract.estimateGas.withdraw(
            sftTokenId,
            cfolioTokenId,
            0,
            withdrawWeiAmounts
          );
        options = { gasLimit: gasEstimation.toNumber() + 400000 };
      }

      const tx = await cfihContract.withdraw(
        sftTokenId,
        cfolioTokenId,
        0,
        withdrawWeiAmounts,
        options
      );
      emitter.emit(CFOLIO_ITEM_WITHDRAW, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      const receipt = await tx?.wait();

      emitter.emit(CFOLIO_ITEM_WITHDRAW, {
        status: 'success',
        tx: receipt.transactionHash,
      } as StatusResult);

      this._setCFolioAmount(receipt, sftTokenId, cfolioTokenId);
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_WITHDRAW, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doCFolioItemUnlockAndTransfer = async (
    payloadContent: PayloadContentCFolioItemLT
  ) => {
    const { src, dst, lockedCFIs, transferCFIs } = payloadContent;

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

      this.eventsSuspended = true;

      if (lockedCFIs.length > 0) {
        if (src !== BIGNUMBER_MAX) {
          throw new Error('Unlock only from Wallet');
        }
        const tradeFloorContract = this.tradeFloorContractRO.connect(
          this.ethersSigner
        );
        const tx = await tradeFloorContract.burnBatch(
          this.address,
          lockedCFIs,
          new Array(lockedCFIs.length).fill(1)
        );
        emitter.emit(CFOLIO_ITEM_UNLOCK_TRANSFER, {
          status: 'tx',
          tx: tx?.hash,
        } as StatusResult);

        await tx?.wait();

        // CFIs are now in users wallet -> push them to cfiBridge
        transferCFIs.push(...lockedCFIs.map((id) => id.mask(128)));
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
        const sftHolderContract = this.sftHolderContractRO.connect(
          this.ethersSigner
        );
        const tx = await sftHolderContract.safeBatchTransferFrom(
          srcAddress,
          dstAddress,
          transferCFIs,
          new Array(transferCFIs.length).fill(1),
          []
        );
        emitter.emit(CFOLIO_ITEM_UNLOCK_TRANSFER, {
          status: 'tx',
          tx: tx.hash,
        } as StatusResult);

        await tx.wait();
        emitter.emit(CFOLIO_ITEM_UNLOCK_TRANSFER, {
          status: 'success',
          tx: tx.hash,
        } as StatusResult);
      }
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_UNLOCK_TRANSFER, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
    this._resolveDQ();
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
        payloadContent.id,
        payloadContent.time ?? 0
      );
      emitter.emit(SFT_CLAIM, {
        status: 'tx',
        type: SFT_CLAIM,
        tx: tx.hash,
      } as StatusResult);

      await tx.wait();
      emitter.emit(SFT_CLAIM, {
        status: 'success',
        type: SFT_CLAIM,
        tx: tx.hash,
      } as StatusResult);
      this._addDQ(tx.blockNumber ?? 0, {
        type: SFT_REWARD,
        content: {},
      } as Payload);
    } catch (e) {
      emitter.emit(SFT_CLAIM, {
        status: 'error',
        type: SFT_CLAIM,
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doSftClaimBooster = async (payloadContent: PayloadContent) => {
    try {
      if (!payloadContent.id) {
        throw new Error('Invalid id');
      }
      if (!this.boosterContract) {
        throw new Error('Invalid contract state');
      }
      const tx: ethers.ContractTransaction =
        await this.boosterContract.claimRewards(
          payloadContent.id,
          payloadContent.time
        );
      emitter.emit(SFT_CLAIM_BOOSTER, {
        status: 'tx',
        tx: tx.hash,
      } as StatusResult);

      await tx.wait();

      emitter.emit(SFT_CLAIM_BOOSTER, {
        status: 'success',
        tx: tx.hash,
      } as StatusResult);

      this._addDQ(tx.blockNumber ?? 0, {
        type: SFT_REWARD,
        content: {},
      } as Payload);
    } catch (e) {
      emitter.emit(SFT_CLAIM_BOOSTER, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doSftUpgrade = async (payloadContent: PayloadContent) => {
    try {
      if (!payloadContent.id) {
        throw new Error('Invalid id');
      }
      if (!this.sftEvaluatorContract) {
        throw new Error('Invalid contract state');
      }
      const tx: ethers.ContractTransaction =
        await this.sftEvaluatorContract.setRewardRate(payloadContent.id, true);
      emitter.emit(SFT_UPGRADE, {
        status: 'tx',
        tx: tx.hash,
      } as StatusResult);

      const receipt = await tx.wait();

      this._setRewardRate(receipt);

      emitter.emit(SFT_UPGRADE, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);
    } catch (e) {
      emitter.emit(SFT_UPGRADE, {
        status: 'error',
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  _doRevokeApproval = async (payloadContent: PayloadContent) => {
    const currency = payloadContent.filter ? payloadContent.filter[0] : '';
    const balance = this.assets.balances[currency];
    try {
      if (!this.ethersSigner) {
        throw new Error('Contract not initialized');
      }

      if (!balance) {
        throw new Error('Invalid input currency');
      }

      const approvalContract = new ethers.Contract(
        balance.address ?? '',
        ERC20Abi,
        this.ethersSigner
      );

      const tx = await approvalContract.approve(balance.handlerAddress, 0);

      emitter.emit(REVOKE_APPROVAL, {
        status: 'tx',
        type: currency,
        tx: tx.hash,
      } as StatusResult);

      await tx.wait();

      emitter.emit(REVOKE_APPROVAL, {
        status: 'success',
        type: currency,
        tx: tx.hash,
      } as StatusResult);

      dispatcher.dispatch({
        type: ASSETS_STATE,
        content: { filter: ['allowance'] },
      } as Payload);
    } catch (e) {
      emitter.emit(REVOKE_APPROVAL, {
        status: 'error',
        type: currency,
        errorMessage: e.error ? e.error.message : e.message,
      } as StatusResult);
    }
  };

  /******************** Misc *********************/

  fromWei(n: ethers.BigNumber, decimals = 18) {
    return parseFloat(ethers.utils.formatUnits(n, decimals));
  }

  toWei(n: number | string, decimals = 18) {
    const parsed = typeof n === 'number' ? n.toFixed(decimals) : n;
    return ethers.utils.parseUnits(parsed, decimals);
  }

  _checkUnlimited(currency: string, defaultReturn: ethers.BigNumber) {
    const index = Object.keys(this.assets.balances).findIndex(
      (b) => b === currency
    );
    if (index >= 0) {
      const mask = parseInt(localStorage.getItem('APPROVAL') ?? '0');
      if (mask & (1 << index)) return BIGNUMBER_MAX;
    }
    return defaultReturn;
  }
}

const StoreClasses = {
  store: new Store(),
  emitter: emitter,
  dispatcher: dispatcher,
};

export class StoreContainer extends React.Component<unknown> {
  componentDidMount(): void {
    window.addEventListener('load', async () => {
      StoreClasses.store.mount();
    });
  }

  componentWillUnmount(): void {
    StoreClasses.store.unmount();
  }

  render(): React.ReactNode {
    return <>{this.props.children}</>;
  }
}

export { StoreClasses };
