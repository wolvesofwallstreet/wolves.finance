/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './footer.css';

import React, { Component, ReactNode } from 'react';
import { Modal } from 'react-bootstrap';
import { TFunction, withTranslation } from 'react-i18next';

type FooterProps = {
  t: TFunction;
};

type FooterState = {
  showModal: boolean;
  policyChanged: boolean;
};

class Footer extends Component<FooterProps, FooterState> {
  privacyFile = '';
  privacyTerms = '';

  constructor(props: FooterProps) {
    super(props);
    this.state = { showModal: false, policyChanged: false };
  }

  loadTerms() {
    const { t } = this.props;
    const privacyFile = t('privacyTermsFile');

    if (privacyFile !== this.privacyFile) {
      import('../../locales/en_US/privacy_policy.json').then((text) => {
        this.privacyTerms = text.default.policy;
        this.setState({ policyChanged: !this.state.policyChanged });
      });
      this.privacyFile = privacyFile;
    }
  }

  render(): ReactNode {
    const { showModal } = this.state;
    this.loadTerms();

    return (
      <div className="footer-main">
        <p className="footer-notes tk-grotesk-lightbold">
          AS A USER OF THE WOLVES PLATFORM & WOLF TOKEN YOU BY DEFAULT ARE IN
          AGREEMENT THAT YOU DO SO AT YOUR OWN RISK.
          <br />
          ALL LIABILITY RESIDES WITH THE USER. RISK ONLY WHAT YOU ARE WILLING TO
          LOSE.
          <br />
          COPYRIGHT&copy; ALL RIGHTS RESERVED WOLVES OF WALL STREET 2021
        </p>
        <p
          className="footer-notes footer-terms tk-grotesk-lightbold"
          onClick={() => this.setState({ showModal: true })}
        >
          PRIVACY TERMS & CONDITIONS
        </p>
        <Modal
          show={showModal}
          onHide={() => this.setState({ showModal: false })}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <h1>Privacy Policy</h1>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body dangerouslySetInnerHTML={{ __html: this.privacyTerms }} />
          <Modal.Footer />
        </Modal>
      </div>
    );
  }
}

export default withTranslation()(Footer);
