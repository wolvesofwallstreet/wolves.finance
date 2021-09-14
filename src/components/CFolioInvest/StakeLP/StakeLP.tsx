/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './StakeLP.css';

import { useEffect, useState } from 'react';
import { TFunction, withTranslation } from 'react-i18next';

import {
  CFOLIO_ITEM_BUY,
  CFOLIO_ITEM_DEPOSIT,
  CFOLIO_ITEM_WITHDRAW,
  STAKE_LP_AVAILABLE,
} from '../../../stores/constants';
import {
  SFT,
  SFTCHILD,
  StatusResult,
  StoreClasses,
  TokenContractResult,
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
  beforeBuy: (successCb: () => void) => boolean;
};

function StakeLP({
  cfolioItem,
  investCurrency,
  nftPrice,
  nftType,
  sft,
  beforeBuy,
  t,
}: PROPS): JSX.Element {
  const [tabOption, setTabOption] = useState(1);
  const [investAmount, setInvestAmount] = useState(0);
  const [hasSft, setHasSft] = useState(false);
  const [inputVal, setInputVal] = useState(0);
  const [txRunning, setTXRunning] = useState(false);
  const [modal, showModal] = useState(false);

  if ((sft === undefined) === hasSft) {
    if (hasSft) setInvestAmount(0);
    else {
      StoreClasses.dispatcher.dispatch({
        type: STAKE_LP_AVAILABLE,
        content: {},
      });
    }
    setHasSft(sft !== undefined);
  }

  useEffect(() => {
    const onLpAvailable = (params: TokenContractResult) => {
      const newInvestAmount =
        params.error === undefined && params.tokenAmount !== undefined
          ? params.tokenAmount
          : 0;
      setInvestAmount(newInvestAmount);
    };
    const resetTx = (result: StatusResult) => {
      if (['success', 'error'].includes(result.status)) setTXRunning(false);
    };

    StoreClasses.emitter.on(STAKE_LP_AVAILABLE, onLpAvailable);
    StoreClasses.emitter.on(CFOLIO_ITEM_BUY, resetTx);
    StoreClasses.emitter.on(CFOLIO_ITEM_DEPOSIT, resetTx);
    StoreClasses.emitter.on(CFOLIO_ITEM_WITHDRAW, resetTx);
    //Cleanup
    return () => {
      StoreClasses.emitter.off(CFOLIO_ITEM_WITHDRAW, resetTx);
      StoreClasses.emitter.off(CFOLIO_ITEM_DEPOSIT, resetTx);
      StoreClasses.emitter.off(CFOLIO_ITEM_BUY, resetTx);
      StoreClasses.emitter.off(STAKE_LP_AVAILABLE, onLpAvailable);
    };
  }, []);

  useEffect(() => {
    setTabOption(1);
  }, [cfolioItem]);

  const renderSpan = (id: number, caption: string) => {
    return id === tabOption ? (
      <div>
        <span className="border_thin_b">{caption}</span>
      </div>
    ) : (
      <div>
        <span>{caption}</span>
      </div>
    );
  };

  const spanText = cfolioItem
    ? 'STAKE MORE'
    : sft?.isWallet
    ? 'BUY "STAKE I-NFT" INTO MY WALLET'
    : 'BUY "STAKE I-NFT" INTO MY C-FOLIO';

  const handleBuy = () => {
    if (!beforeBuy(handleBuy)) return;
    const payload = {
      type: cfolioItem
        ? tabOption === 1
          ? CFOLIO_ITEM_WITHDRAW
          : CFOLIO_ITEM_DEPOSIT
        : CFOLIO_ITEM_BUY,
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

  const curMaxAmount =
    tabOption === 0 ? investAmount : (cfolioItem && cfolioItem.assets[0]) ?? 0;

  const buttonText = txRunning
    ? { l: 'TRANSACTION PENDING ...', e: false }
    : sft
    ? isNaN(inputVal)
      ? { l: 'INPUT AMOUNT IS INVALID', e: false }
      : inputVal === 0 && cfolioItem
      ? { l: 'INPUT AMOUNT MISSING', e: false }
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

  const hideModal = () => showModal(false);

  return (
    <>
      <div
        id="cfolioInvest-control-nav"
        className="tk-vincente-lightbold font-22"
      >
        {renderSpan(0, spanText)}
        {cfolioItem && renderSpan(1, 'UNSTAKE')}
      </div>
      <div className="d-flex justify-content-between">
        <span className="d-block my-1 font-14">
          {tabOption === 0 ? ' MY WALLET: ' : ' MY NFT: '}
          {curMaxAmount.toFixed(2)} {investCurrency}
        </span>
        <span
          className="d-block my-1 font-14 c-pointer"
          onClick={() => showModal(true)}
        >
          <u>MANAGE APPROVAL</u>
        </span>
      </div>
      <AssetInput
        currency={investCurrency}
        minAmount={0}
        maxAmount={curMaxAmount}
        defaultValue={
          isNaN(inputVal) || inputVal === 0 ? '' : inputVal.toString()
        }
        cb={(n) => setInputVal(n)}
      />
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

export default withTranslation()(StakeLP);
