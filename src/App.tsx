/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import React from 'react';

import Header from './components/header/header';
import HowTo from './components/howto/howto';
import Info from './components/info/info';
import News from './components/news/news';
import Presale from './components/presale/presale';
import { StoreContainer } from './dapp/stores/store';

class App extends React.Component {
  render(): JSX.Element {
    return (
      <div className="App">
        <StoreContainer>
          <Header />
          <News />
          <HowTo />
          <Info />
          <Presale />
        </StoreContainer>
      </div>
    );
  }
}

export default App;
