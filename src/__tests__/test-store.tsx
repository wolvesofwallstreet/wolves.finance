/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 *
 * @jest-environment jsdom
 */

import TestUtils from 'react-dom/test-utils';

import { Header } from '../components/header';
import { StoreContainer } from '../stores/store';

jest.useRealTimers();

test('renders mint SFT', async () => {
  const rendered = TestUtils.renderIntoDocument(
    <StoreContainer>
      <Header />
    </StoreContainer>
  );

  const connectForm = TestUtils.findRenderedDOMComponentWithTag(
    rendered,
    'form'
  );
  TestUtils.Simulate.submit(connectForm);

  // Wait a bit for connection to network
  await new Promise((res) => setTimeout(res, 2 * 1000));

  rendered.componentWillUnmount();
});
