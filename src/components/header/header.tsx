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
import { CONNECTION_CHANGED } from '../../stores/constants';
import { ConnectResult, StoreClasses } from '../../stores/store';

interface HEADER_PROPS {
  location: Location;
  t: TFunction;
}

interface HEADER_STATE {
  address: string;
  networkName: string;
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
    this.state = { address: '', networkName: '' };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.renderDropDown = this.renderDropDown.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  componentWillUnmount(): void {
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') this.setState(params);
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
          '(' +
          networkName +
          ')'
      : 'CONNECT WALLET';
  }

  renderDropDown(title: string, dropdownItems: DropDownItem[]): ReactNode {
    return (
      <span className="nav-item dropdown mx-0 my-0" key={Math.random() + title}>
        <span
          className="nav-link dropdown-toggle text-white"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          {title}
        </span>
        <ul className="dropdown-menu bg-blue-transparent-dark">
          {dropdownItems.map((item, index) => (
            <li key={Math.random() + index}>
              <Link className="dropdown-item" to={item.to}>
                {item.id}
              </Link>
            </li>
          ))}
        </ul>
      </span>
    );
  }

  _getNavItems(): NAVITEM[] {
    const { location, t } = this.props;
    const query = new URLSearchParams(location.search);
    const type = query.get('type');
    const levelId = query.get('levelId') || 0;
    const result = [
      {
        id: t('header.home'),
        to: '/',
        disabled: location.pathname === '/',
      },
      {
        id: t('header.wolvesCf'),
        to: '/shop?type=wolves&levelId=' + levelId,
        disabled: type === 'wolves',
      },
      {
        id: t('header.boisCf'),
        to: '/shop?type=bois&levelId=' + levelId,
        disabled: type === 'bois',
      },
      {
        id: 'WOLF TRADE FLOOR',
        to: '/wolf_trade_floor-1',
        disabled: location.pathname === '/wolf_trade_floor',
        dropdownItems: [
          {
            id: 'WOLF TRADE FLOOR',
            to: '/wolf_trade_floor',
          },
          {
            id: 'STAKED INVEST',
            to: '/staked-invest',
          },
        ],
      },
      {
        id: t('header.myPack'),
        to: '/my?type=myPack&levelId=' + levelId,
        disabled: type === 'myPack',
      },
      {
        id: 'Page5',
        to: 'page5-mypack',
        disabled: type === '/page5-mypack',
      },
      {
        id: t('header.stake'),
        to: '/stake',
        disabled: location.pathname === '/stake',
      },
    ];
    return result;
  }

  render(): ReactNode {
    const shortAddress = this._shortAddress();
    const navItems = this._getNavItems();
    return (
      <Navbar bg="wolf" variant="dark" expand="lg">
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

        <Form className="dp-conn-form" onSubmit={this.handleSubmit} inline>
          <input
            className="wolves-btn dp-conn-btn"
            type="submit"
            value={shortAddress}
          />
        </Form>
      </Navbar>
    );
  }

  scrollSection(section: string): void {
    section = '';
  }
}

export default withTranslation()(Header);
