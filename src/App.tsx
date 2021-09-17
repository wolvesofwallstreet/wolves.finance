/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import './App.css';
import './wolves_scheme.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './components/theme/button/wolve_button.css';
import './components/theme/form/input/wolve_input.css';

import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import CFolioInvest from './components/CFolioInvest';
import CFolioManager from './components/CFolioManager/CFolioManager';
import Footer from './components/footer';
import Header from './components/header';
import Page1 from './components/page1';
import Page3 from './components/page3';
import Page4 from './components/page4';
import { PageStatus } from './components/pageStatus';
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
            <Route component={Header} />
            <Switch>
              <Route path="/stake" component={Stake} />
              <Route
                path="/my"
                render={(props) => <Page3 {...props} display={'my'} />}
              />
              <Route path="/detail" component={Page4} />
              <Route path="/status" component={PageStatus} />
              <Route path="/cfolio-invest" component={CFolioInvest} />
              <Route path="/c_folio_manager" component={CFolioManager} />
              <Route component={Page1} />
            </Switch>
            <Footer />
          </StoreContainer>
        </BrowserRouter>
      </div>
    );
  }
}

export default App;
