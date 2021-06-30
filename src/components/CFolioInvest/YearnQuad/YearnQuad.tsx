/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './YearnQuad.css';

import { useEffect, useState } from 'react';
import { TFunction, withTranslation } from 'react-i18next';

import {
  CFOLIO_ITEM_BUY,
  CFOLIO_ITEM_DEPOSIT,
  CFOLIO_ITEM_WITHDRAW,
} from '../../../stores/constants';
import {
  SFT,
  SFTCHILD,
  StatusResult,
  StoreClasses,
} from '../../../stores/store';
import Approval from '../../Approval';
import AssetInput from '../../controls/asset_input';

type PROPS = {
  t: TFunction;
  nftPrice: number;
  nftType: number;
  investCurrency: string;
  cfolioItem?: SFTCHILD;
  sft?: SFT;
};

function YearnQuad({
  cfolioItem,
  investCurrency,
  nftPrice,
  nftType,
  sft,
  t,
}: PROPS): JSX.Element {
  const [tabOption, setTabOption] = useState(0);
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const [checkedIndex, setCheckedIndex] = useState(-1);
  const [inputVals, setInputVals] = useState([0, 0, 0, 0, 0]);
  const [txRunning, setTXRunning] = useState(false);
  const [balances] = useState(StoreClasses.store.getAssets().balances);
  const [modal, showModal] = useState(false);

  const currencies = ['DAI', 'USDC', 'USDT', 'TUSD', 'yCrv']; // maps from internal to asset index

  const handleBuy = () => {
    const payload = {
      type: cfolioItem
        ? tabOption === 1
          ? CFOLIO_ITEM_WITHDRAW
          : CFOLIO_ITEM_DEPOSIT
        : CFOLIO_ITEM_BUY,
      content: {
        wowsAmount: nftPrice,
        investAmount: inputVals,
        sftTokenId: sft?.tokenId,
        cfolioTokenId: cfolioItem?.tokenId,
        cfolioType: nftType,
      },
    };
    StoreClasses.dispatcher.dispatch(payload);
    setTXRunning(true);
  };

  const curMaxAmount =
    tabOption === 0
      ? balances[currencies[currencyIndex]].value
      : (cfolioItem && cfolioItem.assets[currencyIndex]) ?? 0;

  useEffect(() => {
    const resetTx = (result: StatusResult) => {
      if (['success', 'error'].includes(result.status)) setTXRunning(false);
    };

    StoreClasses.emitter.on(CFOLIO_ITEM_BUY, resetTx);
    StoreClasses.emitter.on(CFOLIO_ITEM_DEPOSIT, resetTx);
    StoreClasses.emitter.on(CFOLIO_ITEM_WITHDRAW, resetTx);
    //Cleanup
    return () => {
      StoreClasses.emitter.off(CFOLIO_ITEM_WITHDRAW, resetTx);
      StoreClasses.emitter.off(CFOLIO_ITEM_DEPOSIT, resetTx);
      StoreClasses.emitter.off(CFOLIO_ITEM_BUY, resetTx);
    };
  }, []);

  useEffect(() => {
    setTabOption(0);
  }, [cfolioItem]);

  useEffect(() => {
    if (tabOption) setCurrencyIndex(4);
    setCheckedIndex(-1);
    setInputVals([0, 0, 0, 0, 0]);
  }, [tabOption]);

  useEffect(() => {
    if (tabOption === 1) {
      const newValues = [0, 0, 0, 0, inputVals[4]];
      if (checkedIndex >= 0 && curMaxAmount > 0) {
        newValues[checkedIndex] = isNaN(inputVals[4])
          ? NaN
          : (((cfolioItem && cfolioItem.assets[checkedIndex]) ?? 0) *
              inputVals[4]) /
            curMaxAmount;
      }
      if (newValues.find((v, index) => v !== inputVals[index]) !== undefined) {
        setInputVals(newValues);
      }
    }
  }, [checkedIndex, tabOption, inputVals, cfolioItem, curMaxAmount]);

  const validCurrencies = () => {
    if (tabOption === 1)
      return isNaN(inputVals[4])
        ? undefined
        : inputVals[4] <= 0
        ? []
        : [currencies[4]];
    else if (inputVals.find((v) => isNaN(v)) !== undefined) return undefined;
    else return currencies.filter((_, index) => inputVals[index] > 0);
  };

  const setCurrentValue = (v: number) => {
    const newValues = inputVals.map((i) => i);
    newValues[currencyIndex] = v;
    setInputVals(newValues);
  };

  let vc: string[] | undefined;
  const buttonText = txRunning
    ? { l: 'TRANSACTION PENDING ...', e: false }
    : sft
    ? (vc = validCurrencies()) === undefined
      ? { l: 'INPUT AMOUNT IS INVALID', e: false }
      : vc.length === 0 && cfolioItem
      ? { l: 'INPUT AMOUNT MISSING', e: false }
      : tabOption === 1
      ? {
          l:
            `WITHDRAW ${investCurrency}` +
            (checkedIndex >= 0
              ? ` AND RECEIVE ${currencies[checkedIndex]}`
              : ''),
          e: true,
        }
      : cfolioItem
      ? { l: `DEPOSIT ${vc.join(' + ')}`, e: true }
      : {
          l:
            `BUY NFT (${nftPrice} WOWS)` +
            (vc.length > 0 ? ` & DEPOSIT ${vc.join(' + ')}` : ''),
          e: true,
        }
    : { l: 'ACCOUNT NOT INITIALIZED', e: false };

  const renderSpan = (id: number, caption: string) => {
    return id === tabOption ? (
      <div>
        <span className="border_thin_b">{caption}</span>
      </div>
    ) : (
      <div>
        <span className="c-pointer" onClick={() => setTabOption(id)}>
          {caption}
        </span>
      </div>
    );
  };

  const spanText = cfolioItem
    ? 'DEPOSIT MORE'
    : sft?.isWallet
    ? `ADD "${investCurrency} INVESTMENT NFT" INTO MY WALLET`
    : `ADD "${investCurrency} INVESTMENT NFT" INTO MY CFOLIO`;

  const hideModal = () => showModal(false);

  return (
    <>
      <div
        id="cfolioInvest-control-nav"
        className="tk-vincente-lightbold font-22"
      >
        {renderSpan(0, spanText)}
        {cfolioItem && renderSpan(1, 'WITHDRAW')}
      </div>
      <div className="d-flex justify-content-between">
        <span className="d-block my-1 font-14">
          {tabOption === 0 ? ' MY WALLET: ' : ' MY NFT: '}
          {curMaxAmount.toFixed(2)} {currencies[currencyIndex]}
        </span>
        <span
          className="d-block my-1 font-14 c-pointer"
          onClick={() => showModal(true)}
        >
          <u>MANAGE APPROVAL</u>
        </span>
      </div>
      {/* Orange Horizontal Bar */}
      <AssetInput
        currency={currencies[currencyIndex]}
        defaultValue={
          isNaN(inputVals[currencyIndex]) || inputVals[currencyIndex] === 0
            ? ''
            : inputVals[currencyIndex].toString()
        }
        minAmount={0}
        maxAmount={curMaxAmount}
        cb={(n) => setCurrentValue(n)}
      />
      <div id="currency-container" className="tk-grotesk-lightbold mt-3">
        {currencies.map((currency, index) => (
          <div
            key={'cidx_' + index}
            className={
              index === currencyIndex
                ? 'selected'
                : index === checkedIndex
                ? 'checked'
                : ''
            }
            onClick={
              index === currencyIndex
                ? undefined
                : tabOption === 1
                ? () => setCheckedIndex(index === checkedIndex ? -1 : index)
                : () => setCurrencyIndex(index)
            }
          >
            {currency}
            <br />
            {isNaN(inputVals[index]) ? 'INVALID' : inputVals[index].toFixed(2)}
          </div>
        ))}
      </div>
      <button
        className={'wolves-btn white-border mt-2'}
        onClick={handleBuy}
        disabled={!buttonText.e}
      >
        {buttonText.l}
      </button>
      {modal && <Approval show={true} hideCB={hideModal} />}
    </>
  );
}

export default withTranslation()(YearnQuad);
