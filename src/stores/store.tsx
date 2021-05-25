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
import SFTMinterAbi from 'abi/contracts/src/crowdsale/WOWSSftMinter.sol/WOWSSftMinter.json';
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
  ASSETS_LOADED,
  CFOLIO_ITEM_BUY,
  CONNECTION_CHANGED,
  ERC20_TOKEN_CONTRACT,
  NEW_BLOCK,
  SFT_BUY,
  SFT_LOCK,
  SFT_STATE,
  SFT_UNLOCK,
  SFT_USER,
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
  cfolioType: number;
};

type Payload = {
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
};
interface IIndexable {
  [key: number]: ChainAddresses;
}

export type SFTStateresult = {
  status: 'error' | 'caps' | 'user';
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
  id: ethers.BigNumber;
  locked: boolean;
  type: number;
  assets: number[];
};

export type SFT = {
  id: ethers.BigNumber;
  isBaseCard: boolean;
  isStockCard: boolean;
  isWallet: boolean;
  locked: boolean;
  rewardRate: number;
  mintTimestamp: number;
  cfolioItems: SFTCHILD[];
};

export const BIGNUMBER_MAX = ethers.BigNumber.from(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
);

type cbf = async.AsyncResultCallback<unknown, Error>;

type ASSETS = {
  userSFT: SFT[];
  cards: CARDS;
  cfolioItems: CFOLIO_ITEMS[];
};

class Store {
  web3Modal: Web3Modal;
  /* Provider */
  ethersProvider: ethers.providers.JsonRpcProvider | null = null;
  eventProvider: ethers.providers.WebSocketProvider | null = null;
  /* Contracts */
  tokenContract: ethers.Contract | null = null;
  stakeContract: ethers.Contract | null = null;
  lPContract: ethers.Contract | null = null;

  sftHolderContractRO: ethers.Contract | null = null;
  sftMintContractRO: ethers.Contract | null = null;
  stakeContractRO: ethers.Contract | null = null;
  tradeFloorContractRO: ethers.Contract | null = null;
  uniDaiWethPairContractRO: ethers.Contract | null = null;

  cFolioItemHandlerLpAddress = '';

  static nullAddress = '0x0000000000000000000000000000000000000000';
  static BASE_CARD_MAX = ethers.BigNumber.from('0xFFFFFFFFFFFFFFFF');
  static STOCK_CARD_MAX = ethers.BigNumber.from('0xFFFFFFFF');

  /* Misc */
  networkName = 'mainnet';
  accountId = 0;
  chainId = 0;
  address = '';
  tokenContractAddress = Store.nullAddress;
  pauseSFTUser = false;

  dispatchQueue: Payload[] = [];

