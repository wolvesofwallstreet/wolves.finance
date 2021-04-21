/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import './navigation.css';

import React from 'react';
import { Link } from 'react-router-dom';

type LikeType = { href: string; name: string; active?: boolean };

type NavigationPropsTypes = {
  leftLink?: LikeType;
  rightLink?: LikeType;
  centerLinks?: LikeType[];
  centerOnly?: boolean;
  [key: string]: any;
};

const Navigation = ({
  leftLink,
  rightLink,
  centerLinks,
}: NavigationPropsTypes):
  | JSX.Element
  | React.ReactNode
  | React.ReactElement
  | any => {
  const renderLeftSide = (
    <span className="tk-vincente-lightbold font-24 w-nav-single-line wolves-orange fixed-pos">
      {leftLink && (
        <>
          &lt; <Link to={leftLink.href}> {leftLink.name} </Link>
        </>
      )}
    </span>
  );

  const renderRightSide = (
    <span className="tk-vincente-lightbold font-24 w-nav-single-line wolves-orange">
      {rightLink && (
        <>
          <Link to={rightLink.href}> {rightLink.name} </Link> &gt;
        </>
      )}
    </span>
  );

  const renderCenter = centerLinks && (
    <div className="w-nav-center tk-vincente-lightbold">
      {centerLinks?.map((link) => (
        // eslint-disable-next-line jsx-a11y/anchor-is-valid
        <Link
          key={link.href + Math.random()}
          to={link.href}
          className={
            'w-nav-section ' + (link?.active === true && ' w-nav-link-active')
          }
        >
          {link.name}
          {link?.active === true && <div className="triangle-down" />}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <div className="w-nav-container">
        {leftLink ? renderLeftSide : null}
        {renderCenter}
        {rightLink ? renderRightSide : null}
      </div>
    </>
  );
};

export default Navigation;
