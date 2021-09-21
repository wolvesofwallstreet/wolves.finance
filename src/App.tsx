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
import CFolioItemSfts from './components/CFolioItemSfts';
import CFolioManager from './components/CFolioManager/CFolioManager';
import Footer from './components/footer';
import Header from './components/header';
import Page1 from './components/page1';
import Page3 from './components/page3';
import Page4 from './components/page4';
import { PageStatus } from './components/pageStatus';
import WolfToast from './components/toast/wolftoast';
import { CONNECTION_CHANGED } from './stores/constants';
import { ConnectResult, StoreClasses, StoreContainer } from './stores/store';

type APP_STATE = {
  isSideChain: boolean;
};

class App extends React.Component<unknown, APP_STATE> {
  constructor(props: unknown) {
    super(props);
    this.state = { isSideChain: false };
  }

  componentDidMount(): void {
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.setNetwork);
  }

  componentWillUnmount(): void {
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.setNetwork);
  }

  setNetwork = (result: ConnectResult): void => {
    if (result.type === 'prod' && result.address !== '') {
      this.setState({ isSideChain: StoreClasses.store.isSidechain() });
    }
  };

  render(): JSX.Element {
    return (
      <div className="App">
        <BrowserRouter>
          <StoreContainer>
            <WolfToast />
            <Route component={Header} />
            <Switch>
              {!this.state.isSideChain && (
                <Route
                  path="/shop"
                  render={(props) => <Page3 {...props} display={'shop'} />}
                />
              )}
              <Route
                path="/my"
                render={(props) => <Page3 {...props} display={'my'} />}
              />
              <Route path="/detail" component={Page4} />
              <Route path="/status" component={PageStatus} />
              <Route path="/cfolio-sfts" component={CFolioItemSfts} />
              <Route path="/cfolio-invest" component={CFolioInvest} />
              {this.state.isSideChain && (
                <Route path="/c_folio_manager" component={CFolioManager} />
              )}
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
