/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import './mediaCard.css';

import React from 'react';

type MediaCardProps = {
  src: string;
  alt?: string;
  linkType?: 'image' | 'video';
  style?: { [key: string]: string | number | boolean };
  [key: string]: any;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const MediaCard = ({
  src,
  alt = 'card Img',
  linkType = 'image',
  style,
  ...props
}: MediaCardProps) => (
  <>
    {linkType === 'image' && (
      <img className="" src={src} alt={alt} {...props} />
    )}
    {linkType === 'video' && (
      <video
        playsInline
        className=""
        disableRemotePlayback={true}
        autoPlay={true}
        loop={true}
        src={src}
        poster={src + '.jpg'}
        {...props}
      />
    )}
  </>
);

export default MediaCard;
