/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './cardbox.css';

import { TFunction } from 'i18next';
import { Link } from 'react-router-dom';

import { CARD } from '../types/cards';

type CARDBOX_PROPS = {
  content: CARD;
  levelId: number;
  quantity: number;
  price: number;
  t: TFunction;
  type: string;
};

export function CardBox(props: CARDBOX_PROPS): JSX.Element {
  const { content, levelId, price, quantity, t, type } = props;
  return (
    <div className="card-container">
      <Link
        to={
          '/detail?type=' +
          type +
          '&levelId=' +
          levelId +
          '&cardId=' +
          content.id
        }
      >
        {content.type === 'movie' ? (
          <video
            disableRemotePlayback={true}
            className="card-visual"
            autoPlay={true}
            loop={true}
          >
            <source
              src={content.url.replace('{res}', '300')}
              type="video/mp4"
            />
          </video>
        ) : (
          <img
            className="card-visual"
            src={content.url.replace('{res}', '300')}
            alt={content.name}
          />
        )}
      </Link>
      <span id="triangle-up" />
      <span className="tk-vincente-lightbold font-32">{content.name}</span>
      <span className="tk-grotesk-lightbold font-14 ellipsis">
        {t('page.motto')}: {content.motto}
      </span>
      <hr className="wolves" />
      <span className="tk-vincente-lightbold font-24">
        {t('page.available')}: {quantity}/{quantity}
      </span>
      <span className="tk-vincente-lightbold font-24 line-h">
        {t('page.price')}: {content.price} WOWS
      </span>
    </div>
  );
}
