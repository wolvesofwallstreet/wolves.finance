/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './cardbox.css';

import { TFunction } from 'i18next';
import { RefObject, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { BIGNUMBER_MAX, SFT, SFTCHILD, StoreClasses } from '../../stores/store';

type CARDBOX_PROPS = {
  sft?: SFT;
  cfolio?: SFTCHILD;
  earned: number;
  t: TFunction;
  progressRefs?: RefObject<HTMLSpanElement>[];
};

export function CardBox(props: CARDBOX_PROPS): JSX.Element {
  const { cfolio, earned, progressRefs, sft, t } = props;
  const assets = StoreClasses.store.getAssets();
  const progressRef: RefObject<HTMLSpanElement> = useRef(null);

  useEffect(() => {
    progressRefs?.push(progressRef);
    return () => {
      progressRefs?.splice(progressRefs.indexOf(progressRef), 1);
    };
  }, [progressRefs]);

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
    cardId = card.id;
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

  const renderCFolioItems = () => {
    if (sft && sft.cfolioItems.length > 0) {
      const topOffset =
        sft.cfolioItems.length > 1
          ? Math.min((314 - 82) / (sft.cfolioItems.length - 1), 86)
          : 0;
      return (
        <div id="cfi-image">
          {sft.cfolioItems.map((sftc, index) => {
            const cfi = assets.cfolioItems[sftc.levelId].cards[sftc.cardId];
            return (
              <img
                key={'cfi' + index}
                id="cfi-image"
                style={{ top: 6 + index * topOffset + 'px' }}
                height="80px"
                alt={cfi.name}
                src={cfi.url.replace('{res}', '300')}
              />
            );
          })}
        </div>
      );
    }
  };

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
        {renderCFolioItems()}
      </Link>
      <div className="wrapper">
        <span id="triangle-up" />
        {tokenId !== undefined && (
          <span className="tk-vincente-lightbold font-28">
            {`TOKEN ID: 0x${tokenId
              .mask(128)
              .toHexString()
              .substr(2)
              .padStart(8, '0')}`}
          </span>
        )}
        <span className="tk-grotesk-lightbold font-14 ellipsis">
          {t('page.motto')}: {motto}
        </span>
        <span className="bg-orange my-2">
          <span
            className="progress"
            ref={sft && sft.cfolioItems.length > 0 ? progressRef : undefined}
          ></span>
        </span>
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
              {t('page.earned')}: {earned.toFixed(6)} WOWS
            </span>
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
