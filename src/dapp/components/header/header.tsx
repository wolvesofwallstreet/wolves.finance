/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React, { Component, ReactNode } from 'react';

import { CONNECTION_CHANGED } from '../../stores/constants';
import { ConnectResult, StoreClasses } from '../../stores/store';

interface CSTATE {
  address: string;
  networkName: string;
}

class Header extends Component<unknown, CSTATE> {
  store = StoreClasses.store;
  emitter = StoreClasses.emitter;

  constructor(props: unknown) {
    super(props);
    this.state = { address: '', networkName: '' };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  componentWillUnmount(): void {
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') this.setState(params);
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    if (this.store.isConnected()) {
      this.store.disconnect(true);
    } else {
      this.store.connect();
    }
    event.preventDefault();
  }

  _shortAddress(): string {
    const { address, networkName } = this.state;
    return address !== ''
      ? address.substring(0, 6) +
          '...' +
          address.substring(address.length - 4, address.length) +
          '(' +
          networkName +
          ')'
      : 'CONNECT WALLET';
  }

  render(): ReactNode {
    const shortAddress = this._shortAddress();
    return (
      <form className="dp-conn-form" onSubmit={this.handleSubmit}>
        <input className="dp-conn-btn" type="submit" value={shortAddress} />
      </form>
    );
  }
}

export default Header;
