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

import { CFOLIO_ITEM_BUY, STAKE_LP_AVAILABLE } from '../../../stores/constants';
import {
  SFT,
  SFTCHILD,
  StoreClasses,
  TokenContractResult,
} from '../../../stores/store';
import AssetInput from '../../controls/asset_input';

type PROPS = {
  t: TFunction;
  nftPrice: number;
  investCurrency: string;
  cfolioItem?: SFTCHILD;
  sft?: SFT;
};

function StakeLP({
  cfolioItem,
  investCurrency,
  nftPrice,
  sft,
  t,
}: PROPS): JSX.Element {
  const [tabOption, setTabOption] = useState(0);
  const [investAmount, setInvestAmount] = useState(0);
  const [hasSft, setHasSft] = useState(false);
  const [inputVal, setInputVal] = useState(0);

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

    StoreClasses.emitter.on(STAKE_LP_AVAILABLE, onLpAvailable);
    //Cleanup
    return () => {
      StoreClasses.emitter.off(STAKE_LP_AVAILABLE, onLpAvailable);
    };
  }, []);

  useEffect(() => {
    setTabOption(0);
  }, [cfolioItem]);

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
    ? 'STAKE MORE'
    : sft?.isWallet
    ? 'ADD "STAKE INVESTMENT NFT" INTO MY WALLET'
    : 'ADD "STAKE INVESTMENT NFT" INTO MY CFOLIO';

  const handleBuy = () => {
    const payload = {
      type: CFOLIO_ITEM_BUY,
      content: {
        wowsAmount: 0.5,
        investAmount: [0],
        sftTokenId: sft?.id,
        cfolioType: 0,
      },
    };
    StoreClasses.dispatcher.dispatch(payload);
  };

  const curMaxAmount =
    tabOption === 0 ? investAmount : (cfolioItem && cfolioItem.assets[0]) ?? 0;

  const buttonText = sft
    ? isNaN(inputVal)
      ? 'AMOUNT IS INVALID!'
      : tabOption === 1
      ? `UNSTAKE ${inputVal.toFixed(2)} ${investCurrency}`
      : cfolioItem
      ? `STAKE ${inputVal.toFixed(2)} ${investCurrency}`
      : `BUY NFT (${nftPrice} WOWS)` +
        (inputVal > 0
          ? ` & STAKE ${inputVal.toFixed(2)} ${investCurrency}`
          : '')
    : 'INITIALIZING ACCOUNT!';

  return (
    <>
      <div
        id="cfolioInvest-control-nav"
        className="tk-vincente-lightbold font-22"
      >
        {renderSpan(0, spanText)}
        {cfolioItem && renderSpan(1, 'UNSTAKE')}
      </div>
      <span className="mt-1 font-13">
        AVAILABLE IN{tabOption === 0 ? ' MY WALLET: ' : ' MY NFT: '}
        {curMaxAmount.toFixed(4)} {investCurrency}
      </span>
      <AssetInput
        currency={investCurrency}
        minAmount={cfolioItem ? 0.0000000001 : 0}
        maxAmount={curMaxAmount}
        cb={(n) => setInputVal(n)}
      />
      <span className="d-block left mt-1 font-13">
        <a
          target="_blank"
          rel="noreferrer"
          href={
            'https://app.uniswap.org/#/add/v2/ETH/' +
            StoreClasses.store._getTokenContractAddress()
          }
        >
          GET UNIV2 WOWS/ETH LP TOKENS HERE
        </a>
      </span>

      <button
        className={
          'wolve_btn stake-lp-text-input stake-lp-btn-stack mt-3 m-0 font-10'
        }
        onClick={handleBuy}
        disabled={buttonText.endsWith('!')}
      >
        {buttonText}
      </button>
    </>
  );
}

export default withTranslation()(StakeLP);
