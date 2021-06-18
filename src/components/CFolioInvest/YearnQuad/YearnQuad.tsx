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

import { CFOLIO_ITEM_BUY } from '../../../stores/constants';
import {
  SFT,
  SFTCHILD,
  StatusResult,
  StoreClasses,
} from '../../../stores/store';
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

  const cmap = [2, 3, 4, 5, 6]; // maps from internal to asset index

  const handleBuy = () => {
    const payload = {
      type: CFOLIO_ITEM_BUY,
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

  useEffect(() => {
    const resetTx = (result: StatusResult) => {
      if (['success', 'error'].includes(result.status)) setTXRunning(false);
    };

    StoreClasses.emitter.on(CFOLIO_ITEM_BUY, resetTx);
    //Cleanup
    return () => {
      StoreClasses.emitter.off(CFOLIO_ITEM_BUY, resetTx);
    };
  }, []);

  useEffect(() => {
    setTabOption(0);
  }, [cfolioItem]);

  useEffect(() => {
    if (tabOption) setCurrencyIndex(4);
    setCheckedIndex(-1);
  }, [tabOption]);

  const validCurrencies = () => {
    if (tabOption === 1)
      return isNaN(inputVals[4])
        ? undefined
        : inputVals[4] <= 0
        ? []
        : [balances[cmap[4]].name];
    else if (inputVals.find((v) => isNaN(v)) !== undefined) return undefined;
    else
      return cmap
        .filter((_, index) => inputVals[index] > 0)
        .map((cm) => balances[cm].name);
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
              ? ` AND RECEIVE ${balances[cmap[checkedIndex]].name}`
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

  return (
    <>
      <div
        id="cfolioInvest-control-nav"
        className="tk-vincente-lightbold font-22"
      >
        {renderSpan(0, spanText)}
        {cfolioItem && renderSpan(1, 'WITHDRAW')}
      </div>
      <span className="mt-1 font-14">
        AVAILABLE IN{tabOption === 0 ? ' MY WALLET: ' : ' MY NFT: '}
        {balances[cmap[currencyIndex]].value.toFixed(4)}{' '}
        {balances[cmap[currencyIndex]].name}
      </span>
      {/* Orange Horizontal Bar */}
      <AssetInput
        currency={balances[cmap[currencyIndex]].name}
        defaultValue={
          isNaN(inputVals[currencyIndex])
            ? ''
            : inputVals[currencyIndex].toString()
        }
        minAmount={0}
        maxAmount={balances[cmap[currencyIndex]].value}
        cb={(n) => setCurrentValue(n)}
      />
      <div id="currency-container" className="tk-grotesk-lightbold mt-3">
        {cmap.map((currency, index) => (
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
            {balances[currency].name}
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
    </>
  );
}

export default withTranslation()(YearnQuad);
