/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './progress_status.css';

import { ReactNode } from 'react';

type PROGRESS_STATUS_PROPS = {
  progressCallback?: () => void;
  children?: ReactNode;
};

function ProgressStatus(props: PROGRESS_STATUS_PROPS): JSX.Element {
  const { progressCallback, children } = props;

  return (
    <div className="progress-status-container">
      {children}
      {progressCallback ? <span onAnimationIteration={progressCallback} /> : ''}
    </div>
  );
}

export { ProgressStatus };
