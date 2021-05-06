/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */

import './wolveCard.css';

import React from 'react';
import { Link } from 'react-router-dom';

// type LikeType = { href: string; name: string; active?: boolean };

type ReactNodeType = JSX.Element | React.ReactNode | React.ReactElement | any;

type NavigationPropsTypes = {
  title?: string;

  titleSecondary?: string;
  titleBottom?: string;
  description?: string;

  cardLink: string;
  src?: string;

  bottomContent?: ReactNodeType;

  alt?: string;
  linkType?: 'image' | 'video';

  [key: string]: any;
};

const WolveCard = ({
  titleSecondary,
  title,
  titleBottom,
  description,
  cardLink,
  src,
  alt,
  bottomContent,
  linkType = 'image',
  media_className,
}: NavigationPropsTypes): ReactNodeType => {
  return (
    <>
      <div className="wolve-card-container">
        {title && (
          <span className="tk-vincente-lightbold font-32">{title}</span>
        )}

        <span>
          <Link to={cardLink}>
            {linkType === 'image' && (
              <img
                className={`media-container ${media_className}`}
                /*style={{width:'100%'}}*/ src={src}
                alt={alt}
              />
            )}

            {linkType === 'video' && (
              <video
                playsInline
                className={`img-fluid ${media_className}`}
                disableRemotePlayback={true}
                autoPlay={true}
                loop={true}
                src={src}
                poster={src + '.jpg'}
              />
            )}
          </Link>
        </span>

        <div className="wolve-card-bottom-wrapper">
          {bottomContent || (
            <>
              <span
                className="tk-vincente-lightbold font-32 mt-3"
                style={{ lineHeight: 0.8 }}
              >
                {titleSecondary}
              </span>
              <span className="tk-grotesk-lightbold font-14 ellipsis">
                {description}
              </span>

              {titleBottom && (
                <>
                  {/* <Hr /> */}
                  <h2 className="tk-vincente-lightbold ellipsis">
                    {titleBottom}
                  </h2>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default WolveCard;
