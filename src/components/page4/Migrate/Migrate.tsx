/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import { ethers } from 'ethers';
import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { TFunction, withTranslation } from 'react-i18next';

import { SFT_MIGRATE } from '../../../stores/constants';
import {
  PayloadContentMigration,
  StatusResult,
  StoreClasses,
} from '../../../stores/store';

type PROPS = {
  t: TFunction;
  tokenId: ethers.BigNumber;
  name: string;
  show: boolean;
  hideCB: () => void;
};

function Migrate({ hideCB, name, show, t, tokenId }: PROPS): JSX.Element {
  const [txRunning, setTXRunning] = useState(false);

  const checkRef: React.RefObject<HTMLInputElement> = useRef(null);

  const handleMigrate = () => {
    const payload = {
      type: SFT_MIGRATE,
      content: {
        id: tokenId,
        ycrvTeamConvert: checkRef.current?.checked ?? false,
      } as PayloadContentMigration,
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

    StoreClasses.emitter.on(SFT_MIGRATE, resetTx);

    //Cleanup
    return () => {
      StoreClasses.emitter.off(SFT_MIGRATE, resetTx);
    };
  }, [hideCB]);

  const buttonText = txRunning
    ? { l: t('page4.txPending'), d: true }
    : { l: `Migrate ${name} to V2`, d: false };

  return (
    <Modal show={show} onHide={hideCB} animation={false} backdrop={true}>
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="tk-vincente-bold font-36 single-line">
            MIGRATE {name} TO V2
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <span className="tk-aktiv-grotesk d-inline-block">
          <p className="font-16">
            Our multichain entry requires a migration to our new smart
            contracts. Beside the fact that the new contracts are optimized in
            respect of gas usage, they are now also proxy backed. This let us
            add features faster in the future.
          </p>
          <pre>Contract: 0x44FAd995ADf37075dF5db34fDE150F9B680DbED9</pre>
          <h3>MIGRATION RULES:</h3>
          <ul
            className="font-13"
            style={{ marginTop: '0.5em', paddingLeft: '1em' }}
          >
            <li>
              CFOLIO <b>without</b> I-NFT and <b>without</b> active booster lock
              migrate to Ethereum.
            </li>
            <li>
              CFOLIO <b>with</b> I-NFT or <b>with</b> active booster lock
              migrate to Polygon.<br/>The booster lock is bridged to Polygon, too.
            </li>
            <li>
              Pending FARM REWARDS will be claimed into the existing booster
              lock, if no such one exists, into your wallet. If you want pending
              rewards always in your wallet, you have to claim them manually before
              migration.
            </li>
            <li>
              Invested LP TOKENS are withdrawn into your wallet, you can bridge
              them on your own to Polygon and invest + earn.
            </li>
            <li>
              Invested YCRV TOKENS are withdrawn into your wallet. They are not
              supported on Polygon and have to be converted into a stable coin
              on curve.fi. Because this conversion is expensive,{' '}
              <b>we offer to do the convertion into USDT</b> after ETH block
              13377140. After our convertion you receive USDT into your wallet.
            </li>
          </ul>
          <input id="crvOffer" type="checkbox" ref={checkRef} />
          <label htmlFor="crvOffer" className="font-13 ml-2">
            Let team WOWS convert my yCrv token into USDT
          </label>
        </span>
        <button
          className={'wolves-btn mt-2 tk-aktiv-grotesk-condensed'}
          onClick={() => handleMigrate()}
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

export default withTranslation()(Migrate);
