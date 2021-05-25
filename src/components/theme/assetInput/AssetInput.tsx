/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './AssetInput.css';

import { Component, createRef, ReactNode } from 'react';
import { TFunction, withTranslation } from 'react-i18next';

type STAKEPROPS = {
  t: TFunction;
  onChangeHanlde?: () => void;
  onSubmitHanlde?: () => void;
  buttonLabel?: string;
  description?: string;
  inputValid?: number;
  investCurrency?: number | string | null;
  assetType?: unknown;
};

type STAKESTATE = {
  inputValid: boolean;
  maxVisible: boolean;
  lpToken: number;
};

const INITIALSTATE: STAKESTATE = {
  inputValid: false,
  maxVisible: true,
  lpToken: 0,
};

class AssetInput extends Component<STAKEPROPS, STAKESTATE> {
  inputRef: React.RefObject<HTMLInputElement> = createRef();

  constructor(props: STAKEPROPS) {
    super(props);
    this.state = INITIALSTATE;
    // this.handleOnChange = this.handleOnChange.bind(this);
    console.log('AssetInput.tsx::[43] this.props', this.props);
  }

  // componentDidMount(): void {
  // }

  // componentWillUnmount(): void {
  // }

  // handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
  //   event.target.value = event.target.value
  //     .replace(/[^0-9,.]/gi, '')
  //     .replace(',', '.');
  //   const newState = parseFloat(event.target.value) > 0;
  //   if (newState !== this.state.inputValid)
  //     this.setState({ inputValid: newState });
  // }

  _setMax(): void {
    if (this.inputRef.current)
      this.inputRef.current.value = this.state.lpToken.toString();
    if (this.state.maxVisible) this.setState({ maxVisible: false });

    // Validate Input
    const newState = this.state.lpToken > 0;
    if (newState !== this.state.inputValid)
      this.setState({ inputValid: newState });
  }

  render(): ReactNode {
    const {
      onSubmitHanlde,
      onChangeHanlde,
      description,
      investCurrency,
      buttonLabel /* , inputValid */,
    } = this.props;
    // const { maxVisible } = this.state;

    return (
      <>
        <div className="p_relative temp">
          <input
            type="text"
            autoComplete="off"
            className="wolve_input text-white font-14 pr-5" /* invalid */
            onFocus={() => this.setState({ maxVisible: false })}
            onChange={onChangeHanlde}
            onBlur={() =>
              this.setState({
                maxVisible: this.inputRef.current?.value === '',
              })
            }
            ref={this.inputRef}
          />
          {/* <div
            className="wolve_input_max"
            onClick={() => this._setMax()}
            hidden={!maxVisible}
          >
            max
          </div> */}
          {investCurrency && (
            <div className="wolve_input_label font-14"> {investCurrency}</div>
          )}
        </div>

        {description && (
          <div className="d-flex justify-content-end mt-1 font-13">
            {description}
          </div>
        )}

        <button
          className={
            'wolve_btn cfolioInvest-text-input mt-3 m-0 cfolioInvest-btn-stack font-10'
          }
          onClick={() => onSubmitHanlde && onSubmitHanlde()}
        >
          {buttonLabel}
        </button>
      </>
    );
  }
}

export default withTranslation()(AssetInput);
