/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import WalletConnectProvider from '@walletconnect/web3-provider';
import CrowdsaleAbi from 'abi/contracts/src/crowdsale/Crowdsale.sol/Crowdsale.json';
import StakeAbi from 'abi/contracts/src/investment/UniV2StakeFarm.sol/UniV2StakeFarm.json';
import TokenAbi from 'abi/contracts/src/token/Token.sol/WowsToken.json';
import async from 'async';
import { ethers } from 'ethers';
import Emitter from 'events';
import Dispatcher from 'flux';
import React from 'react';
import Web3Modal from 'web3modal';

import { addresses } from '../config/addresses';
import { privateNetwork } from '../config/networks';
import {
  CONNECTION_CHANGED,
  ERC20_TOKEN_CONTRACT,
  NEW_BLOCK,
  PRESALE_BUY,
  PRESALE_LIQUIDITY,
  PRESALE_STATE,
  STAKE_STATE,
  TX_HASH,
} from './constants';

const emitter = new Emitter.EventEmitter();
const dispatcher = new Dispatcher.Dispatcher();

type PayloadContent = {
  amount: number | undefined;
  filter: Array<string> | undefined;
};

type Payload = {
  type: string;
  content: PayloadContent;
};

type ChainAddresses = {
  token: string;
  presale: string;
  univ2Pool: string;
};

export type TokenContractResult = {
  tokenAmount: number | undefined;
};

export type ConnectResult = {
  type: 'event' | 'prod';
  address: string;
  networkName: string;
};

export type PresaleResult = {
  error: string | undefined;
  state: {
    ethRaised: number;
    hasClosed: boolean;
    isOpen: boolean;
    timeToNextEvent: number;
    ethUser: number;
    ethInvested: number;
    tokenUser: number;
  };
};

