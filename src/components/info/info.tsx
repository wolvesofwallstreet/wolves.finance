/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './info.css';

import React, { Component, ReactNode } from 'react';

import paper from '../../assets/logo_paper.png';
import plan from '../../assets/logo_plan.png';

class Info extends Component {
  render(): ReactNode {
    return (
      <div className="info-main">
        <div className="info-block m_right_10">
          <span className="info-title info-title-res">THE PAPER</span>
          <img alt="Visit Medium" src={paper} className="info-icon" />
          <a href="#medium" className="info-link">
            <b>READ MORE ON MEDIUM</b>
          </a>
        </div>
        <div className="info-block">
          <span className="info-title info-title-res">THE PLAN</span>
          <img alt="Show Roadmap" src={plan} className="info-icon" />
          <a href="#roadmap" className="info-link">
            <b>OPEN UP ROADMAP</b>
          </a>
        </div>
        <div className="info-text">
          We are creating the worlds first pre-programmed automated SFT mini
          DAO's to trade on yearn and pickle strategies to earn wolf token. We
          are creating a new usecase in the NFT space to make it more efficient
          and user friendly - you don't need to stake a NFT, the SFT is the
          stake.
          <br />
          We are bringing the use of gamification and defi boosted profit
          makeing rewards to extend and sustain investment interaction.
        </div>
      </div>
    );
  }
}

export default Info;
