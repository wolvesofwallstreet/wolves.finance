/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './header.css';

import React, { Component, ReactNode } from 'react';
import { Form, Image, Navbar } from 'react-bootstrap';
import { TFunction, withTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import logo from '../../assets/wolves_sft_logo.svg';
import { ASSETS_STATE, CONNECTION_CHANGED } from '../../stores/constants';
import {
  AssetStateresult,
  ConnectResult,
  StoreClasses,
} from '../../stores/store';

interface HEADER_PROPS {
  location: Location;
  t: TFunction;
}

interface HEADER_STATE {
  address: string;
  networkName: string;
  wowsPrice?: number;
  wowsAmount?: number;
}

type DropDownItem = {
  id: string;
  to: string;
};

type NAVITEM = {
  id: string;
  to: string;
  disabled: boolean;
  dropdown?: boolean;
  dropdownItems?: DropDownItem[];
};

class Header extends Component<HEADER_PROPS, HEADER_STATE> {
  store = StoreClasses.store;
  emitter = StoreClasses.emitter;

  constructor(props: HEADER_PROPS) {
    super(props);
    this.state = { address: '', networkName: '', wowsAmount: 0 };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onAssetsState = this.onAssetsState.bind(this);
    this.renderDropDown = this.renderDropDown.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.on(ASSETS_STATE, this.onAssetsState);
  }

  componentWillUnmount(): void {
    this.emitter.off(ASSETS_STATE, this.onAssetsState);
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') this.setState(params);
  }

  onAssetsState(status: AssetStateresult): void {
    if (status.status === 'rewards') {
      const wowsPrice = StoreClasses.store.getAssets().rewardInfo[0].priceWOWS;
      this.setState({
        wowsPrice: wowsPrice > 0 ? wowsPrice : undefined,
      });
    }
    if (status.status === 'balances') {
      this.setState({
        wowsAmount: StoreClasses.store.getAssets().balances['WOWS'].value,
      });
    }
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    if (this.store.isConnected()) {
      this.store.disconnect(true);
    } else {
      this.store.connect();
    }
    event.preventDefault();
  }

  _shortAddress(): string {
    const { address, networkName } = this.state;
    return address !== ''
      ? address.substring(0, 6) +
          '...' +
          address.substring(address.length - 4, address.length) +
          ' (' +
          networkName +
          ')'
      : 'CONNECT WALLET';
  }

  renderDropDown(title: string, dropdownItems: DropDownItem[]): ReactNode {
    const { pathname, search } = this.props.location;

    return (
      <span className="nav-item dropdown mx-0 my-0" key={Math.random() + title}>
        <span
          className="nav-link dropdown-toggle text-white navbar-text"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          {title}
        </span>
        <ul className="dropdown-menu bg-blue-transparent-dark translateY_-10">
          {dropdownItems.map((item, index) => {
            const isActiveNav = pathname + search === item.to;
            return (
              <li key={'navLink' + index}>
                {isActiveNav && (
                  <span className="dropdown-item active"> {item.id} </span>
                )}
                {!isActiveNav && (
                  <Link className="dropdown-item" to={item.to}>
                    {item.id}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </span>
    );
  }

  _getNavItems(): NAVITEM[] {
    const { location, t } = this.props;
    const query = new URLSearchParams(location.search);
    const type = query.get('type');
    const levelId = query.get('levelId') || 0;
    const result = StoreClasses.store.isSidechain()
      ? [
          {
            id: 'WOLF TRADE FLOOR',
            to: '/wolf_trade_floor-1',
            disabled: location.pathname === '/wolf_trade_floor',
            dropdownItems: [
              {
                id: t('header.buyStake'),
                to: '/cfolio-sfts?type=lpInvestment',
              },
              {
                id: t('header.stakeInvest'),
                to: '/cfolio-invest?type=lpInvestment',
              },
            ],
          },
          {
            id: 'BOIS BOARDROOMS',
            to: '/wolf_trade_floor-1',
            disabled: location.pathname === '/wolf_trade_floor',
            dropdownItems: [
              {
                id: t('header.buyYearn'),
                to: '/cfolio-sfts?type=stableInvestment',
              },
              {
                id: t('header.yearnInvest'),
                to: '/cfolio-invest?type=stableInvestment',
              },
            ],
          },
          {
            id: t('header.myPack'),
            to: '/my?type=myPack&levelId=' + levelId,
            disabled: location.pathname === '/my',
          },
          {
            id: 'C-FOLIO MANAGER',
            to: '/c_folio_manager',
            disabled: location.pathname === '/c_folio_manager',
          },
        ]
      : [
          {
            id: 'WOLF TRADE FLOOR',
            to: '/wolf_trade_floor-1',
            disabled: location.pathname === '/wolf_trade_floor',
            dropdownItems: [
              {
                id: t('header.wolvesCf'),
                to: '/shop?type=wolves&levelId=' + levelId,
                disabled: type === 'wolves',
              },
            ],
          },
          {
            id: 'BOIS BOARDROOMS',
            to: '/wolf_trade_floor-1',
            disabled: location.pathname === '/wolf_trade_floor',
            dropdownItems: [
              {
                id: t('header.boisCf'),
                to: '/shop?type=bois&levelId=' + levelId,
                disabled: type === 'bois',
              },
            ],
          },
          {
            id: t('header.myPack'),
            to: '/my?type=myPack&levelId=' + levelId,
            disabled: location.pathname === '/my',
          },
        ];
    return result;
  }

  render(): ReactNode {
    const shortAddress = this._shortAddress();
    const navItems = this._getNavItems();
    return (
      <Navbar bg="wolf" variant="dark" expand="md">
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Brand className="navbar-brand mr-auto" as={Link} to="/">
          <Image src={logo} width="300" className="logo" />
        </Navbar.Brand>
        <Navbar.Collapse id="basic-navbar-nav">
          {navItems.map((navItem: NAVITEM, index: number) => {
            // render Dropdown items
            if ('dropdownItems' in navItem && navItem.dropdownItems) {
              return this.renderDropDown(
                navItem.id,
                navItem?.dropdownItems as DropDownItem[]
              );
            }

            // Active nav item
            if (navItem.disabled) {
              return <span key={index}>{navItem.id}</span>;
            }

            // nav item
            return (
              <Link key={index} to={navItem.to}>
                {navItem.id}
              </Link>
            );
          })}
        </Navbar.Collapse>

        <div className="dp-conn-container">
          <Form onSubmit={this.handleSubmit}>
            <input
              className="wolves-btn dp-conn-btn"
              type="submit"
              value={shortAddress}
            />
          </Form>
          {this.state.wowsPrice !== undefined && (
            <span className="dp-conn-price">
              1 WOWS &asymp; ${this.state.wowsPrice.toFixed(0)}
            </span>
          )}
          <br />
          {this.state.wowsAmount !== undefined && (
            <span className="dp-conn-price">
              My WOWS: {this.state.wowsAmount.toFixed(2)}
            </span>
          )}
        </div>
      </Navbar>
    );
  }

  scrollSection(section: string): void {
    section = '';
  }
}

export default withTranslation()(Header);
