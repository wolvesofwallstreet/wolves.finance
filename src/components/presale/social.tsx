/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React, { Component, ReactNode } from 'react';

import discord from '../../assets/icons_discord.svg';
import etherscan from '../../assets/icons_etherscan.svg';
import github from '../../assets/icons_github.svg';
import telegram from '../../assets/icons_TG.svg';
import twitter from '../../assets/icons_Twitter.svg';

class Social extends Component {
  render(): ReactNode {
    return (
      <div className="social-menu">
        <p>
          <a
            className="social-menu-btn"
            target="_blank"
            rel="noreferrer"
            href="https://twitter.com/WolvesWallst"
          >
            <img src={twitter} alt="Twitter" width="24px" height="24px" />
          </a>
        </p>
        <p>
          <a
            className="social-menu-btn"
            target="_blank"
            rel="noreferrer"
            href="https://etherscan.io/address/0x672EF7E4Fe230B5cA1466C5fDD40588d30FdF90a"
          >
            <img src={etherscan} alt="Etherscan" width="24px" height="24px" />
          </a>
        </p>
        <p>
          <a
            className="social-menu-btn"
            target="_blank"
            rel="noreferrer"
            href="https://github.com/wolvesofwallstreet"
          >
            <img src={github} alt="Github" width="24px" height="24px" />
          </a>
        </p>
        <p>
          <a
            className="social-menu-btn"
            target="_blank"
            rel="noreferrer"
            href="https://discord.gg/CCqZtze8kg"
          >
            <img src={discord} alt="Discord" width="24px" height="24px" />
          </a>
        </p>
        <p>
          <a
            className="social-menu-btn"
            target="_blank"
            rel="noreferrer"
            href="https://t.me/wolveswallstreet"
          >
            <img src={telegram} alt="Telegram" width="24px" height="24px" />
          </a>
        </p>
      </div>
    );
  }
}

export default Social;
