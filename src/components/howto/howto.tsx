/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './howto.css';

import React, { Component, ReactNode } from 'react';

import howto from '../../assets/howto.png';
import howto_mobile from '../../assets/howto_mobile.png';

class HowTo extends Component {
  render(): ReactNode {
    return (
      <div className="howto-container">
        <picture>
          <source media="(max-width: 800px)" srcSet={howto_mobile} />
          <img alt="" src={howto} className="howto-img" />
        </picture>
      </div>
    );
  }
}

export default HowTo;
