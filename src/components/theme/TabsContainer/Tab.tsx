/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/*
    Credit https://gist.github.com/diegocasmo/5cd978e9c5695aefca0c6a8a19fa4c69 for original
    js files, edited by Robert McDonnell to convert to typescript
*/

import React from 'react';

type PROPS = {
  onClick?: (index: any) => void;
  tabIndex?: number | string;
  isActive?: boolean | unknown;
  linkClassName: string | React.ReactNode;
  [key: string]: any;
  // iconClassName: string | unknown;
};

function Tab({
  onClick = function (tIndex) {
    return;
  },
  tabIndex = '',
  isActive = '',
  linkClassName = '', // iconClassName = '',
}: PROPS) {
  return (
    <li className="tab">
      <a
        role="button"
        className={`tk-vincente tab-link ${linkClassName} ${
          isActive ? 'active' : ''
        }`}
        onClick={(event) => {
          event.preventDefault();
          onClick(tabIndex);
        }}
      >
        {linkClassName}
        {/* <i className={`tab-icon ${iconClassName}`} /> */}
      </a>
    </li>
  );
}
export default Tab;
