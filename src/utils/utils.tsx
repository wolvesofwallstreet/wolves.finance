/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

export function remainingFromSecs(secondsLeft: number): string {
  if (secondsLeft < 0) return '0d:0h:0m:0s';

  const secInMinute = 60;
  const secInHour = secInMinute * 60;
  const secInDay = secInHour * 24;

  const days = Math.floor(secondsLeft / secInDay)
    .toString()
    .padStart(2, '0');
  const hours = Math.floor((secondsLeft % secInDay) / secInHour)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((secondsLeft % secInHour) / secInMinute)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(secondsLeft % secInMinute)
    .toString()
    .padStart(2, '0');

  return (
    days +
    'd:' +
    hours +
    'h:' +
    minutes +
    'm' +
    (days === '00' ? ':' + seconds + 's' : '')
  );
}
