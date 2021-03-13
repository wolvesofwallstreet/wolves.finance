/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './wowsstatus.css';

import { Component, ReactNode } from 'react';

import { ProgressStatus } from '../controls/progress_status';

class WowsStatus extends Component {
  render(): ReactNode {
    return (
      <ProgressStatus>
        <span className="ticker-text">WOWS CURRENT PRICE: $34.45</span>
        <span className="ticker-text">CIRCULATING MC: $450,000</span>
      </ProgressStatus>
    );
  }
}

export default WowsStatus;
