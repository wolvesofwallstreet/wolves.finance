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
import './components/theme/navigation/navigation.css'
import './components/theme/checkbox/wolve_checkbox.css';
import './components/theme/comman.css';

import BoisBoardroomsPage7 from 'components/pages/BoisBoardroomsPage7';
import BoisBoardroomsPage9 from 'components/pages/BoisBoardroomsPage9';
import CFolioManagerPage12 from 'components/pages/CFolioManagerPage12';
import InvestmentSftsPage8 from 'components/pages/InvestmentSftsPage8';
import MyPackPage6 from 'components/pages/MyPackPage6';
import TradeFloorPage3 from 'components/pages/TradeFloorPage3';
import TradeFloorPage4 from 'components/pages/TradeFloorPage4';
import React from 'react';
import {BrowserRouter, Route, Switch} from 'react-router-dom';

import Footer from './components/footer';
import Header from './components/header';
import Page1 from './components/page1';
import Page3 from './components/page3';
import Page4 from './components/page4';
import PageLoader from './components/pages/PageLoader';
import Stake from './components/stake';
import WolfToast from './components/toast/wolftoast';
import {StoreContainer} from './stores/store';

class App extends React.Component {
  render(): JSX.Element {
    return (
      <div className="App">
        <BrowserRouter>
          <StoreContainer>
            <WolfToast/>
            <Route component={Header}/>
            <Switch>
              <Route path="/stake" component={Stake}/>
              <Route
                path="/shop"
                render={(props) => <Page3 {...props} display={'shop'}/>}
              />
              <Route
                path="/my"
                render={(props) => <Page3 {...props} display={'my'}/>}
              />
              <Route path="/detail" component={Page4}/>

              <Route path="/wolf_trade_floor" component={TradeFloorPage3}/>
              <Route path="/staked_invest" component={TradeFloorPage4}/>
              <Route path="/my_pack" component={MyPackPage6}/>
              <Route path="/bois_boardrooms" component={BoisBoardroomsPage7}/>
              <Route path="/investment_sfts" component={InvestmentSftsPage8}/>
              <Route path="/yearn_invest" component={BoisBoardroomsPage9}/>
              <Route path="/c_folio" component={CFolioManagerPage12}/>

              {
                process.env.NODE_ENV === 'development' &&
                <Route path="/dev/:page" component={PageLoader}/>
              }

              <Route component={Page1}/>
            </Switch>
            <Footer/>
          </StoreContainer>
        </BrowserRouter>
      </div>
    );
  }
}

export default App;
