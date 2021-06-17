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
  const [inputVal, setInputVal] = useState(0);
  const [txRunning, setTXRunning] = useState(false);

  const currencies = [
    { name: 'USDC', value: 0, decimals: 18 },
    { name: 'USDT', value: 0, decimals: 6 },
    { name: 'DAI', value: 0, decimals: 18 },
    { name: 'TUSD', value: 0, decimals: 18 },
    { name: 'YCRV', value: 0, decimals: 18 },
  ];

  const handleBuy = () => {
    const payload = {
      type: CFOLIO_ITEM_BUY,
      content: {
        wowsAmount: nftPrice,
        investAmount: [inputVal],
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

  const buttonText = txRunning
    ? { l: 'TRANSACTION PENDING ...', e: false }
    : sft
    ? isNaN(inputVal)
      ? { l: 'INPUT AMOUNT MUST BE SET', e: false }
      : tabOption === 1
      ? { l: `UNSTAKE ${inputVal.toFixed(2)} ${investCurrency}`, e: true }
      : cfolioItem
      ? { l: `STAKE ${inputVal.toFixed(2)} ${investCurrency}`, e: true }
      : {
          l:
            `BUY NFT (${nftPrice} WOWS)` +
            (inputVal > 0
              ? ` & STAKE ${inputVal.toFixed(2)} ${investCurrency}`
              : ''),
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
        {currencies[currencyIndex].value.toFixed(4)}{' '}
        {currencies[currencyIndex].name}
      </span>
      {/* Orange Horizontal Bar */}
      <AssetInput
        currency={currencies[currencyIndex].name}
        minAmount={0}
        maxAmount={0}
        cb={(n) => setInputVal(n)}
      />
      {/* Bar percentage chart, based on barDivisions */}
      <div className="yq-bar-chart">
        <div
          className="tick"
          style={{
            ['--percentage' as string]: '0%',
          }}
        >
          0%
        </div>
        <div
          className="tick"
          style={{
            ['--percentage' as string]: '25%',
          }}
        >
          25%
        </div>
        <div
          className="tick"
          style={{
            ['--percentage' as string]: '50%',
          }}
        >
          50%
        </div>
        <div
          className="tick"
          style={{
            ['--percentage' as string]: '75%',
          }}
        >
          75%
        </div>
        <div
          className="tick"
          style={{
            ['--percentage' as string]: '100%',
          }}
        >
          100%
        </div>
      </div>
      <div id="currency-container" className="tk-grotesk-lightbold">
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
            {currency.name}
            <br />
            {currency.value.toFixed(2)}
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
