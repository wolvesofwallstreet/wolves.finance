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
import './components/pages/comman.css';
import './components/theme/checkbox/wolve_checkbox.css';

import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import Footer from './components/footer';
import Header from './components/header';
import Page1 from './components/page1';
import Page3 from './components/page3';
import Page4 from './components/page4';
import Page5 from './components/page5';
// import Page6 from './components/pages/examplePage/page6';
import Page7 from './components/pages/oldPages/page7';
import Page8 from './components/pages/oldPages/page8';
import Page9 from './components/pages/oldPages/Page9';
import Page10 from './components/pages/oldPages/Page10';
import Page11 from './components/pages/oldPages/Page11';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import PageLoader from './components/pages/PageLoader';
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
              <Route path="/page5" component={Page5} />
              {/*<Route path="/page6" component={Page6}/>*/}
              <Route path="/page7" component={Page7} />
              <Route path="/page8" component={Page8} />
              <Route path="/page9" component={Page9} />
              <Route path="/page10" component={Page10} />
              <Route path="/page11" component={Page11} />
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
