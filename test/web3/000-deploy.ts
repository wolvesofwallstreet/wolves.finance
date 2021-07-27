/*
 * Copyright (C) 2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import { hardhat } from '../utils/hardhat';

// Fixture setup
const setupTest = hardhat.deployments.createFixture(async ({ deployments }) => {
  // Ensure we start from a fresh deployment
  await deployments.fixture();
});

describe('Contract deployment', function () {
  it('should deploy contracts', async function () {
    this.timeout(60 * 1000);

    await setupTest();
  });
});
