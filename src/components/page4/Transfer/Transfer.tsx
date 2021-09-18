/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Transfer.css';

import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { TFunction, withTranslation } from 'react-i18next';

import { SFT_TRANSFER } from '../../../stores/constants';
import { StatusResult, StoreClasses } from '../../../stores/store';

type PROPS = {
  t: TFunction;
  tokenId: ethers.BigNumber;
  name: string;
  show: boolean;
  hideCB: () => void;
};

function Transfer({ hideCB, name, show, tokenId, t }: PROPS): JSX.Element {
  const [txRunning, setTXRunning] = useState(false);
  const [tOption, setTOption] = useState(0);
  const [bridgeTarget, setBridgeTarget] = useState({
    name: '...',
    address: '',
  });

  const handleTransfer = () => {
    const payload = {
      type: SFT_TRANSFER,
      content: {
        id: tokenId,
        address: bridgeTarget.address,
      },
    };
    StoreClasses.dispatcher.dispatch(payload);
    setTXRunning(true);
  };

  useEffect(() => {
    const resetTx = (result: StatusResult) => {
      if (['success', 'error'].includes(result.status)) setTXRunning(false);
    };

    StoreClasses.emitter.on(SFT_TRANSFER, resetTx);
    setBridgeTarget(StoreClasses.store.getBridgeTarget());

    //Cleanup
    return () => {
      StoreClasses.emitter.off(SFT_TRANSFER, resetTx);
    };
  }, []);

  const transferState = (n: number): string => {
    return tOption === n ? 'active' : 'select';
  };

  const transferFunc = (n: number) => {
    return tOption === n ? undefined : () => setTOption(n);
  };

  const buttonText =
    tOption === 1
      ? { l: 'COMING SOON', d: true }
      : txRunning
      ? { l: t('page4.txPending'), d: true }
      : { l: t('page4.transferTo', { name: bridgeTarget.name }), d: false };

  return (
    <Modal show={show} onHide={hideCB} animation={false}>
      <Modal.Header closeButton>
        <Modal.Title>Transfer {name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="lock-container">
          <div className={transferState(0)} onClick={transferFunc(0)}>
            {bridgeTarget.name}
          </div>
          <div className={transferState(1)} onClick={transferFunc(1)}>
            ADDRESS
          </div>
        </div>
        <button
          className={'wolves-btn mt-2 tk-aktiv-grotesk-condensed'}
          onClick={() => handleTransfer()}
          disabled={buttonText?.d}
        >
          {buttonText?.l}
        </button>
      </Modal.Body>
      <Modal.Footer>
        <button
          className={
            'wolves-btn white-border mt-2 w-25 tk-aktiv-grotesk-condensed'
          }
          onClick={hideCB}
        >
          CLOSE
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default withTranslation()(Transfer);
