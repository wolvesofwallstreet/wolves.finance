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

import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import Footer from './components/footer';
import Header from './components/header';
import Page1 from './components/page1';
import Page3 from './components/page3';
import Page3TradeFloor from './components/page3TradeFloor';
import Page4 from './components/page4';
import Page4StakedInvest from './components/Page4StakedInvest';
import Page5 from './components/page5';
import Page7BoisBoardrooms from './components/page7';
import Page8InvestmentSfts from './components/page8InvestmentSfts';
import Page9BoisBoardrooms from './components/Page9BoisBoardrooms';
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
                path="/shop"
                render={(props) => <Page3 {...props} display={'shop'} />}
              />
              <Route
                path="/my"
                render={(props) => <Page3 {...props} display={'my'} />}
              />
              <Route path="/detail" component={Page4} />
              <Route path="/status" component={PageStatus} />

              <Route path="/wolf_trade_floor" component={Page3TradeFloor} />
              <Route path="/staked-invest" component={Page4StakedInvest} />
              <Route path="/page5-mypack" component={Page5} />
              <Route path="/bois_boardrooms" component={Page7BoisBoardrooms} />
              <Route
                path="/yearn_investment_sfts"
                component={Page8InvestmentSfts}
              />
              <Route path="/yearn_invest" component={Page9BoisBoardrooms} />
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
