/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

import './modal.css';

import React from 'react';

type ModalProps = {
  show?: boolean;
  content: any;
  setShow: (val: boolean) => any;
  style?: { [key: string]: string | number };
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const Modal = ({ show, setShow, content, style, ...props }: ModalProps) => {
  const closeOnEscapeKeyDown = (e: any) => {
    if (e.charCode || e.keyCode === 27) {
      setShow(false);
    }
  };

  React.useEffect(() => {
    document.body.addEventListener('keydown', closeOnEscapeKeyDown);
    return () => {
      document.body.removeEventListener('keydown', closeOnEscapeKeyDown);
    };
  }, []);

  return (
    <>
      {
        <div
          className={`wolve_modal bg-blue-transparent ${
            show && 'wolve_modal_show'
          }`}
          style={style}
          {...props}
          onClick={(e) => setShow(false)}
        >
          <div
            className="wolve_modal_content"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      }
    </>
  );
};

export default Modal;

// Src: https://medium.com/tinyso/how-to-create-a-modal-component-in-react-from-basic-to-advanced-a3357a2a716a
// Example: https://codesandbox.io/s/magical-christian-qxtdm?from-embed
