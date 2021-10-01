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
  const [customAddress, setCustomAddress] = useState('');

  const addressvalid = (): string => {
    try {
      return ethers.utils.getAddress(customAddress);
    } catch {
      return '';
    }
  };

  const handleTransfer = () => {
    const payload = {
      type: SFT_TRANSFER,
      content: {
        id: tokenId,
        address: tOption === 0 ? bridgeTarget.address : customAddress,
      },
    };
    StoreClasses.dispatcher.dispatch(payload);
    setTXRunning(true);
  };

  useEffect(() => {
    const resetTx = (result: StatusResult) => {
      if (['success', 'error'].includes(result.status)) {
        setTXRunning(false);
        if (result.status === 'success') hideCB();
      }
    };

    StoreClasses.emitter.on(SFT_TRANSFER, resetTx);
    setBridgeTarget(StoreClasses.store.getBridgeTarget());

    //Cleanup
    return () => {
      StoreClasses.emitter.off(SFT_TRANSFER, resetTx);
    };
  }, [hideCB]);

  const transferState = (n: number): string => {
    return tOption === n ? 'active' : 'select';
  };

  const transferFunc = (n: number) => {
    return tOption === n ? undefined : () => setTOption(n);
  };

  let address = '';
  const buttonText = txRunning
    ? { l: t('page4.txPending'), d: true }
    : tOption === 0
    ? { l: t('page4.transferTo', { name: bridgeTarget.name }), d: false }
    : (address = addressvalid()) !== ''
    ? {
        l: t('page4.transferTo', { name: address }),
        d: false,
      }
    : { l: t('page.invalidAddress'), d: true };

  return (
    <Modal show={show} onHide={hideCB} animation={false} backdrop={true}>
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
        {tOption === 0 && bridgeTarget.address !== '' && (
          <span className="tk-aktiv-grotesk mt-2 d-inline-block">
            {bridgeTarget.name === 'POLYGON' ? (
              <>
                Bridging to the Polygon network takes about 3-5 minutes.
                <br />
                Your CFOLIO will automatically appear after this time if you are
                connected to the Polygon network.
              </>
            ) : (
              <>
                Bridging to Ethereum network is a 2 step process and can take up
                to 2 hours. Your CFOLIO appears after some seconds in the
                Ethereum network and displays the transfer state:
                <br />
                <ol style={{ marginTop: '0.5em', paddingLeft: '1.5em' }}>
                  <li>CFOLIO is waiting for the bridge process to finish.</li>
                  <li>
                    You have to release the CFOLIO from the bridge with an
                    ethereum transaction.
                  </li>
                </ol>
              </>
            )}
          </span>
        )}
        {tOption === 1 && (
          <input
            className="wolves-input mt-2"
            type="edit"
            onChange={(elem) => setCustomAddress(elem.target.value)}
          />
        )}
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
