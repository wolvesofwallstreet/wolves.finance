/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './image_slider.css';

import { ethers } from 'ethers';
import React, { RefObject, useEffect, useRef } from 'react';

import { SFTCHILD } from '../../stores/store';

export interface IMAGE_SLIDER_SLIDE {
  url: string;
  cfolioItems?: SFTCHILD[];
  tokenId?: ethers.BigNumber;
}

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
  checkbox?: boolean;
};

const ImageSlider = ({
  sliderId,
  initCallback,
  onSlideChanged,
  slideWidth,
  slides,
  checkbox,
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
    if (slides.length && currentIndex >= slides.length) {
      setCurrentIndex(0);
    } else {
      setLeft((width - slideWidth) / 2 - currentIndex * slideWidth);
    }
  }, [currentIndex, slideWidth, width, slides.length]);

  useEffect(() => {
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
              <div className="d-flex flex-column justify-content-center text-center p-0 m-0 p_relative">
                <div
                  className={
                    'image_slide' +
                    (checkbox
                      ? ' checkbox'
                      : index === displayIndex
                      ? ' active'
                      : '')
                  }
                  style={{
                    width: slideWidth + 'px',
                    // ['--url' as string]: `url(${elem.url}`,
                  }}
                  onClick={() => go(index)}
                >
                  {elem.cfolioItems && elem.cfolioItems.length > 0 && (
                    <div className={'slide_count'}>
                      {elem.cfolioItems.length}
                    </div>
                  )}

                  <div className="slide_tooltip_wrapper">
                    <div className="slide_tooltip_content">
                      <p>NAME OF NFT / TOKEN ID </p>
                      <p>NAME OF NFT / TOKEN ID</p>
                      <p>NAME OF NFT / TOKEN ID</p>
                    </div>
                  </div>

                  <img width="100%" height="100%" src={elem.url} alt="" />
                </div>

                <span className="p-0 m-0 font-12 image_slider_tid">
                  {elem.tokenId && elem.tokenId.mask(128).toHexString()}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { ImageSlider };
