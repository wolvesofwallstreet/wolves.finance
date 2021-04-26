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

type NAVITEM = {
  id: string;
  to: string;
  disabled: boolean;
};

class Header extends Component<HEADER_PROPS, HEADER_STATE> {
  store = StoreClasses.store;
  emitter = StoreClasses.emitter;

  constructor(props: HEADER_PROPS) {
    super(props);
    this.state = { address: '', networkName: '' };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
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

  _getNavItems(): NAVITEM[] {
    const { location, t } = this.props;
    const query = new URLSearchParams(location.search);
    const type = query.get('type');
    const levelId = query.get('levelId') || 0;

    const result = [
      { id: t('header.home'), to: '/', disabled: location.pathname === '/' },
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
        id: t('header.myPack'),
        to: '/my?type=myPack&levelId=' + levelId,
        disabled: type === 'myPack',
      },
      {
        id: t('header.stake'),
        to: '/stake',
        disabled: location.pathname === '/stake',
      }
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
          {navItems.map((item: NAVITEM, index: number) => {
            return item.disabled ? (
              <span key={index}>{item.id}</span>
            ) : (
              <Link key={index} to={item.to}>
                {item.id}
              </Link>
            );
          })}

          <span className="nav-item dropdown">
            <span
              className="nav-link dropdown-toggle "
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              UI Pages
            </span>
            <ul className="dropdown-menu bg-blue-transparent">
              <li>
                <Link className="dropdown-item" to="/update/page4">
                  Page 4
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page5">
                  Page 5
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page6">
                  Page 6
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page7">
                  Page 7
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page8">
                  Page 8
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page9">
                  Page 9
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page11">
                  Page 11
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page12">
                  Page 12
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page13">
                  Page 13
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page14">
                  Page 14
                </Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/update/page15">
                  Page 15
                </Link>
              </li>
            </ul>
          </span>
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
