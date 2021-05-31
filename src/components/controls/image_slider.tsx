/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './image_slider.css';

import { ethers } from 'ethers';
import { Fragment, RefObject, useEffect, useRef, useState } from 'react';

export interface IMAGE_SLIDER_CFOLIO {
  name: string;
  tokenId: ethers.BigNumber;
  disabled: boolean;
}

export interface IMAGE_SLIDER_SLIDE {
  url: string;
  cfolioItems: IMAGE_SLIDER_CFOLIO[];
  tokenId?: ethers.BigNumber;
  locked?: boolean;
}

export type IMAGE_SLIDER_INTERFACE = {
  prev: () => void;
  next: () => void;
  go: (index: number) => void;
};

type PROPS = {
  sliderId?: string;
  initCallback: (id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) => void;
  onSlideChanged?: (
    slideId: string | undefined,
    index: number,
    checked: number[]
  ) => void;
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checked, setChecked] = useState([] as number[]);
  const [displayIndex, setDisplayIndex] = useState(-1);
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);
  const [useTransition, enableTransition] = useState(false);

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

  const select = (index: number) => {
    if (index >= 0 && index < slides.length) {
      const newChecked = checked.filter((e) => e !== index);
      if (newChecked.length === checked.length) newChecked.push(index);
      setChecked(newChecked);
    }
  };

  initCallback(sliderId, { prev, next, go });

  useEffect(() => {
    if (onSlideChanged) {
      onSlideChanged(sliderId, currentIndex, checked);
    }
  }, [currentIndex, onSlideChanged, checked, sliderId]);

  useEffect(() => {
    setLeft((width - slideWidth) / 2 - currentIndex * slideWidth);
    if (!checkbox && currentIndex !== displayIndex) {
      setDisplayIndex(-1);
      setTimeout(() => setDisplayIndex(currentIndex), 250);
    }
  }, [currentIndex, displayIndex, slideWidth, width, checkbox]);

  useEffect(() => {
    enableTransition(false);
    setChecked([]);
    setDisplayIndex(-1);
    setCurrentIndex(0);
    setTimeout(() => enableTransition(true), 500);
  }, [slides]);

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
      <div
        className={`image_slide_track ${useTransition && 'trans'}`}
        style={{ left: left + 'px' }}
      >
        {slides.map((elem, index) => {
          return (
            <Fragment key={'si_' + index}>
              <div className="d-flex flex-column justify-content-center text-center p-0 m-0 p_relative">
                <div
                  className={
                    'image_slide' +
                    (checked.indexOf(index) >= 0
                      ? ' active c-pointer'
                      : index === displayIndex
                      ? ' active c-default'
                      : ' c-pointer')
                  }
                  style={{
                    width: slideWidth + 'px',
                    // ['--url' as string]: `url(${elem.url}`,
                  }}
                  onClick={() => (checkbox ? select(index) : go(index))}
                >
                  {elem.cfolioItems.length > 0 && (
                    <>
                      <div className={'slide_count'}>
                        {elem.cfolioItems.length}
                      </div>
                      <div className="slide_tooltip_wrapper">
                        <div className="slide_tooltip_content">
                          {elem.cfolioItems.map((cfi) => (
                            <p
                              key={cfi.tokenId.toHexString()}
                              className={cfi.disabled ? 'disabled' : ''}
                            >
                              {cfi.name}
                            </p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {elem.locked && <div className={'slide_locked'} />}

                  <img width="100%" height="100%" src={elem.url} alt="" />
                </div>

                <span className="p-0 m-0 font-12 image_slider_tid">
                  {elem.tokenId && elem.tokenId.mask(128).toHexString()}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { ImageSlider };
