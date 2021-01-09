/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './news.css';

import React, { Component, ReactNode } from 'react';
import { Carousel } from 'react-bootstrap';

class News extends Component<unknown> {
  textRef: React.RefObject<HTMLSpanElement> = React.createRef();
  clockRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: unknown) {
    super(props);
    this.handleTickEvent = this.handleTickEvent.bind(this);
  }

  componentDidMount(): void {
    window.addEventListener('PRESALE_TICKER', this.handleTickEvent);
  }

  componentWillUnmount(): void {
    window.removeEventListener('PRESALE_TICKER', this.handleTickEvent);
  }

  handleTickEvent(event: Event): void {
    const detail = (event as CustomEvent).detail;
    if (detail.time && this.clockRef.current)
      this.clockRef.current.innerHTML = detail.time;
    else if (detail.text && this.textRef.current) {
      this.textRef.current.innerHTML = detail.text;
      if (this.clockRef.current)
        this.clockRef.current.style.color = detail.isOpen ? 'lime' : 'red';
    }
  }

  render(): ReactNode {
    return (
      <div className="news-main">
        <span className="ticker-text" ref={this.textRef}>
          PRE-SALE
        </span>
        <div className="time-ticker" ref={this.clockRef} />
        <Carousel interval={null}>
          <Carousel.Item>
            <div className="slidex" />
          </Carousel.Item>
          <Carousel.Item>
            <div className="slidex" />
          </Carousel.Item>
          <Carousel.Item>
            <div className="slidex" />
          </Carousel.Item>
        </Carousel>
      </div>
    );
  }
}

export default News;
