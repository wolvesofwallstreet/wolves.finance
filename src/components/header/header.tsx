/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './header.css';

import React, { Component, ReactNode } from 'react';
import { Image, Nav, Navbar } from 'react-bootstrap';

import logo from '../../assets/logo_banner.png';
import Social from './social';

class Header extends Component {
  render(): ReactNode {
    return (
      <Navbar bg="wolf" variant="dark" expand="lg">
        <Social />
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto">
            <Nav.Link onClick={() => this.scrollSection('home')}>
              THE WOLVES & THE BOIS
            </Nav.Link>
            <Nav.Link onClick={() => this.scrollSection('inno')}>
              THE INNOVATIONS OF THIS PROJECT
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
        <Navbar.Brand className="navbar-brand mx-auto" href="#home">
          <Image src={logo} className="logo" />
        </Navbar.Brand>
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto">
            <Nav.Link onClick={() => this.scrollSection('paper')}>
              THE PAPER
            </Nav.Link>
            <Nav.Link onClick={() => this.scrollSection('plan')}>
              THE PLAN
            </Nav.Link>
            <Nav.Link onClick={() => this.scrollSection('presale')}>
              THE PRESALE
            </Nav.Link>
            <Nav.Link onClick={() => this.scrollSection('team')}>
              THE TEAM
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
  scrollSection(section: string): void {
    section = '';
  }
}

export default Header;
