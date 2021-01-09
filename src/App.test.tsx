/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import { render, screen } from '@testing-library/react';

import Header from './components/header';

test('renders header title', () => {
  render(<Header />);
  const titleElement = screen.getByText('THE WOLVES & THE BOIS');
  expect(titleElement).toBeInTheDocument();
});
