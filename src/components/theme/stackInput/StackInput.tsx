/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './StakeInput.css';

import { Component, createRef, ReactNode } from 'react';
import { TFunction, withTranslation } from 'react-i18next';

type STAKEPROPS = {
  t: TFunction;
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

class StakeInput extends Component<STAKEPROPS, STAKESTATE> {
  inputRef: React.RefObject<HTMLInputElement> = createRef();

  constructor(props: STAKEPROPS) {
    super(props);
    this.state = INITIALSTATE;
    this.handleOnChange = this.handleOnChange.bind(this);
  }

  // componentDidMount(): void {
  // }

  // componentWillUnmount(): void {
  // }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace(',', '.');
    const newState = parseFloat(event.target.value) > 0;
    if (newState !== this.state.inputValid)
      this.setState({ inputValid: newState });
  }

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
    // const { t, inputValid} = this.props;
    // const { maxVisible } = this.state;

    return (
      <div className="p_relative temp">
        <input
          type="text"
          autoComplete="off"
          className="wolve_input text-white font-14 pr-5" /* invalid */
          onFocus={() => this.setState({ maxVisible: false })}
          onChange={this.handleOnChange}
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
        <div className="wolve_input_label font-14">WOWS/ETH LP</div>
      </div>
    );
  }
}

export default withTranslation()(StakeInput);
