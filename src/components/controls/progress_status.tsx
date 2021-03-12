/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './progress_status.css';

import { ReactNode, useState } from 'react';
import Ticker from 'react-ticker';

type PROGRESS_STATUS_PROPS = {
  progressCallback?: () => void;
  children?: ReactNode;
};

function ProgressStatus(props: PROGRESS_STATUS_PROPS): JSX.Element {
  const { progressCallback, children } = props;
  const [isHover, setIsHover] = useState(false);
  
  const handleMouseHover = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.preventDefault();
    setIsHover(true);
  };

  const handleMouseLeave = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.preventDefault();
    setIsHover(false);
  };

  return (
    <div
      className="progress-status-container"
      onMouseOver={handleMouseHover}
      onMouseLeave={handleMouseLeave}
    >
      <Ticker move={!isHover}>{({ index }) => <div>{children}</div>}</Ticker>
      {progressCallback ? (
        <span
          onAnimationIteration={progressCallback}
          className="progress-status-progress"
        />
      ) : (
        ''
      )}
    </div>
  );
}

export { ProgressStatus };
