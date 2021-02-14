/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React, { Component, ReactNode } from 'react';

import { CONNECTION_CHANGED, STAKE_STATE } from '../../stores/constants';
import { ConnectResult, StakeResult, StoreClasses } from '../../stores/store';

type STAKEINFOPROPS = {
  ethAmount: number;
  wowsAmount: number;
};

type STAKEINFOSTATE = {
  connected: boolean;
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

class StakeInfo extends Component<STAKEINFOPROPS, STAKEINFOSTATE> {
  emitter = StoreClasses.emitter;
  dispatcher = StoreClasses.dispatcher;

  lastTimeUpdated = 0;

  constructor(props: STAKEINFOPROPS) {
    super(props);
    this.state = { ...INITIALSTATE };
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onStakeState = this.onStakeState.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.on(STAKE_STATE, this.onStakeState);
    if (StoreClasses.store.isEventConnected())
      this.dispatcher.dispatch({ type: STAKE_STATE, content: {} });
  }

  componentWillUnmount(): void {
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
  }

  onStakeState(params: StakeResult): void {
    if (params['error'] === undefined) {
      this.setState({ ...params.state });
    } else {
      this.setState({ ...INITIALSTATE });
    }
  }

  render(): ReactNode {
    const { ethAmount, wowsAmount } = this.props;
    const { stakeSupplyUser, earned } = this.state;

    return (
      <div className="info-container">
        ETH: {ethAmount.toFixed(2)}, WOWS: {wowsAmount.toFixed(2)}, LPToken:{' '}
        {stakeSupplyUser.toFixed(2)}, Earned:{earned.toFixed(6)}
        {stakeSupplyUser > 0 ? (
          <span
            onAnimationIteration={this.onProgressIteration}
            className="info-progress"
          />
        ) : (
          ''
        )}
      </div>
    );
  }
}

export { StakeInfo };
