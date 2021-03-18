/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */

//import {cards_zh} from '../locales/zh_CN/cards.json';
const fs = require('fs');
const cards = require('../src/locales/en_US/cards.json');

function toHex(d) {
  return ('0' + Number(d).toString(16)).slice(-2).toUpperCase();
}

if (!fs.existsSync('./generated')) {
  fs.mkdirSync('./generated');
}

cards.levels.forEach((level) =>
  level.cards.forEach((card) => {
    const lc = toHex(level.chainRef) + toHex(card.chainRef);
    const content = {
      name: card.name,
      description: card.description,
      image: card.url.replace('{res}', '500'),
      external_url:
        'https://app.wolvesofwallstreet.finance/detail?type=' +
        level.type +
        '&levelId=' +
        level.levelId +
        '&cardId=' +
        card.id,
      localization: {
        uri: './' + lc + '_{locale}.json',
        default: 'en_US',
        locales: ['en_US', 'zh_CN'],
      },
    };
    const content_zh = {
      name: card.name,
      description: card.description,
    };

    console.log(`Generating ${lc}.json`);
    fs.writeFileSync('./generated/' + lc + '.json', JSON.stringify(content), {
      encoding: 'utf8',
    });

    console.log(`Generating ${lc}_zh_CN.json`);
    fs.writeFileSync(
      './generated/' + lc + '_zh_CN.json',
      JSON.stringify(content_zh),
      { encoding: 'utf8' }
    );
  })
);
