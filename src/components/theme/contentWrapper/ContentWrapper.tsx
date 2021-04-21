/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */

import './contentWrapper.css';

import React from 'react';

type ContentWrapperProps = {
  src?: string;
  children: React.ReactChild | React.ReactChildren | any;
  mediaType?: 'image' | 'video';
  [key: string]: any;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const ContentWrapper = ({
                          src,
                          children,
                          alt = 'card Img',
                          mediaType = 'image',
                          ...props
                        }: ContentWrapperProps) => (
  <>
    <div className="content-wrapper-container" {...props}>
      {src && (
        <div className="content-wrapper-image">
          {mediaType === 'image' && (
            <img className="content-wrapper-image-inner" src={src} alt={alt}/>
          )}
          {mediaType === 'video' && (
            <video
              playsInline
              className="content-wrapper-image-inner"
              disableRemotePlayback={true}
              autoPlay={true}
              loop={true}
              src={src}
              poster={src + '.jpg'}
            />
          )}
        </div>
      )}
      <div className="content-wrapper-details">{children}</div>
    </div>
  </>
);

export default ContentWrapper;
