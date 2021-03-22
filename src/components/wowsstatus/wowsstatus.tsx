/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './wowsstatus.css';

import { Component, ReactNode } from 'react';

import CountDown from '../controls/CountDown';
import { ProgressStatus } from '../controls/progress_status';

class WowsStatus extends Component {
  render(): ReactNode {
    return (
      <ProgressStatus route="home">
        <CountDown />
      </ProgressStatus>
    );
  }
}

export default WowsStatus;
