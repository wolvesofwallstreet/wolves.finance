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
import './components/pages/comman.css'
import './components/theme/navigation/navigation.css'
import './components/theme/checkbox/wolve_checkbox.css';

import UpdatePage3 from 'components/pages/update/Page3';
import UpdatePage4 from 'components/pages/update/Page4';
import Page6 from 'components/pages/update/Page6';
import Page7 from 'components/pages/update/Page7';
import Page8 from 'components/pages/update/Page8';
import Page9 from 'components/pages/update/Page9';
import Page12 from 'components/pages/update/Page12';
import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import Footer from './components/footer';
import Header from './components/header';
import Page1 from './components/page1';
import Page3 from './components/page3';
import Page4 from './components/page4';
import PageLoader from './components/pages/PageLoader';
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
              
              <Route path="/wolf_trade_floor" component={UpdatePage3} />
              <Route path="/staked_invest" component={UpdatePage4} />
              <Route path="/my_pack" component={Page6} />
              <Route path="/bois_boardrooms" component={Page7} />
              <Route path="/investment_sfts" component={Page8} />
              <Route path="/yearn_invest" component={Page9} />
              <Route path="/c_folio" component={Page12} />

              <Route path="/update/:page" component={PageLoader} />
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
