/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-unused-expressions: "off" */

import chai from 'chai';

import { hardhat } from '../utils/hardhat';

describe('hardhat', function () {
  it('should be imported without error', async function () {
    chai.expect(hardhat).to.not.be.undefined;
  });
});
