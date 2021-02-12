/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import { render, screen } from '@testing-library/react';

// Import the withTranslation-less export
import { Presale } from '../components/presale';

test('renders presale WOLF', () => {
  //display key value instead translation for tests
  render(<Presale t={(key: string) => key} />);

  const titleElement = screen.getByText('presale.purchase', { exact: false });
  expect(titleElement).toBeInTheDocument();
});
