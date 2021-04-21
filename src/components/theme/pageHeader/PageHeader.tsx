/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import React from 'react';

type PageHeaderPropsTypes = {
  logoSrc?: string;
  heading?: string | React.ReactNode;
  headingSecondry?: string;
};

const PageHeader = ({
  logoSrc,
  heading,
  headingSecondry,
}: PageHeaderPropsTypes):
  | JSX.Element
  | React.ReactNode
  | React.ReactElement
  | any => {
  return (
    <>
      {logoSrc && <img src={logoSrc} alt="Logo" width="50px" height="50px" />}
      <h2 className="tk-vincente-lightbold font-32 single-line">{heading}</h2>
      <h3 className="tk-grotesk-lightbold">{headingSecondry}</h3>
    </>
  );
};

export default PageHeader;
