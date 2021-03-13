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
    const pathItems = location.pathname.split('/').filter((e) => e.length > 0);
    const result = [
      { id: t('header.home'), to: '/', disabled: pathItems.length === 0 },
    ];
    if (pathItems.length === 1) {
      if (pathItems[0] === 'detail') {
        const query = new URLSearchParams(location.search);
        result.push({
          id: t('header.shop'),
          to:
            '/shop?type=' +
            query.get('type') +
            '&levelId=' +
            query.get('levelId'),
          disabled: false,
        });
        result.push({ id: t('header.detail'), to: '', disabled: true });
      } else result.push({ id: t('header.shop'), to: '', disabled: true });
    }
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
