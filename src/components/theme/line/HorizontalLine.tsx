/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import './horizontalLine.css';

import React from 'react';

type HorizontalLineProps = {
  startDot?: boolean;
  endDot?: boolean;
  style?: { [key: string]: string | number };
};

function HorizontalLine({
                          startDot = true,
                          endDot = true,
                          style,
                        }: HorizontalLineProps):
  | JSX.Element
  | React.ReactNode
  | React.ReactElement
  | any {
  return (
    <>
      <span className="h-line-container" style={style}>
        {startDot && <span id="left" className="dot"/>}
        <span className="line"/>
        {endDot && <span id="right" className="dot"/>}
      </span>
    </>
  );
}

export default HorizontalLine;
