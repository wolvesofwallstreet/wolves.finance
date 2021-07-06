/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './asset_input.css';

import { useCallback, useEffect, useRef, useState } from 'react';

type PROPS = {
  currency: string;
  defaultValue?: string;
  minAmount: number;
  maxAmount: number;
  cb?: (n: number) => void;
};

function AssetInput({
  cb,
  currency,
  defaultValue,
  maxAmount,
  minAmount,
}: PROPS): JSX.Element {
  const [hasFocus, setHasFocus] = useState(false);
  const [amountChanged, setAmountChanged] = useState(false);
  const inputRef: React.RefObject<HTMLInputElement> = useRef(null);

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace(',', '.');
    verifyAndCb();
  };

  const setMax = () => {
    if (inputRef.current) inputRef.current.value = maxAmount.toString();
    setAmountChanged(true);
  };

  const verifyAndCb = useCallback(() => {
    if (cb && inputRef.current) {
      const num =
        minAmount === 0 && inputRef.current.value === ''
          ? 0
          : parseFloat(inputRef.current.value);
      cb(num < minAmount || num > maxAmount ? NaN : num);
    }
  }, [cb, minAmount, maxAmount]);

  useEffect(() => {
    if (inputRef.current && !hasFocus) {
      inputRef.current.value = defaultValue ?? '';
      setAmountChanged(true);
    }
  }, [hasFocus, maxAmount, defaultValue]);

  useEffect(() => {
    if (defaultValue && inputRef.current) {
      if (minAmount === 0 && parseInt(defaultValue) === 0)
        inputRef.current.value = '';
      else inputRef.current.value = defaultValue;
      setAmountChanged(true);
    }
  }, [defaultValue, minAmount]);

  useEffect(() => {
    if (amountChanged) {
      setAmountChanged(false);
      verifyAndCb();
    }
  }, [amountChanged, verifyAndCb]);

  const maxVisible = inputRef.current
    ? !hasFocus && inputRef.current.value === ''
    : true;

  return (
    <div className="asset-input-container opaque">
      <input
        type="text"
        autoComplete="off"
        className="asset-input"
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        onChange={handleOnChange}
        ref={inputRef}
      />
      <div
        className="asset-input-max"
        onClick={() => setMax()}
        hidden={!maxVisible}
      >
        max
      </div>
      <div className="asset-input-currency">{currency}</div>
    </div>
  );
}

export default AssetInput;
