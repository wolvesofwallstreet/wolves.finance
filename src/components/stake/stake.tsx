/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './stake.css';

import { Component, createRef, ReactNode } from 'react';
import { TFunction, withTranslation } from 'react-i18next';

import logo from '../../assets/wolves_logo_dapp.png';
import {
  CONNECTION_CHANGED,
  STAKE_ADD,
  STAKE_CLAIM,
  STAKE_EXIT,
  STAKE_LP_AVAILABLE,
  STAKE_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  StatusResult,
  StoreClasses,
  TokenContractResult,
} from '../../stores/store';
import { StakeInfo } from '../stakeinfo/stakeInfo';

type STAKEPROPS = {
  t: TFunction;
};

type STAKESTATE = {
  connected: boolean;
  inputValid: boolean;
  maxVisible: boolean;
  lpToken: number;
};

const INITIALSTATE: STAKESTATE = {
  connected: false,
  inputValid: false,
  maxVisible: true,
  lpToken: 0,
};

class Stake extends Component<STAKEPROPS, STAKESTATE> {
  inputRef: React.RefObject<HTMLInputElement> = createRef();

  constructor(props: STAKEPROPS) {
    super(props);
    this.state = INITIALSTATE;

    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onStakeTX = this.onStakeTX.bind(this);
    this.onTransaction = this.onTransaction.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.onLpAvailable = this.onLpAvailable.bind(this);
  }

  componentDidMount(): void {
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.on(STAKE_ADD, this.onStakeTX);
    StoreClasses.emitter.on(STAKE_CLAIM, this.onStakeTX);
    StoreClasses.emitter.on(STAKE_EXIT, this.onStakeTX);
    StoreClasses.emitter.on(STAKE_LP_AVAILABLE, this.onLpAvailable);
    if (StoreClasses.store.isConnected()) this.setState({ connected: true });
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(STAKE_LP_AVAILABLE, this.onLpAvailable);
    StoreClasses.emitter.off(STAKE_EXIT, this.onStakeTX);
    StoreClasses.emitter.off(STAKE_CLAIM, this.onStakeTX);
    StoreClasses.emitter.off(STAKE_ADD, this.onStakeTX);
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') {
      this.setState({ connected: params.address !== '' });
    }
  }

  onStakeTX(params: StatusResult): void {
    if (params.status === 'success') {
      StoreClasses.dispatcher.dispatch({ type: STAKE_STATE, content: {} });
      if (params.type !== STAKE_CLAIM)
        StoreClasses.dispatcher.dispatch({
          type: STAKE_LP_AVAILABLE,
          content: {},
        });
    }
  }

  onLpAvailable(params: TokenContractResult): void {
    const newAmount =
      params.error === undefined && params.tokenAmount !== undefined
        ? params.tokenAmount
        : 0;
    if (newAmount !== this.state.lpToken) this.setState({ lpToken: newAmount });
  }

  onTransaction(type: string): void {
    const payload = { type: type, content: {} };
    if (type === STAKE_ADD) {
      if (!this.state.inputValid || !this.inputRef.current) return;
      payload.content = { amount: parseFloat(this.inputRef.current.value) };
    }
    StoreClasses.dispatcher.dispatch(payload);
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace(',', '.');
    const newState = parseFloat(event.target.value) > 0;
    if (newState !== this.state.inputValid)
      this.setState({ inputValid: newState });
  }

  _setMax(): void {
    if (this.inputRef.current)
      this.inputRef.current.value = this.state.lpToken.toString();
    if (this.state.maxVisible) this.setState({ maxVisible: false });

    // Validate Input
    const newState = this.state.lpToken > 0;
    if (newState !== this.state.inputValid)
      this.setState({ inputValid: newState });
  }

  render(): ReactNode {
    const { t } = this.props;
    const { connected, inputValid, maxVisible } = this.state;

    const getButtonText = (s: string): string =>
      connected ? s : t('header.connectWallet').toString();

    return (
      <div className="stake-main tk-grotesk-lightbold">
        <div className="stake-container">
          <StakeInfo />
          <h1>{t('stake.welcome')}</h1>

          <div className="stake-control">
            <img className="stake-logo opaque" src={logo} alt="logo" />
            <span className="stake-line" />
            <div className="stake-input-container opaque">
              <input
                type="text"
                autoComplete="off"
                className="stake-input"
                onFocus={() => this.setState({ maxVisible: false })}
                onBlur={() =>
                  this.setState({
                    maxVisible: this.inputRef.current?.value === '',
                  })
                }
                onChange={this.handleOnChange}
                ref={this.inputRef}
              />
              <div
                className="stake-input-max"
                onClick={() => this._setMax()}
                hidden={!maxVisible}
              >
                max
              </div>
              <div className="stake-input-currency">WOWS/ETH LP</div>
            </div>
            <input
              className="wolves-btn stake-btn stake-top-margin"
              type="button"
              value={getButtonText(t('stake.stake').toString())}
              disabled={!inputValid || !connected}
              onClick={(e) => this.onTransaction(STAKE_ADD)}
            />
            <div className="stake-btn-container">
              <div className="stake-btn-grow stake-top-margin">
                <input
                  className="wolves-btn stake-btn"
                  type="button"
                  value={getButtonText(t('stake.claim').toString())}
                  disabled={!connected}
                  onClick={(e) => this.onTransaction(STAKE_CLAIM)}
                />
              </div>
              <div className="stake-btn-grow stake-top-margin">
                <input
                  className="wolves-btn stake-btn"
                  type="button"
                  value={getButtonText(t('stake.exit').toString())}
                  disabled={!connected}
                  onClick={(e) => this.onTransaction(STAKE_EXIT)}
                />
              </div>
              <div className="stake-links">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    'https://app.uniswap.org/#/add/v2/ETH/' +
                    StoreClasses.store._getTokenContractAddress()
                  }
                >
                  Get liquidity pair token on Uniswap
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default withTranslation()(Stake);
export { Stake }; // For test suite