  assets = {
    userSFT: [],
    cards: { levelNames: [], cards: [], myPackLevelDescriptions: [] },
    cfolioItems: [],
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
        case SFT_LOCK:
          this._doSftLock(_payload.content);
          break;
        case SFT_STATE:
          this._getSftState(_payload.content);
          break;
        case SFT_UNLOCK:
          this._doSftUnlock(_payload.content);
          break;
        case SFT_USER:
          this._getUserSft(_payload.content);
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
        emitter.emit(ASSETS_LOADED);
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
      this.lPContract = null;
      this.tokenContract = null;
      this.stakeContract = null;
      this.ethersProvider = null;
      this.cFolioItemHandlerLpAddress = '';
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

  _addDQ = (payload: Payload) => {
    if (!this.dispatchQueue.find((elem) => elem === payload))
      this.dispatchQueue.push(payload);
  };

  _setupEvents(): boolean {
    this.eventProvider?.removeAllListeners();
    this.sftHolderContractRO?.removeAllListeners();
    this.tradeFloorContractRO?.removeAllListeners();

    const handleTransfer = (from: string, to: string) => {
      this._addDQ({ type: SFT_STATE } as Payload);
      if (!this.pauseSFTUser && (from === this.address || to === this.address))
        this._addDQ({ type: SFT_USER } as Payload);
    };

    // Our Block ticker
    this.eventProvider?.on('block', (blockNumber) => {
      emitter.emit(NEW_BLOCK, { blockNumber: blockNumber });
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
    return true;
  }

  _emitNetworkChange() {
    emitter.emit(CONNECTION_CHANGED, {
      type: 'prod',
      address: this.address,
      networkName: this.networkName,
    } as ConnectResult);
    // Request new SFT List
    if (this.address !== '') dispatcher.dispatch({ type: SFT_USER } as Payload);
    else {
      this.assets.userSFT = [];
      emitter.emit(SFT_STATE, { status: 'user' } as SFTStateresult);
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
      dispatcher.dispatch({ type: SFT_STATE } as Payload);
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
      this.sftHolderContractRO = new ethers.Contract(
        chainAddresses.sftHolder,
        SFTHolderAbi,
        provider
      );
      if (chainAddresses.tradeFloorProxy !== '')
        this.tradeFloorContractRO = new ethers.Contract(
          chainAddresses.tradeFloorProxy,
          TradeFloorAbi,
          provider
        );
      this.sftMintContractRO = new ethers.Contract(
        chainAddresses.sftMinter,
        SFTMinterAbi,
        provider
      );
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
      const signer = provider?.getSigner(this.accountId);
      this.tokenContract = new ethers.Contract(
        chainAddresses.token,
        TokenAbi,
        signer
      );
      this.stakeContract = new ethers.Contract(
        chainAddresses.stakeFarm,
        StakeAbi,
        signer
      );
      this.lPContract = new ethers.Contract(
        await this.stakeContract.stakingToken(),
        IERC20Abi,
        signer
      );
      this.cFolioItemHandlerLpAddress = chainAddresses.cfolioItemHandlerLPProxy;
      return true;
    }
    return false;
  }

  // Should be from getStakeState() in a next iteration
  _getPoolTokenAmount = async (payloadContent: PayloadContent | undefined) => {
    try {
      const result = !this.lPContract
        ? 0
        : await this.lPContract?.balanceOf(this.address);
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
      emitter.emit(SFT_STATE, { status: 'caps' } as SFTStateresult);
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

    const readUint256 = (s: string, i: number) =>
      ethers.BigNumber.from('0x' + s.substr(i * 64 + 2, 64));

    try {
      const result: [ethers.BigNumber[], ethers.BigNumber[]] =
        await this.sftMintContractRO.getTokenIds(this.address);

      const mergeList = filterSpecialCards(result[0]);
      const numUnlocked = mergeList.length;
      mergeList.push(...filterSpecialCards(result[1]));

      const newUserSFT: SFT[] = mergeList
        .filter((n) => n.mask(128).lte(Store.BASE_CARD_MAX))
        .map((bn, index) => {
          return {
            id: bn,
            isBaseCard: bn.lte(Store.BASE_CARD_MAX),
            isStockCard: bn.lte(Store.STOCK_CARD_MAX),
            isWallet: false,
            locked: index >= numUnlocked,
            rewardRate: 0,
            mintTimestamp: 0,
            cfolioItems: [],
          };
        })
        .sort((a, b) =>
          a.id.mask(128).gt(b.id.mask(128))
            ? 1
            : a.id.mask(128).lt(b.id.mask(128))
            ? -1
            : 0
        );
      // Create a dummy UserTokenId UINT256Max for the users wallet
      newUserSFT.unshift({
        id: BIGNUMBER_MAX,
        isBaseCard: false,
        isStockCard: false,
        isWallet: true,
        locked: false,
        rewardRate: 0,
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
        else destinationId = newUserSFT.findIndex((sft) => sft.id.eq(tokenId));
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
            const child: SFTCHILD = {
              id: readUint256(result2, readIndex++),
              locked: destinationId !== 0,
              type: readUint256(result2, readIndex++).toNumber(),
              assets: [],
            };
            let numAssets = readUint256(result2, readIndex++).toNumber();
            while (numAssets > 0) {
              child.assets.push(readUint256(result2, readIndex++).toNumber());
              --numAssets;
            }
            newUserSFT[destinationId].cfolioItems.push(child);
            --numCFolios;
          }
        } else throw new Error('Mismatch in tokenId array');
      });

      this.assets.userSFT = newUserSFT;
      emitter.emit(SFT_STATE, { status: 'user' } as SFTStateresult);
    } catch (e) {
      console.log(e.message);
    }
  };

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

    if (!amount) {
      emitter.emit(STAKE_ADD, {
        status: 'error',
        errorMessage: 'Invalid amount',
      } as StatusResult);
      return;
    }

    if (!this.lPContract || !this.stakeContract) {
      emitter.emit(STAKE_ADD, {
        status: 'error',
        errorMessage: 'invalid contract',
      } as StatusResult);
      return;
    }

    let stakeAmount = this.toWei(amount);
    // Fix math inaccuraties
    const available: ethers.BigNumber = await this.lPContract.balanceOf(
      this.address
    );
    if (
      (available.gt(stakeAmount) && available.sub(stakeAmount).lt(1000)) ||
      (available.lt(stakeAmount) && stakeAmount.sub(available).lt(1000))
    )
      stakeAmount = available;

    if (stakeAmount > available) {
      emitter.emit(STAKE_ADD, {
        status: 'error',
        errorMessage: 'Insufficient LP token.',
      } as StatusResult);
      return;
    }

    try {
      const allowance = await this.lPContract.allowance(
        this.address,
        this.stakeContract.address
      );

      if (allowance.lt(stakeAmount)) {
        const tx = await this.lPContract.approve(
          this.stakeContract.address,
          stakeAmount
        );
        emitter.emit(STAKE_ADD, {
          status: 'approve',
          tx: tx?.hash,
        } as StatusResult);

        await tx.wait();
      }

      const tx: ethers.ContractTransaction | undefined =
        await this.stakeContract?.stake(stakeAmount);
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
      const tx: ethers.ContractTransaction | undefined =
        await this.stakeContract?.getReward();
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
      const tx: ethers.ContractTransaction | undefined =
        await this.stakeContract?.exit();
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

    if (!amount || id === undefined) {
      emitter.emit(SFT_BUY, {
        status: 'error',
        errorMessage: 'Invalid input',
      } as StatusResult);
      return;
    }

    if (
      !this.sftMintContractRO ||
      !this.tokenContract ||
      !this.sftHolderContractRO
    ) {
      emitter.emit(SFT_BUY, {
        status: 'error',
        errorMessage: 'Invalid contract',
      } as StatusResult);
      return;
    }

    try {
      const sftAmount = this.toWei(amount);
      const walletAmount = await this.tokenContract.balanceOf(this.address);

      if (sftAmount.gt(walletAmount)) {
        emitter.emit(SFT_BUY, {
          status: 'error',
          errorMessage: 'Insufficient balances',
        } as StatusResult);
        return;
      }

      const cardData = await this.sftHolderContractRO?.getCardDataBatch(
        [id.toNumber() >> 8],
        [id.toNumber() & 0xff]
      );
      if (cardData[0] <= cardData[1]) {
        emitter.emit(SFT_BUY, {
          status: 'error',
          errorMessage: 'No cards available',
        } as StatusResult);
        return;
      }

      const sftMintContract = this.sftMintContractRO.connect(
        this.tokenContract.signer
      );
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

    if (!this.tradeFloorContractRO || !this.tokenContract) {
      emitter.emit(SFT_UNLOCK, {
        status: 'error',
        errorMessage: 'Invalid contract state',
      } as StatusResult);
      return;
    }

    try {
      const tradeFloorContract = this.tradeFloorContractRO.connect(
        this.tokenContract.signer
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

    if (
      !this.sftMintContractRO ||
      !this.tokenContract ||
      !this.lPContract ||
      this.cFolioItemHandlerLpAddress === ''
    ) {
      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'error',
        errorMessage: 'Contract not initialized',
      } as StatusResult);
      return;
    }

    try {
      if (wowsAmount > 0) {
        const weiAmount = this.toWei(wowsAmount);
        const walletAmount = await this.tokenContract.balanceOf(this.address);

        if (weiAmount.gt(walletAmount)) {
          emitter.emit(CFOLIO_ITEM_BUY, {
            status: 'error',
            errorMessage: 'Insufficient WOWS balances',
          } as StatusResult);
          return;
        }
      }

      let investWeiAmount = ethers.BigNumber.from(0);
      if (investAmount[0] > 0) {
        investWeiAmount = this.toWei(investAmount[0]);
        const walletAmount = await this.lPContract.balanceOf(this.address);
        if (investWeiAmount.gt(walletAmount)) {
          emitter.emit(CFOLIO_ITEM_BUY, {
            status: 'error',
            errorMessage: 'Insufficient LP balances',
          } as StatusResult);
          return;
        }
      }

      const sftMintContract = this.sftMintContractRO.connect(
        this.tokenContract.signer
      );

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
        const allowance = await this.lPContract.allowance(
          this.address,
          this.cFolioItemHandlerLpAddress
        );
        if (allowance.lt(investWeiAmount)) {
          const tx = await this.lPContract.approve(
            this.cFolioItemHandlerLpAddress,
            investWeiAmount
          );
          emitter.emit(CFOLIO_ITEM_BUY, {
            status: 'approve',
            tx: tx?.hash,
          } as StatusResult);
          await tx.wait();
        }
      }

      const tx: ethers.ContractTransaction | undefined =
        await sftMintContract?.mintCFolioItemSFT(
          this.address,
          cfolioType,
          sftTokenId,
          [investWeiAmount]
        );
      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'tx',
        tx: tx?.hash,
      } as StatusResult);

      await tx?.wait();
      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'success',
        tx: tx?.hash,
      } as StatusResult);

      // There is no transfer with our address emitted,
      // in case of valid SFT: Request an tokenId update
      if (!sftTokenId.eq(BIGNUMBER_MAX))
        this._addDQ({ type: SFT_USER } as Payload);
    } catch (e) {
      console.log(e);
      emitter.emit(CFOLIO_ITEM_BUY, {
        status: 'error',
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
      const elem = this.assets.userSFT.find((entry) => entry.id.eq(tokenId));
      if (elem) elem.locked = locked;
      this.pauseSFTUser = false;
      emitter.emit(SFT_STATE, { status: 'user' } as SFTStateresult);
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
