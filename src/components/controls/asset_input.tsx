/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './asset_input.css';

import { useEffect, useRef, useState } from 'react';

type PROPS = {
  currency: string;
  maxAmount: number;
};

function AssetInput({ currency, maxAmount }: PROPS): JSX.Element {
  const [maxVisible, setMaxVisible] = useState(true);
  const [inputValid, setInputValid] = useState(false);
  const inputRef: React.RefObject<HTMLInputElement> = useRef(null);

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace(',', '.');
    const newState = parseFloat(event.target.value) > 0;
    if (newState !== inputValid) setInputValid(newState);
  };

  const setMax = () => {
    if (inputRef.current) inputRef.current.value = maxAmount.toString();
    if (maxVisible) setMaxVisible(false);
    // Validate Input
    const newState = maxAmount > 0;
    if (newState !== inputValid) setInputValid(newState);
  };

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== '')
      inputRef.current.value = maxAmount.toString();
  }, [maxAmount]);

  return (
    <div className="asset-input-container opaque">
      <input
        type="text"
        autoComplete="off"
        className="asset-input"
        onFocus={() => setMaxVisible(false)}
        onBlur={() => setMaxVisible(inputRef.current?.value === '')}
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
