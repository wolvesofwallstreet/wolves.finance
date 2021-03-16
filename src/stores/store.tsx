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
import TokenAbi from 'abi/contracts/src/token/WOWSErc20.sol/WowsToken.json';
import SFTHolderAbi from 'abi/contracts/src/token/WOWSErc1155.sol/WOWSERC1155.json';
import async from 'async';
import { ethers } from 'ethers';
import Emitter from 'events';
import Dispatcher from 'flux';
import React from 'react';
import Web3Modal from 'web3modal';

import { CARD_LEVEL, CARDS } from '../components/types/cards';
import { addresses } from '../config/addresses';
import { privateNetworkRPC, privateNetworkWS } from '../config/networks';
import {
  ASSETS_LOADED,
  CONNECTION_CHANGED,
  ERC20_TOKEN_CONTRACT,
  NEW_BLOCK,
  SFT_BUY,
  SFT_STATE,
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
  id?: number;
  filter?: Array<string>;
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

type cbf = async.AsyncResultCallback<unknown, Error>;

type ASSETS = {
  userSFT: number[];
  cards: CARDS;
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
  sftMintContract: ethers.Contract | null = null;
  sftHolderContractRO: ethers.Contract | null = null;
  stakeContractRO: ethers.Contract | null = null;
  uniDaiWethPairContractRO: ethers.Contract | null = null;

  static nullAddress = '0x0000000000000000000000000000000000000000';

  /* Misc */
  networkName = 'mainnet';
  accountId = 0;
  chainId = 0;
  address = '';
  tokenContractAddress = Store.nullAddress;

  assets = {
    userSFT: [],
    cards: { levelNames: [], cards: [] },
  } as ASSETS;

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
        case SFT_STATE:
          this._getSftState(_payload.content);
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
      emitter.emit(ASSETS_LOADED);
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

    provider.on('networkChanged', async (networkId: number) => {
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
      this.sftMintContract = null;
      this.ethersProvider = null;
    }
    this.address = '';
    if (clearCache) {
      this.web3Modal.clearCachedProvider();
    }
    this._emitNetworkChange();
  };

  close = async () => {
    this.stakeContractRO = null;
    this.sftHolderContractRO = null;
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
    this.sftHolderContractRO?.removeAllListeners();
    // Our Block ticker
    this.eventProvider?.on('block', (blockNumber) => {
      emitter.emit(NEW_BLOCK, { blockNumber: blockNumber });
    });
    this.sftHolderContractRO?.on('TransferSingle', (operator, from, to) => {
      dispatcher.dispatch({ type: SFT_STATE } as Payload);
      if (from === this.address || to === this.address)
        dispatcher.dispatch({ type: SFT_USER } as Payload);
    });
    this.sftHolderContractRO?.on('TransferBatch', (operator, from, to) => {
      dispatcher.dispatch({ type: SFT_STATE } as Payload);
      if (from === this.address || to === this.address)
        dispatcher.dispatch({ type: SFT_USER } as Payload);
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
    if (this.address !== '') dispatcher.dispatch({ type: SFT_USER } as Payload);
    else this.assets.userSFT = [];
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
      this.sftMintContract = new ethers.Contract(
        chainAddresses.sftMinter,
        SFTMinterAbi,
        signer
      );
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
    const levels: number[] = [];
    const cardIds: number[] = [];

    this.assets.cards.cards.forEach((level) =>
      level.cards.forEach((card) => {
        levels.push(level.chainRef);
        cardIds.push(card.chainRef);
      })
    );

    try {
      const result:
        | number[]
        | undefined = await this.sftHolderContractRO?.getCardDataBatch(
        levels,
        cardIds
      );

      if (result) {
        let index = 0;
        this.assets.cards.cards.forEach((level) =>
          level.cards.forEach((card) => {
            level.quantity = result[index++];
            card.minted = result[index++];
          })
        );
        emitter.emit(SFT_STATE, { status: 'caps' } as SFTStateresult);
      }
    } catch (e) {
      console.log(e.message);
    }
  };

  _getUserSft = async (payloadContent: PayloadContent | undefined) => {
    if (this.address === '' || !this.sftHolderContractRO) return;

    try {
      const result:
        | ethers.BigNumber[]
        | undefined = await this.sftHolderContractRO.getTokenIds(this.address);

      if (result) {
        this.assets.userSFT = result.map((bn) => bn.toNumber());
        this.assets.userSFT.sort((a: number, b: number) => a - b);
        emitter.emit(SFT_STATE, { status: 'user' } as SFTStateresult);
      }
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

      const tx:
        | ethers.ContractTransaction
        | undefined = await this.stakeContract?.stake(stakeAmount);
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
      const tx:
        | ethers.ContractTransaction
        | undefined = await this.stakeContract?.getReward();
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
      const tx:
        | ethers.ContractTransaction
        | undefined = await this.stakeContract?.exit();
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

    if (!amount || !id) {
      emitter.emit(SFT_BUY, {
        status: 'error',
        errorMessage: 'Invalid input',
      } as StatusResult);
      return;
    }

    if (!this.sftMintContract || !this.tokenContract) {
      emitter.emit(SFT_BUY, {
        status: 'error',
        errorMessage: 'Invalid contract',
      } as StatusResult);
      return;
    }

    try {
      const sftAmount = this.toWei(amount);

      const allowance = await this.tokenContract.allowance(
        this.address,
        this.sftMintContract.address
      );

      if (allowance.lt(sftAmount)) {
        const tx = await this.tokenContract.approve(
          this.sftMintContract.address,
          sftAmount
        );
        emitter.emit(SFT_BUY, {
          status: 'approve',
          tx: tx?.hash,
        } as StatusResult);

        await tx.wait();
      }

      const tx:
        | ethers.ContractTransaction
        | undefined = await this.sftMintContract?.mintWowsSFT(
        this.address,
        id >> 8,
        id & 0xff
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
