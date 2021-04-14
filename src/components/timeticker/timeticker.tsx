/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './timeticker.css';

import React, { Component, ReactNode } from 'react';

type TimeTickerProps = {
  value: string;
  description: string;
  textRef: React.RefObject<HTMLSpanElement>;
  clockRef: React.RefObject<HTMLDivElement>;
};

class TimeTicker extends Component<TimeTickerProps> {
  render(): ReactNode {
    return (
      <div className="ticker-container">
        <div className="ticker-inner">
          <span
            className="tk-vincente-bold ticker-text"
            ref={this.props.textRef}
          >
            {this.props.value}
          </span>
          <br />
          <span className="ticker-description">{this.props.description}</span>
        </div>
        <div className="ticker-inner">
          <div className="time-ticker" ref={this.props.clockRef} />
        </div>
      </div>
    );
  }
}

export { TimeTicker };
