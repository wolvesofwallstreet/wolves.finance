/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Approval.css';

import { useEffect, useReducer, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { TFunction, withTranslation } from 'react-i18next';

import { ASSETS_STATE, REVOKE_APPROVAL } from '../../stores/constants';
import {
  AssetStateresult,
  Payload,
  StatusResult,
  StoreClasses,
} from '../../stores/store';

type PROPS = {
  hideCB: () => void;
  show: boolean;
  t: TFunction;
};

function Approval({ hideCB, show, t }: PROPS): JSX.Element {
  const [redraw, setRedraw] = useState(false);

  const reducer = (
    state: string[],
    action: { action: number; key: string }
  ) => {
    switch (action.action) {
      case 1:
        return [...state, action.key];
      case -1:
        return state.filter((e) => e !== action.key);
      default:
        throw new Error();
    }
  };

  const [approving, setApproving] = useReducer(reducer, []);

  let checkMask = parseInt(localStorage.getItem('APPROVAL') ?? '0');

  const setCheck = (index: number, checked: boolean) => {
    checkMask = checked ? checkMask | (1 << index) : checkMask & ~(1 << index);
    localStorage.setItem('APPROVAL', checkMask.toString());
  };

  useEffect(() => {
    const assetState = (result: AssetStateresult) => {
      if (result.status === 'allowance') setRedraw(true);
    };

    const handleRevoke = (result: StatusResult) => {
      if (result.status !== 'tx') {
        setApproving({ action: -1, key: result.type });
      }
    };

    StoreClasses.emitter.on(ASSETS_STATE, assetState);
    StoreClasses.emitter.on(REVOKE_APPROVAL, handleRevoke);
    StoreClasses.dispatcher.dispatch({
      type: ASSETS_STATE,
      content: { filter: ['allowance'] },
    } as Payload);

    //Cleanup
    return () => {
      StoreClasses.emitter.off(REVOKE_APPROVAL, handleRevoke);
      StoreClasses.emitter.off(ASSETS_STATE, assetState);
    };
  }, []);

  const balances = StoreClasses.store.getAssets().balances;

  const revoke = (key: string) => {
    const payload = {
      type: REVOKE_APPROVAL,
      content: {
        filter: [key],
      },
    };
    StoreClasses.dispatcher.dispatch(payload);
    setApproving({ action: 1, key: key });
  };

  if (redraw) setRedraw(false);

  return (
    <>
      <Modal show={show} onHide={hideCB} animation={false} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Manage Approval</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          In order to allow our smart contracts work with the assets in your
          wallet, you have to approve it.
          <br />
          By default we approve only the exact amount for an asset, which means
          that you have to pay multiple times in gas if you process multiple
          operations for the same asset (e.g. investment or NFT purchase)
          <br />
          Enabling "Unlimited" approval approves our smart contract only once,
          but it comes with the risk that in case of a software bug or an attack
          our smart contract is allowed to pull the full available asset amount
          out of your wallet.
          <br />
          Revoke allowances early to make sure that in an extraordinary
          situation your assets are safe.
          <span className="d-block mt-2">
            <b>Hint: </b>MetaMask supports fine control for approval just before
            you confirm the approve transaction
          </span>
          <table className="mt-4 w-100 tk-aktiv-grotesk-condensed font-14 text-center">
            <thead>
              <tr>
                <td>Asset</td>
                <td>Unlimited</td>
                <td>Allowance</td>
                <td>Revoke</td>
              </tr>
            </thead>
            <tbody>
              {Object.entries(balances).map(([k, v], index) => (
                <tr key={`AT_${index}`}>
                  <td>{k}</td>
                  <td>
                    <input
                      type="checkbox"
                      onChange={(e) => setCheck(index, e.target.checked)}
                      defaultChecked={(checkMask & (1 << index)) !== 0}
                    />
                  </td>
                  <td>
                    {v.allowance < 0 ? 'UNLIMITED' : v.allowance.toFixed(2)}
                  </td>
                  <td>
                    <button
                      className={'wolves-btn font-16 white-border'}
                      disabled={approving.includes(k) || v.allowance === 0}
                      onClick={() => revoke(k)}
                    >
                      REVOKE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </>
  );
}

export default withTranslation()(Approval);