export type StatusResult = {
  error: string | undefined;
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

type cbf = async.AsyncResultCallback<unknown, Error>;

class Store {
  web3Modal: Web3Modal;
  ethersProvider: ethers.providers.JsonRpcProvider | null = null;
  eventProvider: ethers.providers.WebSocketProvider | null = null;
  tokenContract: ethers.Contract | null = null;
  presaleContract: ethers.Contract | null = null;
  presaleContractRO: ethers.Contract | null = null;
  stakeContractRO: ethers.Contract | null = null;
  networkName = 'mainnet';
  chainId = 0;
  address = '';
  assets = {};

  static nullAddress = '0x0000000000000000000000000000000000000000';

  constructor() {
    this.web3Modal = new Web3Modal({
      network: this.networkName,
      cacheProvider: true,
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            infuraId: process.env.REACT_APP_INFURA_ID,
          },
        },
      },
    });

    dispatcher.register((payload) => {
      const _payload = payload as Payload;
      switch (_payload.type) {
        case ERC20_TOKEN_CONTRACT:
          this._getTokenContractData(_payload.content);
          break;
        case PRESALE_BUY:
          this._doPresale(_payload.content);
          break;
        case PRESALE_LIQUIDITY:
          this._doPresaleLiquidity(_payload.content);
          break;
        case PRESALE_STATE:
          this._getPresaleState(_payload.content);
          break;
        case STAKE_STATE:
          this._getStakeState(_payload.content);
          break;
        default: {
          return;
        }
      }
    });
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
          'http://' + privateNetwork
        );
      } else {
        const web3Provider = await this.web3Modal.connect();
        await this.subscribeProvider(web3Provider);

        ethersProvider = new ethers.providers.Web3Provider(web3Provider);
      }
      const accounts = await ethersProvider.listAccounts();
      this.address = ethers.utils.getAddress(accounts[0]);
      const network = await ethersProvider.getNetwork();
      this.chainId = network.chainId;
      if (this.networkName !== 'private') this.networkName = network.name;
      await this._launchEventProvider();
      if (this._setupContracts(ethersProvider)) this._emitNetworkChange();
      this.ethersProvider = ethersProvider;
    } catch (e) {
      console.log(e);
      await this.disconnect(true);
    }
  };

  autoconnect = async () => {
    const query = new URLSearchParams(window.location.search);
    const defaultNetwork = query.get('network');

    if (defaultNetwork) this.networkName = defaultNetwork;

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

    provider.on('networkChanged', async (networkId: number) => {
      if (this.ethersProvider !== null) {
        const network = await this.ethersProvider.getNetwork();
        if (network.chainId !== this.chainId) {
          await this.connect();
          this._emitNetworkChange();
        }
      }
    });
  };

  disconnect = async (clearCache: boolean) => {
    if (this.ethersProvider) {
      localStorage.removeItem('walletconnect');
      this.ethersProvider.removeAllListeners();
      this.ethersProvider = null;
    }
    this.address = '';
    if (clearCache) {
      this.web3Modal.clearCachedProvider();
    }
    this._emitNetworkChange();
  };

  close = async () => {
    this.presaleContractRO = null;
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

  _setupEvents(): boolean {
    this.eventProvider?.removeAllListeners();
    // Listen to all presale TokensPurchased events
    if (this.presaleContractRO) {
      let filter = this.presaleContractRO.filters.TokensPurchased(
        null,
        null,
        null,
        null
      );
      this.eventProvider?.on(filter, (log, event) => {
        this._getPresaleState(undefined);
      });
      if (this.address !== '') {
        filter = this.presaleContractRO.filters.Staked(this.address, null);
        this.eventProvider?.on(filter, (log, event) => {
          this._getPresaleState(undefined);
        });
      }
    }
    // Our Block ticker
    this.eventProvider?.on('block', (blockNumber) => {
      emitter.emit(NEW_BLOCK, { blockNumber: blockNumber });
    });
    return true;
  }

  _emitNetworkChange() {
    emitter.emit(CONNECTION_CHANGED, {
      type: 'prod',
      address: this.address,
      networkName: this.networkName,
    } as ConnectResult);
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
            'ws://' + privateNetwork
          );
        } else {
          eventProvider = ethers.providers.InfuraProvider.getWebSocketProvider(
            this.networkName,
            process.env.REACT_APP_INFURA_ID
          );
        }
        if (!this.chainId)
          this.chainId = (await eventProvider.getNetwork()).chainId;

        this._setupEventContracts(eventProvider);
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
      this._setupEvents();
    } catch (e) {
      console.log(e);
      if (this.eventProvider) {
        this.eventProvider = null;
      }
    }
  };

  /******************** Contracts *********************/

  _getChainAddresses(): ChainAddresses | null {
    switch (this.chainId) {
      case 1:
        return addresses[1];
      case 3:
        return addresses[3];
      case 4:
        return addresses[4];
      case 97:
        return addresses[97];
      case 1337:
        return addresses[1337];
      default:
        return null;
    }
  }

  _setupEventContracts(provider: ethers.providers.WebSocketProvider): void {
    const chainAddresses = this._getChainAddresses();

    if (chainAddresses) {
      this.presaleContractRO = new ethers.Contract(
        chainAddresses.presale,
        CrowdsaleAbi,
        provider
      );
      this.stakeContractRO = new ethers.Contract(
        chainAddresses.univ2Pool,
        StakeAbi,
        provider
      );
    }
  }

  _setupContracts(provider: ethers.providers.JsonRpcProvider): boolean {
    const chainAddresses = this._getChainAddresses();
    if (chainAddresses) {
      const signer = provider?.getSigner();
      this.presaleContract = new ethers.Contract(
        chainAddresses.presale,
        CrowdsaleAbi,
        signer
      );
      this.tokenContract = new ethers.Contract(
        chainAddresses.token,
        TokenAbi,
        signer
      );
      return true;
    }
    return false;
  }

  _getPresaleState = async (payloadContent: PayloadContent | undefined) => {
    try {
      const states:
        | {
            ethRaised: ethers.BigNumber;
            timeOpen: ethers.BigNumber;
            timeClose: ethers.BigNumber;
            timeNow: ethers.BigNumber;
            userEthInvested: ethers.BigNumber;
            userTokenAmount: ethers.BigNumber;
          }
        | undefined = await this.presaleContractRO?.getStates(
        this.address === '' ? Store.nullAddress : this.address
      );

      const ethAmount =
        this.address === ''
          ? 0
          : await this.eventProvider?.getBalance(this.address);

      if (states) {
        const hasClosed = states.timeNow.gt(states.timeClose);
        const isOpen = !hasClosed && states.timeNow.gte(states.timeOpen);
        emitter.emit(PRESALE_STATE, {
          state: {
            ethRaised: this.fromWei(states.ethRaised),
            hasClosed: hasClosed,
            isOpen: isOpen,
            timeToNextEvent: hasClosed
              ? 0
              : isOpen
              ? states.timeClose.sub(states.timeNow).toNumber() + 20
              : states.timeOpen.sub(states.timeNow).toNumber() + 20,
            ethUser: ethAmount ? this.fromWei(ethAmount) : 0,
            ethInvested: this.fromWei(states.userEthInvested),
            tokenUser: this.fromWei(states.userTokenAmount),
          },
        });
      }
    } catch (e) {
      emitter.emit(PRESALE_STATE, { error: e.message });
    }
  };

  _getStakeState = async (payloadContent: PayloadContent | undefined) => {
    try {
      const result:
        | ethers.BigNumber[]
        | undefined = await this.stakeContractRO?.getUIData(
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
        emitter.emit(STAKE_STATE, stakeInfo);
      }
    } catch (e) {
      emitter.emit(STAKE_STATE, { error: e.message });
    }
  };

  _getPresaleContractAddress() {
    return this.presaleContractRO?.address;
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
          const asset: TokenContractResult = { tokenAmount: 0 };
          const numberArray = data as Array<number>;
          asset.tokenAmount = numberArray[0];
          emitter.emit(ERC20_TOKEN_CONTRACT, asset);
        }
      }
    );
  };

  // Buy tokens for {amount} ETH
  _doPresale = async (payloadContent: PayloadContent) => {
    try {
      const { amount } = payloadContent;
      const investAmount = { value: this.toWei(amount || 0) };

      const tx:
        | ethers.ContractTransaction
        | undefined = await this.presaleContract?.buyTokens(
        this.address,
        investAmount
      );
      emitter.emit(TX_HASH, tx?.hash);

      await tx?.wait();
      emitter.emit(PRESALE_BUY, {});
    } catch (e) {
      emitter.emit(PRESALE_BUY, { error: e.message });
    }
  };

  // Buy tokens and add liquidity for {amount} ETH
  _doPresaleLiquidity = async (payloadContent: PayloadContent) => {
    try {
      const { amount } = payloadContent;
      const investAmount = { value: this.toWei(amount || 0) };

      const tx:
        | ethers.ContractTransaction
        | undefined = await this.presaleContract?.buyTokensAddLiquidity(
        this.address,
        investAmount
      );
      emitter.emit(TX_HASH, tx?.hash);

      await tx?.wait();
      emitter.emit(PRESALE_LIQUIDITY, {});
    } catch (e) {
      emitter.emit(PRESALE_LIQUIDITY, { error: e.message });
    }
  };

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

  fromWei(n: ethers.BigNumber, decimals = 18) {
    return parseFloat(ethers.utils.formatUnits(n, decimals));
  }

  toWei(n: number, decimals = 18) {
    const parsed = typeof n === 'number' ? n.toFixed(decimals) : n;
    return ethers.utils.parseUnits(parsed, decimals);
  }
}

const StoreClasses = {
  store: new Store(),
  emitter: emitter,
  dispatcher: dispatcher,
};

export class StoreContainer extends React.Component<unknown> {
  componentDidMount(): void {
    StoreClasses.store.autoconnect();
  }

  componentWillUnmount(): void {
    StoreClasses.store.close();
  }

  render(): React.ReactNode {
    return <>{this.props.children}</>;
  }
}

export { StoreClasses };
