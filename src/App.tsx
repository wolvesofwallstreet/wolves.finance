/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import Footer from './components/footer';
import { Header } from './components/header';
import Presale from './components/presale';
import Stake from './components/stake';
import WolfToast from './components/toast/wolftoast';
import { StoreContainer } from './stores/store';

class App extends React.Component {
  render(): JSX.Element {
    return (
      <div className="App">
        <BrowserRouter>
          <StoreContainer>
            <WolfToast />
            <Header />
            <Switch>
              <Route path="/stake" component={Stake} />
              <Route component={Presale} />
            </Switch>
            <Footer />
          </StoreContainer>
        </BrowserRouter>
      </div>
    );
  }
}

export default App;
