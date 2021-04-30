/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import { TFunction, withTranslation } from 'react-i18next';
import { Link, RouteComponentProps } from 'react-router-dom';

import WOLFD_APP_DEVS_FLAT231_300 from '../../../assets/wolfd_app_devs_flat2_136_300.jpg';
import HorizontalLine from '../../theme/line/HorizontalLine';
import PageHeader from '../../theme/pageHeader/PageHeader';
import WolveCard from '../../theme/wolveCard/WolveCard';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

function Page14({ t }: PROPS) {
  return (
    <>
      <div className={'w-container bg-wolves text-white'}>
        <div className="">
          <div>
            <PageHeader
              logoSrc="/static/media/logo.ac917530.png"
              heading="WELCOME TO YOUR PACK"
              headingSecondry="YOUR PACK FOR BOIS, WOLVES, UPGRADES AND LP NFTs"
            />
          </div>

          <div className="w-75 center-container">
            <div
              className={
                'd-flex flex-column flex-md-row justify-content-center bg-blue-transparent font-14 py-2 px-3 my-2 mt-3 '
              }
            >
              <span className={'lpipe  m-1 mr-1'}> Earned: 2.000000 WOWS,</span>
              <span className={'lpipe  m-1 mr-1'}> 10.34 $</span>
              <span className={'lpipe  m-1 mr-1'}> 12 DAI = $303.00 TOTAL</span>
            </div>

            <div className={'d-grid text-left mb-4'}>
              {[1].map((card, i) => {
                return (
                  <div
                    className="px-4 py-3 bg-blue-transparent"
                    key={i + Math.random()}
                  >
                    <div
                      className={
                        'd-flex flex-lg-row flex-md-row  flex-xs-column justify-content-between flex-wrap '
                      }
                    >
                      <div
                        className={'d-flex flex-column justify-content-between'}
                      >
                        <div className="">
                          <h3 className={'tk-vincente-bold h-2'}>
                            BOIS LOS ANGELES DAI
                          </h3>
                          <div
                            // className={'d-flex'}
                            className={
                              'd-flex flex-column flex-lg-row flex-sm-column flex-md-column flex-xs-column'
                            }
                          >
                            <span
                              className={'h-5 f-light single-line mt-2 mr-5'}
                            >
                              LPToken: 0.00
                            </span>
                            <span
                              className={'h-5 f-light single-line mt-2 mr-5'}
                            >
                              Staked: 0.00
                            </span>
                            <span className={'h-5 f-light single-line mt-2 '}>
                              Earned: 0.000000 WOWS
                            </span>
                          </div>
                        </div>
                        <div className={'pt-2 f-light h-5 '}>
                          <span className="pr-2 "> APY*: 394.45% </span>
                          <span className="pr-2 nowrap"> APR: 162.31% </span>
                        </div>
                      </div>
                      <div className="">
                        <img
                          className={'responsive-img'}
                          src={
                            'https://4travelers.de/wolves_assets/cards/bois/level2/BRYANT-300.mp4.jpg'
                          }
                          alt={'card img'}
                          style={{ maxWidth: '160px', width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <HorizontalLine />

          <div className="w-nav-container">
            <div className="w-nav-center tk-vincente-lightbold">
              <Link className="w-nav-section mx-4 " to="?item=PRODIGY">
                PRODIGY
              </Link>
              <Link
                className="w-nav-section mx-4 w-nav-link-active"
                to="?item=PHENOM"
              >
                PHENOM <div className="triangle-down"></div>
              </Link>
              <Link className="w-nav-section mx-4 " to="?item=NFTs">
                NFTs
              </Link>
            </div>
          </div>

          <div className="wolve-cards-container">
            {[1, 2].map((_, i) => {
              return (
                <WolveCard
                  key={i + Math.random()}
                  cardLink={'?item=three' + i}
                  linkType="image"
                  src={WOLFD_APP_DEVS_FLAT231_300}
                  bottomContent={
                    <>
                      <span
                        className="tk-vincente-lightbold font-32 m-0 mt-2 line-h"
                        style={{ lineHeight: 0.8 }}
                      >
                        MINT NFT
                      </span>
                      <span className="tk-grotesk-lightbold font-14 ellipsis">
                        MOTTO: FILL IT OR KILL IT
                      </span>
                      <hr className="wolves" />
                      <span className="f-vincente font-32 m-0 line-h ellipsis">
                        1/100
                      </span>
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default withTranslation()(Page14);
