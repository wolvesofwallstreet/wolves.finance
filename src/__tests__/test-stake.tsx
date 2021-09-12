/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import { render, screen } from '@testing-library/react';

// Import the withTranslation-less export
import { Stake } from '../components/stake_deprecated';

test('renders stake WOWS', () => {
  //display key value instead translation for tests
  render(<Stake {...{ t: (key: string) => key }} />);

  const titleElement = screen.getByText('stake.welcome', { exact: false });
  expect(titleElement).toBeInTheDocument();
});
