/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './page1.css';

import { TFunction, withTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import BoisLogo from '../../assets/bois_shadow.png';
import WolvesLogo from '../../assets/wolves_shadow.png';
import WowsStatus from '../wowsstatus';

type PAGE1_PROPS = {
  t: TFunction;
};

function Page1(props: PAGE1_PROPS) {
  const { t } = props;
  return (
    <div className="page1-container">
      <div className="page1-title-box">
        <WowsStatus />
        <div className="page1-title-box-text">
          <h2 className="tk-vincente-bold no-margin">{t('page1.head1')}</h2>
          <h3 className="tk-aktiv-grotesk-condensed">{t('page1.head2')}</h3>
        </div>
      </div>
      {/************** Left ************/}
      <div className="page1-bg page1-left">
        <span className="page1-line-v" />
        <div className="page1-content-box-top">
          <h2 className="tk-vincente-bold no-margin">{t('page1.wolves1')}</h2>
          <h1 className="tk-vincente-bold">{t('page1.wolves2')}</h1>
        </div>
        <div className="page1-img-box">
          <span className="page1-line-h" />
          <span className="page1-dot" />
          <Link to="/shop?type=wolves">
            <img src={WolvesLogo} width="200px" alt="Wolves" />
          </Link>
        </div>
        <div className="page1-content-box-bottom">
          <h2 className="tk-vincente-bold no-margin">{t('page1.wolves3')}</h2>
          <h3 className="tk-aktiv-grotesk-condensed">
            {t('page1.wolves4')}
            <br />
            {t('page1.click')}
          </h3>
        </div>
      </div>
      {/************** Right ************/}
      <div className="page1-bg page1-right">
        <div className="page1-content-box-top">
          <h2 className="tk-vincente-bold no-margin">{t('page1.bois1')}</h2>
          <h1 className="tk-vincente-bold">{t('page1.bois2')}</h1>
        </div>
        <div className="page1-img-box">
          <Link to="/shop?type=bois">
            <img src={BoisLogo} width="200px" alt="Wolves" />
          </Link>
        </div>
        <div className="page1-content-box-bottom">
          <h2 className="tk-vincente-bold no-margin">{t('page1.bois3')}</h2>
          <h3 className="tk-aktiv-grotesk-condensed">
            {t('page1.bois4')}
            <br />
            {t('page1.click')}
          </h3>
        </div>
      </div>
    </div>
  );
}

export default withTranslation()(Page1);
