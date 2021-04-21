/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import { withTranslation } from 'react-i18next';

import PageContainer from '../../theme/pageContainer/PageContainer';

function ExamplePage() {
  return (
    <>
      <PageContainer bgClass="bg-wolves">
        <>
          <div className="content-wrapper-container">
            <div className="content-wrapper-image">
              <video
                className="content-wrapper-image-inner"
                autoPlay
                loop
                src="https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-500.mp4"
                poster="https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-500.mp4.jpg"
                playsInline
              />
            </div>

            <div className="content-wrapper-details">
              <h1 className="tk-vincente-bold font-48 ">GORGAN DECKO</h1>
              <h2 className="tk-vincente-lightbold font-24">
                <span className="wolves-orange">MOTO:</span> BUY WHEN THERE IS
                BLOOD ON THE STREET
              </h2>
              <span className="tk-grotesk-lightbold font-20 line-break-enable">
                Wall Street Hustler - He’s worked his way up from the actual
                street. Learning the hustle on the street has given him the
                perfect grounding for working the trade floor. Forget rough
                diamond this trader is a blood diamond, and isnt afraid to step
                on toes and ears to make the deals he needs. This is a staker
                card and allows to stake Wolf on the tradefloor and also Raid.
                You can sell this character licence at any point wither on our
                platform or on opensea
              </span>
              <ul className="tk-vincente-bold font-24 rarity-box">
                <li>
                  <h2>RARITY: 1/120</h2>
                </li>
                <li>
                  <h2>PROFIT SHARING: 55%% </h2>
                </li>
                <li>
                  <h2>RAIDABILITY: 50%</h2>
                </li>
                <li>
                  <h2 className="text-uppercase">Auto upgrade 2 months</h2>
                </li>
              </ul>
              <div>
                <button className="page5-btn-stack">STAKE WITH MAX FANG</button>
              </div>
            </div>
          </div>
        </>
      </PageContainer>
    </>
  );
}

export default withTranslation()(ExamplePage);
