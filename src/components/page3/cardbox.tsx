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

import { BIGNUMBER_MAX, SFT, SFTCHILD, StoreClasses } from '../../stores/store';

type CARDBOX_PROPS = {
  sft?: SFT;
  cfolio?: SFTCHILD;
  t: TFunction;
};

export function CardBox(props: CARDBOX_PROPS): JSX.Element {
  const { cfolio, sft, t } = props;
  const assets = StoreClasses.store.getAssets();

  let name,
    motto,
    levelId,
    type,
    tokenId,
    cardId,
    cardType,
    url,
    quantity,
    price,
    minted,
    prowess,
    locked;
  if (sft) {
    const level = assets.cards.cards[sft.levelId];
    const card = level.cards[sft.cardId];
    name = card.name;
    motto = card.motto;
    levelId = level.levelId;
    tokenId = sft.tokenId !== BIGNUMBER_MAX ? sft.tokenId : undefined;
    type = tokenId ? 'myPack' : level.type;
    cardId = sft.cardId;
    cardType = card.type;
    url = card.url;
    quantity = level.quantity;
    minted = card.minted;
    price = level.price;
    prowess = sft.rewardRate;
    locked = sft.locked;
  } else if (cfolio) {
    const level = assets.cfolioItems[cfolio.levelId];
    const card = level.cards[cfolio.cardId];
    name = card.name;
    motto = card.motto;
    levelId = 4;
    type = 'myPack';
    tokenId = cfolio.tokenId;
    cardId = cfolio.cardId;
    cardType = 'image';
    url = card.url;
    quantity = card.maxMintable;
    minted = card.minted;
    price = card.price;
    prowess = 0;
    locked = cfolio.locked;
  } else return <></>;

  return (
    <div className="card-container">
      <span className="tk-vincente-lightbold font-32">{name}</span>
      <Link
        className="p_relative"
        to={
          '/detail?type=' +
          type +
          '&levelId=' +
          levelId +
          '&cardId=' +
          cardId +
          (tokenId !== undefined ? '&tokenId=' + tokenId : '')
        }
      >
        {cardType === 'movie' ? (
          <video
            disableRemotePlayback={true}
            className="card-visual"
            autoPlay={true}
            loop={true}
            src={url?.replace('{res}', '300')}
            poster={url?.replace('{res}', '300') + '.jpg'}
            playsInline
          />
        ) : (
          <img
            className="card-visual"
            src={url?.replace('{res}', '300')}
            alt={name}
          />
        )}
        {locked && <div className={'locked'} />}
      </Link>
      <div className="wrapper">
        <span id="triangle-up" />
        {tokenId !== undefined && (
          <span className="tk-vincente-lightbold font-28">
            {`TOKEN ID: 0x${tokenId.toNumber().toString(16).padStart(8, '0')}`}
          </span>
        )}
        <span className="tk-grotesk-lightbold font-14 ellipsis">
          {t('page.motto')}: {motto}
        </span>
        <hr className="wolves" />
        {tokenId === undefined ? (
          <>
            <span className="tk-grotesk-lightbold font-14 ellipsis">
              {t('page.available')}: {quantity - minted}/{quantity}
            </span>
            <span className="tk-grotesk-lightbold font-14 ellipsis line-h">
              {t('page.price')}: {price} WOWS{' '}
            </span>
          </>
        ) : sft ? (
          <>
            <span className="tk-grotesk-lightbold font-14 ellipsis">
              {t('page.prowess')}: {prowess / 10000}%
            </span>
            <span className="tk-grotesk-lightbold font-14 ellipsis">
              {t('page.earned')}: [TODO] WOWS
            </span>
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
