/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './stakeinfo.css';

import { Component, ReactNode } from 'react';

import {
  CONNECTION_CHANGED,
  STAKE_LP_AVAILABLE,
  STAKE_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  StakeResult,
  StoreClasses,
  TokenContractResult,
} from '../../stores/store';
import { ProgressStatus } from '../controls/progress_status';

type STAKEINFOPROPS = {
  ethAmount?: number;
  wowsAmount?: number;
};

type STAKEINFOSTATE = {
  connected: boolean;
  availableLP: number;
  poolSupply: number;
  reserve0: number;
  reserve1: number;
  priceReserve0: number;
  stakeSupply: number;
  stakeSupplyUser: number;
  rewardsDuration: number;
  rewardPerDuration: number;
  earned: number;
};

const INITIALSTATE: STAKEINFOSTATE = {
  connected: false,
  availableLP: 0,
  poolSupply: 0,
  reserve0: 0,
  reserve1: 0,
  priceReserve0: 0,
  stakeSupply: 0,
  stakeSupplyUser: 0,
  rewardsDuration: 0,
  rewardPerDuration: 0,
  earned: 0,
};

const SECONDS_PER_YEAR = 31536000;

class StakeInfo extends Component<STAKEINFOPROPS, STAKEINFOSTATE> {
  emitter = StoreClasses.emitter;
  dispatcher = StoreClasses.dispatcher;

  lastTimeUpdated = 0;

  constructor(props: STAKEINFOPROPS) {
    super(props);
    this.state = { ...INITIALSTATE };
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onStakeState = this.onStakeState.bind(this);
    this.onLpAmount = this.onLpAmount.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.on(STAKE_STATE, this.onStakeState);
    this.emitter.on(STAKE_LP_AVAILABLE, this.onLpAmount);
    if (StoreClasses.store.isEventConnected()) {
      this.dispatcher.dispatch({ type: STAKE_STATE, content: {} });
      if (
        this.props.ethAmount === undefined &&
        StoreClasses.store.isConnected()
      )
        this.dispatcher.dispatch({ type: STAKE_LP_AVAILABLE, content: {} });
    }
  }

  componentWillUnmount(): void {
    this.emitter.off(STAKE_LP_AVAILABLE, this.onLpAmount);
    this.emitter.off(STAKE_STATE, this.onStakeState);
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onProgressIteration(): void {
    StoreClasses.dispatcher.dispatch({ type: STAKE_STATE, content: {} });
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'event') {
      this.setState({ connected: true });
    } else if (params.address === '') {
      this.setState(INITIALSTATE);
      return;
    }
    this.dispatcher.dispatch({ type: STAKE_STATE, content: {} });
    if (params.type === 'prod')
      this.dispatcher.dispatch({ type: STAKE_LP_AVAILABLE, content: {} });
  }

  onStakeState(params: StakeResult): void {
    if (params['error'] === undefined) {
      this.setState({ ...params.state });
    } else {
      this.setState({ ...INITIALSTATE });
    }
  }

  onLpAmount(params: TokenContractResult): void {
    this.setState({
      availableLP: params.error === undefined ? params.tokenAmount || 0 : 0,
    });
  }

  render(): ReactNode {
    const { ethAmount, wowsAmount } = this.props;
    const {
      availableLP,
      rewardPerDuration,
      stakeSupply,
      stakeSupplyUser,
      earned,
    } = this.state;

    let apy = 0;
    let apr = 0;
    // APY calculation
    if (stakeSupply > 0 && rewardPerDuration > 0) {
      const { poolSupply, priceReserve0, reserve0, reserve1, rewardsDuration } =
        this.state;
      // Price of 1 WOWS
      const wowsPrice = (reserve0 * priceReserve0) / reserve1;
      // Total price of pool
      const poolPrice = reserve0 * priceReserve0 + reserve1 * wowsPrice;
      // Staked share
      const stakedPrice = (poolPrice * stakeSupply) / poolSupply;
      // yearly emission
      const emmission =
        ((rewardPerDuration * SECONDS_PER_YEAR) / rewardsDuration) * wowsPrice;
      // APR
      apr = emmission / stakedPrice;
      apy = (Math.pow(1.0 + apr / 52, 52) - 1.0) * 100;
    }

    return (
      <>
        <ProgressStatus
          route="stake"
          progressCallback={
            stakeSupplyUser > 0 ? this.onProgressIteration : undefined
          }
        >
          {ethAmount !== undefined && wowsAmount !== undefined ? (
            <>
              ETH:&nbsp;{ethAmount.toFixed(2)}, WOWS:&nbsp;
              {wowsAmount.toFixed(2)},{' '}
            </>
          ) : (
            <>LPToken:&nbsp;{availableLP.toFixed(2)}, </>
          )}
          Staked:&nbsp;{stakeSupplyUser.toFixed(2)}, Earned:&nbsp;
          {earned.toFixed(6)}&nbsp;WOWS, APY*:&nbsp;
          {apy > 5000 ? 'INF' : apy.toFixed(2)}%, APR:&nbsp;
          {(apr * 100).toFixed(2)}%
          {stakeSupplyUser > 0 ? (
            <span
              onAnimationIteration={this.onProgressIteration}
              className="info-progress absolute"
            />
          ) : (
            ''
          )}
        </ProgressStatus>
        <span className="info-hint">
          * based on weekly manual reward compounding
        </span>
      </>
    );
  }
}

export { StakeInfo };
