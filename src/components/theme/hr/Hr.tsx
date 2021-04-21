/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import React from 'react';

type HrProps = {
  styles?: {
    [key: string]: string | number | boolean;
  };
  [key: string]: any;
};

const hrStyles = {
  width: '100%',
  border: 0,
  // borderTop: '1.7px solid var(--wolves-orange)',
  borderTop: '1.7px solid #dd987a',
  margin:0,
  padding:0
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const Hr = ({ styles }: HrProps) => <hr style={{ ...hrStyles, ...styles }} />;

export default Hr;
