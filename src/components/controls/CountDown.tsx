import './countDown.css';

import React from 'react';
import Countdown from 'react-countdown';
const renderer = ({
  hours,
  minutes,
  seconds,
}: {
  hours: number;
  minutes: number;
  seconds: number;
}) => {
  const secondsFormatted = seconds.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });

  const minutesFormatted = minutes.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });

  const hoursFormatted = hours.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });

  return (
    <span>
      {hoursFormatted}h:{minutesFormatted}m:{secondsFormatted}s
    </span>
  );
};

const CountDown: React.FC<{ cardName: string }> = ({
  cardName,
}: {
  cardName: string;
}) => {
  const dappDate = new Date(1616432400 * 1000);

  return (
    <button className="wolves-btn buy-btn font-12" disabled={true}>
      BUY {cardName} in : <Countdown date={dappDate} renderer={renderer} />
    </button>
  );
};

export default CountDown;
