/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './presale.css';

import React, { Component, createRef, ReactNode } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { TFunction, withTranslation } from 'react-i18next';

import WowsToken from '../../assets/wolves-token_233.png';
import {
  ADDRESS_COPIED,
  CONNECTION_CHANGED,
  PRESALE_BUY,
  PRESALE_LIQUIDITY,
  PRESALE_STATE,
  STAKE_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  PresaleResult,
  StatusResult,
  StoreClasses,
} from '../../stores/store';
import { StakeInfo } from '../stakeinfo/stakeInfo';
import { TimeTicker } from '../timeticker';
import Social from './social';

type PRESALEPROPS = {
  t: TFunction;
};

type PRESALESTATE = {
  connected: boolean;
  waiting: boolean;
  inputValid: boolean;
  termsChecked: boolean;
  ethRaised: number;
  hasClosed: boolean;
  isOpen: boolean;
  timeToNextEvent: number;
  ethUser: number;
  ethInvested: number;
  tokenUser: number;
  tokenLocked: number;
};

const INITIALSTATE: PRESALESTATE = {
  connected: false,
  waiting: false,
  inputValid: false,
  termsChecked: false,
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

function ceil4(n: number): string {
  return (Math.ceil((n + Number.EPSILON) * 10000) / 10000).toString();
}

function floor4(n: number): string {
  return (Math.floor((n + Number.EPSILON) * 10000) / 10000).toString();
}

class Presale extends Component<PRESALEPROPS, PRESALESTATE> {
  emitter = StoreClasses.emitter;
  dispatcher = StoreClasses.dispatcher;

  textRef: React.RefObject<HTMLSpanElement> = React.createRef();
  clockRef: React.RefObject<HTMLDivElement> = React.createRef();
  inputRef: React.RefObject<HTMLInputElement> = createRef();
  inputLRef: React.RefObject<HTMLInputElement> = createRef();
  buttonRef: HTMLInputElement | null = null;
  buttonLRef: HTMLInputElement | null = null;

  timeoutHandle: NodeJS.Timeout | undefined = undefined;
  tickerHandle: number | undefined = undefined;

  static readonly ETHRate = 80;
  static readonly EthMin = 0.2;
  static readonly EthMax = 3;
  // transform buy ETH into total ETH
  static readonly buy2Total = (Presale.ETHRate * 3750 + 240000) / 240000;

  static readonly defaultEthValue = Presale.EthMin.toString();
  static readonly defaultLiquidityValue = ceil4(
    Presale.EthMin * Presale.buy2Total
  );

  investLimit = { min: Presale.EthMin, max: Presale.EthMax };
  liquidityLimit = {
    min: Presale.EthMin * Presale.buy2Total,
    max: Presale.EthMax * Presale.buy2Total,
  };

  constructor(props: PRESALEPROPS) {
    super(props);
    this.state = { ...INITIALSTATE };

    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onPresaleState = this.onPresaleState.bind(this);
    this.onPresaleBuy = this.onPresaleBuy.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.handleTickEvent = this.handleTickEvent.bind(this);
    this.onButtonRefChanged = this.onButtonRefChanged.bind(this);
    this.onButtonLRefChanged = this.onButtonLRefChanged.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.on(PRESALE_STATE, this.onPresaleState);
    this.emitter.on(PRESALE_BUY, this.onPresaleBuy);
    this.emitter.on(PRESALE_LIQUIDITY, this.onPresaleBuy);
    if (StoreClasses.store.isEventConnected())
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
    if (StoreClasses.store.isConnected()) this.setState({ connected: true });
    window.addEventListener('PRESALE_TICKER', this.handleTickEvent);
  }

  componentWillUnmount(): void {
    this.emitter.off(PRESALE_BUY, this.onPresaleBuy);
    this.emitter.off(PRESALE_STATE, this.onPresaleState);
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.off(PRESALE_LIQUIDITY, this.onPresaleBuy);
    window.removeEventListener('PRESALE_TICKER', this.handleTickEvent);
    if (this.tickerHandle !== undefined) clearInterval(this.tickerHandle);
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
      this._updateInvestLimits(params.state.ethInvested);
      this.setState(params.state);
      this._manageTimers(
        params.state.isOpen,
        params.state.hasClosed,
        params.state.timeToNextEvent
      );
    } else {
      this._updateInvestLimits(0);
      this.setState(FAILURESTATE);
      this._manageTimers(false, true, 0);
    }
  }

  onTimeout(): void {
    this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
  }

  onTicker(tickerEnd: number): void {
    const secondsLeft = tickerEnd - Date.now() + 500;

    if (secondsLeft < 0) return;

    const msecInMinute = 1000 * 60;
    const msecInHour = msecInMinute * 60;
    const msecInDay = msecInHour * 24;

    const days = Math.floor(secondsLeft / msecInDay)
      .toString()
      .padStart(2, '0');
    const hours = Math.floor((secondsLeft % msecInDay) / msecInHour)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((secondsLeft % msecInHour) / msecInMinute)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor((secondsLeft % msecInMinute) / 1000)
      .toString()
      .padStart(2, '0');

    const result = days + 'd:' + hours + 'h:' + minutes + 'm:' + seconds + 's';
    window.dispatchEvent(
      new CustomEvent('PRESALE_TICKER', { detail: { time: result } })
    );
  }

  onPresaleBuy(params: StatusResult): void {
    if (params.status !== 'tx') this.setState({ waiting: false });
    if (params.status === 'success') {
      if (this.inputRef.current) {
        this.inputRef.current.value = Presale.defaultEthValue;
      }
      if (this.inputLRef.current) {
        this.inputLRef.current.value = Presale.defaultLiquidityValue;
      }
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
      this.dispatcher.dispatch({ type: STAKE_STATE, content: {} });
    }
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    this.setState({ waiting: true });
    if (document.activeElement?.id === 'buy' && this.inputRef.current) {
      const amount = parseFloat(this.inputRef.current.value);
      this.dispatcher.dispatch({
        type: PRESALE_BUY,
        content: { amount: amount },
      });
    } else if (
      document.activeElement?.id === 'liquidity' &&
      this.inputLRef.current
    ) {
      const amount = parseFloat(this.inputLRef.current.value);
      this.dispatcher.dispatch({
        type: PRESALE_LIQUIDITY,
        content: { amount: amount },
      });
    } else this.setState({ waiting: false });
    event.preventDefault();
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace(',', '.');
    if (event.target.id === 'eth_buy') this._validateInput(event.target.value);
    else this._validateLInput(event.target.value);
  }

  handleOnBlur(event: React.FocusEvent<HTMLInputElement>): void {
    if (event.target.value.trim() === '')
      event.target.value = Presale.defaultEthValue;
  }

  handleTickEvent(event: Event): void {
    const detail = (event as CustomEvent).detail;
    if (detail.time && this.clockRef.current) {
      this.clockRef.current.innerHTML = detail.time;
      if (
        !this.state.hasClosed &&
        !this.state.isOpen &&
        this.state.connected &&
        this.state.termsChecked
      ) {
        if (this.buttonRef)
          this.buttonRef.value = this._getButtonText('buy', detail.time);
        if (this.buttonLRef)
          this.buttonLRef.value = this._getButtonText('liquidity', detail.time);
      }
    } else if (detail.text && this.textRef.current) {
      this.textRef.current.innerHTML = detail.text;
      if (this.clockRef.current)
        this.clockRef.current.style.color = detail.isOpen ? 'lime' : 'red';
    }
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
    const { t } = this.props;
    window.dispatchEvent(
      new CustomEvent('PRESALE_TICKER', {
        detail: {
          text: hasClosed
            ? t('presale.closed')
            : isOpen
            ? t('presale.live')
            : t('presale.notOpen'),
          isOpen: isOpen,
        },
      })
    );

    if (this.tickerHandle !== undefined) {
      clearInterval(this.tickerHandle);
      this.tickerHandle = undefined;
    }
    if (timeToNextEvent) {
      this.tickerHandle = setInterval(this.onTicker, 1000, [
        Date.now() + timeToNextEvent * 1000,
      ]);
    } else
      window.dispatchEvent(
        new CustomEvent('PRESALE_TICKER', { detail: { time: '-- : --' } })
      );
  }

  _getPresaleContractAddress(): string {
    return StoreClasses.store._getPresaleContractAddress() || '';
  }

  _calculateWOLF(): string {
    const val = this.inputRef?.current?.value;
    return val && this.state.inputValid
      ? (parseFloat(val) * Presale.ETHRate).toFixed(2)
      : '--:--';
  }

  _calculateETH(): string {
    const val = this.inputRef?.current?.value;
    const valL = this.inputLRef?.current?.value;
    return val && valL && this.state.inputValid
      ? (parseFloat(valL) - parseFloat(val)).toFixed(2)
      : '--:--';
  }

  _updateInvestLimits(ethInvested: number): void {
    this.investLimit.max = Presale.EthMax - ethInvested;
    this.liquidityLimit.max = this.investLimit.max * Presale.buy2Total;
    this._validateInput(this.inputRef.current?.value);
  }

  _validateInput(val: string | undefined): void {
    const parsed = parseFloat(val || '0');
    const valid =
      parsed >= this.investLimit.min && parsed <= this.investLimit.max;
    this.setState({ inputValid: valid });
    if (this.inputLRef.current) {
      if (valid) {
        const lVal = parsed * Presale.buy2Total;
        this.inputLRef.current.value =
          lVal > this.liquidityLimit.max
            ? floor4(this.liquidityLimit.max)
            : ceil4(lVal);
      } else this.inputLRef.current.value = Presale.defaultLiquidityValue;
    }
  }

  _validateLInput(val: string | undefined): void {
    const parsed = parseFloat(val || '0');
    const valid =
      parsed >= this.liquidityLimit.min && parsed <= this.liquidityLimit.max;
    this.setState({ inputValid: valid });
    if (this.inputRef.current) {
      if (valid) {
        const lVal = parsed / Presale.buy2Total;
        this.inputRef.current.value =
          lVal > this.liquidityLimit.max
            ? floor4(this.liquidityLimit.max)
            : ceil4(lVal);
      } else this.inputRef.current.value = Presale.defaultLiquidityValue;
    }
  }

  _getButtonText(type: string, time: string | undefined): string {
    const { t } = this.props;
    const tpl = type === 'buy' ? 'presale.buy' : 'presale.addLiq';
    return this.state.hasClosed
      ? t('presale.closed').toString()
      : !this.state.connected
      ? t('header.connectWallet')
      : !this.state.termsChecked
      ? t('presale.checkTerms')
      : t(
          time && !this.state.isOpen ? tpl + 'In' : tpl,
          type === 'buy'
            ? {
                num: this._calculateWOLF(),
                time: time,
              }
            : {
                num: this._calculateWOLF(),
                ethnum: this._calculateETH(),
                time: time,
              }
        ).toString();
  }

  onButtonRefChanged(ref: HTMLInputElement): void {
    this.buttonRef = ref;
    this.forceUpdate();
  }

  onButtonLRefChanged(ref: HTMLInputElement): void {
    this.buttonLRef = ref;
    this.forceUpdate();
  }

  onAddressCopied(): void {
    StoreClasses.emitter.emit(ADDRESS_COPIED);
  }

  render(): ReactNode {
    const disabled =
      !(this.state.isOpen && this.state.connected) ||
      this.state.waiting ||
      !this.state.inputValid ||
      !this.state.termsChecked;

    //const claimDisabled = !this.state.connected || this.state.tokenLocked <= 0;
    const failureClass = this.state.inputValid ? '' : ' pcr-input-failure';

    const investLimitFormatted = {
      min: this.investLimit.min.toString(),
      max: floor4(this.investLimit.max),
    };

    const liquidityLimitFormatted = {
      min: ceil4(this.liquidityLimit.min),
      max: floor4(this.liquidityLimit.max),
    };

    const { t } = this.props;

    return (
      <div className="tk-grotesk-lightbold presale-main">
        <div className="presale-info">
          <TimeTicker
            value={t('presale.unknown')}
            description={t('presale.description')}
            textRef={this.textRef}
            clockRef={this.clockRef}
          />
          <StakeInfo
            ethAmount={this.state.ethUser}
            wowsAmount={this.state.tokenUser}
          />
        </div>
        <div className="progress-form">
          <div
            className="progress-label"
            style={{ textAlign: 'right', paddingRight: '6px' }}
          >
            {this.state.ethRaised.toFixed(2)} ETH
          </div>
          <div className="progress-outer">
            <div
              className="progress-inner"
              style={{ width: (this.state.ethRaised * 100) / 150 + '%' }}
            />
          </div>
          <div
            className="progress-label"
            style={{ textAlign: 'left', paddingLeft: '6px' }}
          >
            75 ETH {t('presale.target')}
          </div>
        </div>
        <div className="presale-content-container">
          {/****** LEFT ******/}
          <div className="presale-content presale-content-left">
            <div className="presale-top">
              <h1>{t('presale.event')}</h1>
              <h3>
                6000 WOWS {t('presale.available')} - 75 ETH{' '}
                {t('presale.target')}
                <br />
                {t('presale.h3Min', { num: Presale.EthMin })}
                <br />
                {t('presale.h3Max', { num: Presale.EthMax })}
              </h3>
              <p dangerouslySetInnerHTML={{ __html: t('presale.textTop') }} />
              <h3>{t('presale.or')}</h3>
              <p
                dangerouslySetInnerHTML={{ __html: t('presale.textBottom') }}
              />

              <p>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://wolvesofwallstreet.medium.com/the-wolves-of-wall-street-wows-token-presale-b16c988faa42"
                >
                  {t('presale.fundAllocation')}
                </a>
              </p>
              <hr />
            </div>
            <div className="presale-social">
              <span>
                <h3>{t('presale.followUs')}</h3>
              </span>
              <span>
                <Social />
              </span>
            </div>
          </div>
          {/****** RIGHT ******/}
          <div className="presale-content presale-content-right">
            <img alt={WowsToken} src={WowsToken} width="50px" />
            <br />
            <span className="tk-vincente-bold font24">WOWS {t('token')}</span>
            <form className="pcr-form" onSubmit={this.handleSubmit}>
              <table>
                <tbody>
                  <tr>
                    <td style={{ width: '16px' }}>
                      <input
                        onChange={(e) =>
                          this.setState({
                            termsChecked: e.currentTarget.checked,
                          })
                        }
                        id="terms"
                        type="checkbox"
                      />
                    </td>
                    <td colSpan={2}>
                      <label className="pcr-label" htmlFor="terms">
                        {t('presale.terms')}
                      </label>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <hr style={{ margin: '8px 0px 8px 0px' }} />
                    </td>
                  </tr>
                  {/************ Buy ************ */}
                  <tr>
                    <td colSpan={3}>
                      <span className="pcr-input-label">
                        {t('presale.purchase', investLimitFormatted)}
                      </span>
                      <br />
                      <div className="pcr-input-container">
                        <input
                          type="text"
                          defaultValue={Presale.defaultEthValue}
                          name="eth_buy"
                          id="eth_buy"
                          ref={this.inputRef}
                          autoComplete="off"
                          className={'pcr-input' + failureClass}
                          onChange={this.handleOnChange}
                          onBlur={this.handleOnBlur}
                        />
                        <div className="pcr-input-currency">ETH</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <input
                        id="buy"
                        className="pcr-btn"
                        type="submit"
                        value={this._getButtonText('buy', undefined)}
                        disabled={disabled}
                        ref={this.onButtonRefChanged}
                      />
                    </td>
                  </tr>
                  {/************ Liquidity ************ */}
                  <tr>
                    <td colSpan={3}>
                      <span className="pcr-input-label">
                        {t('presale.liquidity', liquidityLimitFormatted)}
                      </span>
                      <br />
                      <div className="pcr-input-container">
                        <input
                          type="text"
                          defaultValue={Presale.defaultLiquidityValue}
                          name="eth_liquidity"
                          id="eth_liquidity"
                          ref={this.inputLRef}
                          autoComplete="off"
                          className={'pcr-input' + failureClass}
                          onChange={this.handleOnChange}
                          onBlur={this.handleOnBlur}
                        />
                        <div className="pcr-input-currency">ETH</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <input
                        id="liquidity"
                        className="pcr-btn"
                        type="submit"
                        value={this._getButtonText('liquidity', undefined)}
                        disabled={disabled}
                        ref={this.onButtonLRefChanged}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </form>
            <CopyToClipboard
              text={this._getPresaleContractAddress()}
              onCopy={this.onAddressCopied}
            >
              <span className="pcr-input-label pcr-pointer">
                {t('presale.contract')}:{' '}
                <u>{this._getPresaleContractAddress()}</u>
              </span>
            </CopyToClipboard>
          </div>
        </div>
      </div>
    );
  }
}

export default withTranslation()(Presale);
// for testing export without hook
export { Presale };
