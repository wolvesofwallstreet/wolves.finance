/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './image_slider.css';

import React, { RefObject, useEffect, useRef } from 'react';

export type IMAGE_SLIDER_SLIDE = {
  url: string;
};

export type IMAGE_SLIDER_INTERFACE = {
  prev: () => void;
  next: () => void;
  go: (index: number) => void;
};

type PROPS = {
  sliderId?: string;
  initCallback: (id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) => void;
  onSlideChanged?: (index: number) => void;
  slideWidth: number;
  slides: IMAGE_SLIDER_SLIDE[];
};

const ImageSlider = ({
  sliderId,
  initCallback,
  onSlideChanged,
  slideWidth,
  slides,
}: PROPS): JSX.Element => {
  const containerRef: RefObject<HTMLDivElement> = useRef(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [displayIndex, setDisplayIndex] = React.useState(0);
  const [left, setLeft] = React.useState(0);
  const [width, setWidth] = React.useState(0);

  const prev = () => {
    if (currentIndex === 0) {
      return setCurrentIndex(slides.length - 1);
    }
    slides.length > 0 && setCurrentIndex(currentIndex - 1);
  };

  const next = () => {
    if (currentIndex + 1 === slides.length) {
      return setCurrentIndex(0);
    }
    slides.length > currentIndex + 1 && setCurrentIndex(currentIndex + 1);
  };

  const go = (index: number) =>
    index >= 0 && index < slides.length && setCurrentIndex(index);

  initCallback(sliderId, { prev, next, go });

  useEffect(() => {
    setLeft((width - slideWidth) / 2 - currentIndex * slideWidth);
  }, [currentIndex, slideWidth, width]);

  useEffect(() => {
    // if (onSlideChanged) onSlideChanged(currentIndex);
    if (onSlideChanged) {
      if (displayIndex !== currentIndex) {
        setDisplayIndex(-1);
        setTimeout(() => setDisplayIndex(currentIndex), 250);
      }
      onSlideChanged(currentIndex);
    }
  }, [currentIndex, displayIndex, onSlideChanged]);

  useEffect(() => {
    if (containerRef.current) setWidth(containerRef.current.clientWidth);

    const resizeListener = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    // set resize listener
    window.addEventListener('resize', resizeListener);

    // clean up function
    return () => {
      // remove resize listener
      window.removeEventListener('resize', resizeListener);
    };
  }, []);

  return (
    <div className="image_slide_container" ref={containerRef}>
      <div className="image_slide_track" style={{ left: left + 'px' }}>
        {slides.map((elem, index) => {
          return (
            <React.Fragment key={'si_' + index}>
              <div
                className={
                  // 'image_slide' + (index === currentIndex ? ' active' : '')
                  'image_slide' + (index === displayIndex ? ' active' : '')
                }
                style={{
                  width: slideWidth + 'px',
                  // ['--url' as string]: `url(${elem.url}`,
                }}
                onClick={() => go(index)}
              >
                <div className={'slide_count'}>{index}</div>
                <img width="100%" height="100%" src={elem.url} alt="" />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { ImageSlider };
