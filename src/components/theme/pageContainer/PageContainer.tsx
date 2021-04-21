/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { ReactChild, ReactChildren } from 'react';
import { TFunction, withTranslation } from 'react-i18next';

type bgClassType = 'bg-wolves' | 'bg-bois' | 'bg-myPack';

type PageContainerProps = {
  t: TFunction;
  children: ReactChild | ReactChildren  | any /*| ReactChild[] | ReactChildren[] */;
  bgClass: bgClassType;
};

function PageContainer({ bgClass, t, children }: PageContainerProps) {
  return (
    <>
      <div className={'wolves-container ' + bgClass}>
        {children}
      </div>
    </>
  );
}

export default withTranslation()(PageContainer);

