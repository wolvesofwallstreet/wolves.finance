/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import 'react-toastify/dist/ReactToastify.css';
import './wolftoast.css';

import React, { Component, ReactNode } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import {
  toast,
  ToastContainer,
  ToastOptions,
  UpdateOptions,
} from 'react-toastify';

import logo from '../../assets/wolves-token_99.png';
import {
  ADDRESS_COPIED,
  CONNECTION_CHANGED,
  STAKE_ADD,
  STAKE_CLAIM,
  STAKE_EXIT,
} from '../../stores/constants';
import { ConnectResult, StatusResult, StoreClasses } from '../../stores/store';

export type ToastMessage = {
  type: ['info' | 'success' | 'failure'];
  message: string;
  autoClose: number | false;
};

type TOASTSTATE = {
  show: boolean;
};

type TOASTPROPS = {
  t: TFunction;
};

class WolfToast extends Component<TOASTPROPS, TOASTSTATE> {
  t: TFunction;
  txId: React.ReactText | undefined;
  connectId: React.ReactText | undefined;

  constructor(props: TOASTPROPS) {
    super(props);
    this.t = this.props.t;

    this.onAddressCopied = this.onAddressCopied.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onTransaction = this.onTransaction.bind(this);
  }

  componentDidMount(): void {
    StoreClasses.emitter.on(ADDRESS_COPIED, this.onAddressCopied);
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.on(STAKE_ADD, this.onTransaction);
    StoreClasses.emitter.on(STAKE_CLAIM, this.onTransaction);
    StoreClasses.emitter.on(STAKE_EXIT, this.onTransaction);
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(STAKE_EXIT, this.onTransaction);
    StoreClasses.emitter.off(STAKE_CLAIM, this.onTransaction);
    StoreClasses.emitter.off(STAKE_ADD, this.onTransaction);
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
    StoreClasses.emitter.off(ADDRESS_COPIED, this.onAddressCopied);
  }

  onAddressCopied(): void {
    toast(this._formatToast(undefined, this.t('toast.addressCopied')), {
      autoClose: 2000,
    });
  }

  onConnectionChanged(result: ConnectResult): void {
    if (result.type !== 'event') {
      const msg = this.t(
        result.address === ''
          ? 'toast.walletDisconnected'
          : 'toast.walletConnected'
      );
      this.connectId = this._updateToast(this.connectId, {
        render: msg,
        autoClose: 2000,
      });
    }
  }

  onTransaction(result: StatusResult) {
    if (result.status === 'approve')
      this.txId = this._updateToast(this.txId, {
        render: this._formatToast(
          undefined,
          this.t('toast.transactionApproving')
        ),
        autoClose: false,
      });
    else if (result.status === 'tx')
      this.txId = this._updateToast(this.txId, {
        render: this._formatToast(undefined, this.t('toast.transactionMined')),
        autoClose: false,
      });
    else if (result.status === 'success')
      this.txId = this._updateToast(this.txId, {
        render: this._formatToast(
          'success',
          this.t('toast.transactionFinished')
        ),
        autoClose: 3000,
      });
    else
      this.txId = this._updateToast(this.txId, {
        render: this._formatToast(
          'failure',
          result.errorMessage || this.t('toast.undefinedError')
        ),
        autoClose: 5000,
      });
  }

  _updateToast(
    key: React.ReactText | undefined,
    options: UpdateOptions
  ): React.ReactText | undefined {
    if (key && toast.isActive(key)) {
      toast.update(key, options);
    } else {
      key = toast(options.render, options as ToastOptions);
    }
    return key;
  }

  _formatToast(type: string | undefined, message: string): ReactNode {
    const className = type ? 'wolflogo wolflogo--' + type : 'wolflogo';
    return (
      <>
        <img alt="logo" src={logo} className={className} width="24px" />
        <span>{message}</span>
      </>
    );
  }

  render(): ReactNode {
    return <ToastContainer position="bottom-left" pauseOnFocusLoss={false} />;
  }
}

export default withTranslation()(WolfToast);
