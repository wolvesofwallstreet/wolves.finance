import React from 'react';
import Countdown from 'react-countdown';

const renderer = ({
  hours,
  minutes,
  seconds,
  days,
}: {
  hours: number;
  minutes: number;
  seconds: number;
  days: number;
}) => {
  const secondsFormatted = seconds.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });

  const minutesFormatted = minutes.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });

  const hoursFormatted =
    days > 0
      ? hours + 24
      : hours.toLocaleString('en-US', {
          minimumIntegerDigits: 2,
          useGrouping: false,
        });

  return (
    <span>
      {hoursFormatted}h:{minutesFormatted}m:{secondsFormatted}s
    </span>
  );
};

const CountDown: React.FC<{ source?: string }> = ({
  source,
}: {
  source?: string;
}) => {
  const dappDate = new Date(1616432400 * 1000);

  return source === 'page4' ? (
    <button className="wolves-btn buy-btn" disabled={true}>
      BUY WOWS SFT in : <Countdown date={dappDate} renderer={renderer} />
    </button>
  ) : (
    <Countdown date={dappDate} renderer={renderer} />
  );
};

export default CountDown;
