/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React, { Component, createRef, ReactNode } from 'react';
import { Overlay, Tooltip } from 'react-bootstrap';

import {
  CONNECTION_CHANGED,
  PRESALE_BUY,
  PRESALE_CLAIM,
  PRESALE_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  PresaleResult,
  StatusResult,
  StoreClasses,
} from '../../stores/store';

interface CSTATE {
  connected: boolean;
  waiting: boolean;
  inputValid: boolean;
  ethRaised: number;
  hasClosed: boolean;
  isOpen: boolean;
  timeToNextEvent: number;
  ethUser: number;
  ethInvested: number;
  tokenUser: number;
  tokenLocked: number;
}

const INITIALSTATE: CSTATE = {
  connected: false,
  waiting: false,
  inputValid: false,
  ethRaised: 0,
  hasClosed: true,
  isOpen: false,
  timeToNextEvent: 0,
  ethUser: 0,
  ethInvested: 0,
  tokenUser: 0,
  tokenLocked: 0,
};

const INITIALCONNSTATE = {
  connected: false,
  ethUser: 0,
  ethInvested: 0,
  tokenUser: 0,
  tokenLocked: 0,
};

const FAILURESTATE = {
  ethRaised: 0,
  hasClosed: true,
  isOpen: false,
  timeToNextEvent: 0,
  ethUser: 0,
  ethInvested: 0,
  tokenUser: 0,
  tokenLocked: 0,
};

class Presale extends Component<unknown, CSTATE> {
  emitter = StoreClasses.emitter;
  dispatcher = StoreClasses.dispatcher;
  static readonly defaultEthValue = '0 ETH';
  inputRef: React.RefObject<HTMLInputElement> = createRef();
  buttonRef: HTMLInputElement | null = null;
  timeoutHandle: NodeJS.Timeout | undefined = undefined;

  constructor(props: unknown) {
    super(props);
    this.state = { ...INITIALSTATE };

    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handleOnFocus = this.handleOnFocus.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClaim = this.handleClaim.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onPresaleState = this.onPresaleState.bind(this);
    this.onPresaleBuy = this.onPresaleBuy.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onButtonRefChanged = this.onButtonRefChanged.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.on(PRESALE_STATE, this.onPresaleState);
    this.emitter.on(PRESALE_BUY, this.onPresaleBuy);
    if (StoreClasses.store.isEventConnected())
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
  }

  componentWillUnmount(): void {
    this.emitter.off(PRESALE_BUY, this.onPresaleBuy);
    this.emitter.off(PRESALE_STATE, this.onPresaleState);
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'event') {
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
    } else if (params.address === '') {
      this.setState(INITIALCONNSTATE);
    } else {
      this.setState({ connected: true });
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
    }
  }

  onPresaleState(params: PresaleResult): void {
    if (params['error'] === undefined) {
      this.setState(params.state);
      this._manageTimers(
        params.state.isOpen,
        params.state.hasClosed,
        params.state.timeToNextEvent
      );
    } else {
      this.setState(FAILURESTATE);
      this._manageTimers(false, true, 0);
    }
  }

  onTimeout(): void {
    this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
  }

  onPresaleBuy(params: StatusResult): void {
    this.setState({ waiting: false });
    if (params['error'] === undefined && this.inputRef.current) {
      this.inputRef.current.value = Presale.defaultEthValue;
      this.setState({ inputValid: false });
    }
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    this.setState({ waiting: true });
    if (this.inputRef.current) {
      const amount = parseFloat(this.inputRef.current.value.replace(',', '.'));
      this.dispatcher.dispatch({
        type: PRESALE_BUY,
        content: { amount: amount },
      });
    }
    event.preventDefault();
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace('.', ',');
    this.setState({
      inputValid: parseFloat(event.target.value.replace(',', '.')) > 0,
    });
  }

  handleOnFocus(event: React.FocusEvent<HTMLInputElement>): void {
    if (event.target.value.indexOf('ETH') >= 0) event.target.value = '';
  }

  handleOnBlur(event: React.FocusEvent<HTMLInputElement>): void {
    if (event.target.value.trim() === '')
      event.target.value = Presale.defaultEthValue;
  }

  handleClaim(event: React.MouseEvent): void {
    this.dispatcher.dispatch({
      type: PRESALE_CLAIM,
      content: { amount: 0 },
    });
  }

  _manageTimers(
    isOpen: boolean,
    hasClosed: boolean,
    timeToNextEvent: number
  ): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = undefined;
    }
    if (timeToNextEvent)
      this.timeoutHandle = setTimeout(this.onTimeout, timeToNextEvent * 1000);
  }

  _renderStatus(ethRaised: number): ReactNode {
    return <div />;
  }

  _getPresaleContractAddress(): string {
    return StoreClasses.store._getPresaleContractAddress() || '';
  }

  _renderTooltip = (props: unknown): ReactNode => (
    <Tooltip id="button-tooltip" {...props}>
      Simple tooltip
    </Tooltip>
  );

  onButtonRefChanged(ref: HTMLInputElement): void {
    this.buttonRef = ref;
    this.forceUpdate();
  }

  render(): ReactNode {
    const disabled =
      !(this.state.isOpen && this.state.connected) ||
      this.state.waiting ||
      !this.state.inputValid;

    const claimDisabled = !this.state.connected || this.state.tokenLocked <= 0;

    const investLimit = Math.min(
      this.state.ethUser,
      3.0 - this.state.ethInvested
    );

    return (
      <form className="dp-pre-form" onSubmit={this.handleSubmit}>
        <span className="dp-pre-label">
          Your limit:{' '}
          {this.state.connected
            ? investLimit.toFixed(2).toString().replace('.', ',')
            : '--,--'}{' '}
          ETH
        </span>
        <br />
        <input
          type="text"
          defaultValue={Presale.defaultEthValue}
          name="eth_amount"
          id="eth_amount"
          ref={this.inputRef}
          className="dp-pre-input"
          onChange={this.handleOnChange}
          onFocus={this.handleOnFocus}
          onBlur={this.handleOnBlur}
        />
        <input
          className="dp-pre-btn"
          type="submit"
          value={disabled ? ' ' : 'SEND'}
          disabled={disabled}
          ref={this.onButtonRefChanged}
        />
        <Overlay placement="top-start" target={this.buttonRef} show={disabled}>
          {(props: unknown): ReactNode => (
            <Tooltip id="button-tooltip" {...props}>
              {!this.state.connected
                ? 'Connect your wallet'
                : !this.state.isOpen
                ? 'Presale is not open'
                : !this.state.inputValid
                ? 'Enter amount > 0'
                : 'Transaction pending'}
            </Tooltip>
          )}
        </Overlay>
        {this._renderStatus(this.state.ethRaised)}
        <div className="dp-pre-claim-container">
          <span className="dp-pre-claim-label">
            {' '}
            WOLF token locked:&nbsp;
            <b>
              {this.state.connected
                ? this.state.tokenLocked.toFixed(2).toString().replace('.', ',')
                : '-,-'}
            </b>
          </span>
          <input
            className="dp-pre-btn dp-pre-btn-claim"
            type="button"
            value={claimDisabled ? ' ' : 'CLAIM'}
            disabled={claimDisabled}
            onClick={this.handleClaim}
          />
        </div>
      </form>
    );
  }
}

export default Presale;
