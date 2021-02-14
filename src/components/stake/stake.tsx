/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './stake.css';

import { Component } from 'react';
import { TFunction, withTranslation } from 'react-i18next';

import {
  CONNECTION_CHANGED,
  STAKE_ADD,
  STAKE_STATE,
} from '../../stores/constants';
import { ConnectResult, StoreClasses } from '../../stores/store';

type STAKEPROPS = {
  t: TFunction;
};

type STAKESTATE = {
  connected: boolean;
};

const INITIALSTATE: STAKESTATE = {
  connected: false,
};

class Stake extends Component<STAKEPROPS, STAKESTATE> {
  constructor(props: STAKEPROPS) {
    super(props);
    this.state = INITIALSTATE;

    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onStakeAction = this.onStakeAction.bind(this);
  }

  componentDidMount(): void {
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.off(STAKE_ADD, this.onStakeAction);
    if (StoreClasses.store.isEventConnected())
      StoreClasses.dispatcher.dispatch({ type: STAKE_STATE, content: {} });
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(STAKE_ADD, this.onStakeAction);
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult) {
    if (params.type === 'prod') {
      this.setState({ connected: params.address !== '' });
    }
  }

  onStakeAction() {
    StoreClasses.dispatcher.dispatch({ type: STAKE_STATE, content: {} });
  }

  render() {
    return <div className="stake-main"></div>;
  }
}

export default withTranslation()(Stake);
