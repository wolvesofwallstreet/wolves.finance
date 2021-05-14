/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './Page4StakedInvest.css';

import { BigNumber } from 'ethers';
import React, { createRef } from 'react';
import { TFunction, withTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';

import {
  ADD_SFT_TO_CFOLIO,
  ASSETS_LOADED,
  CONNECTION_CHANGED,
  SFT_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  SFTStateresult,
  StatusResult,
  StoreClasses,
} from '../../stores/store';
import {
  IMAGE_SLIDER_INTERFACE,
  IMAGE_SLIDER_SLIDE,
  ImageSlider,
} from '../controls/image_slider';
import { CARDS } from '../types/cards';

type PROPS = {
  t: TFunction;
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
};

interface IWolvesCards {
  id: string;
  chainRef: number;
  minted: number;
  constraint: string;
  name: string;
  motto: string;
  description: string;
  type: string;
  url: string;
}

type ObjType = { [key: string]: string };
type QueryType = 'wolves' | 'bois' | 'myPack';
type STATE = {
  input1: string;
  input2: string;
  currentImage: number;
  slideIndex: number;
  imgSlides?: ObjType[];
  cardId: string | number;
  cardDetails: IWolvesCards | ObjType | undefined;
  isWalletConnected: boolean;
  type: QueryType | string;
  txPending: boolean;
  inputValid: boolean;
  buyInput: number;
  [key: string]: unknown;
};

type IMAGE = { tokenId: number; level: number; index: number };

// Page 4 Stake Invest

class Page4StakedInvest extends React.Component<PROPS, STATE> {
  inputRef: React.RefObject<HTMLInputElement> = createRef();
  receiverImages: IMAGE[] = [];
  investImages = [
    'https://4travelers.de/wolves_assets/cards/wolves/level1/AXEL-500.jpg',
    'https://4travelers.de/wolves_assets/cards/wolves/level2/GORGAN-500.mp4.jpg',
  ];
  content: CARDS | undefined = undefined;
  sliderInterface: IMAGE_SLIDER_INTERFACE | undefined = undefined;

  constructor(props: PROPS) {
    super(props);
    this.state = {
      input1: 'ETH 2300',
      input2: 'ETH 2300',
      currentImage: 0,
      slideIndex: 0,
      imgSlides: [],
      slidesToShow: 5,
      cardId: '',
      cardDetails: undefined,
      isWalletConnected: false,
      type: 'wolves',
      txPending: false,
      inputValid: false,
      buyInput: 0,
    };
    this.onSFTState = this.onSFTState.bind(this);
    this._updateImages = this._updateImages.bind(this);
    this.onAddSFTToCFolio = this.onAddSFTToCFolio.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
  }

  setInput1(val: string) {
    this.setState({ input1: val });
  }

  setInput2(val: string) {
    this.setState({ input2: val });
  }

  setCurrentImage(val: number) {
    this.setState({ currentImage: val });
  }

  componentDidMount() {
    const { location } = this.props;
    const query = new URLSearchParams(location.search);
    const cardId = query.get('cardId') || 0;
    const type = query.get('type') || 'wolves';
    this.setState({ cardId, type }, () => {
      this._getCardDetails();
    });
    this.setState({ isWalletConnected: StoreClasses.store.isConnected() });
    StoreClasses.emitter.on(ASSETS_LOADED, this._updateImages);
    StoreClasses.emitter.on(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.on(ADD_SFT_TO_CFOLIO, this.onAddSFTToCFolio);
    StoreClasses.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    this._updateImages();
  }

  componentWillUnmount() {
    StoreClasses.emitter.off(SFT_STATE, this.onSFTState);
    StoreClasses.emitter.off(ASSETS_LOADED, this._updateImages);
    StoreClasses.emitter.off(ADD_SFT_TO_CFOLIO, this.onAddSFTToCFolio);
    StoreClasses.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'prod') {
      this.setState({ isWalletConnected: params.address !== '' });
    }
  }

  onAddSFTToCFolio(status: StatusResult): void {
    if (status.status === 'success' || status.status === 'error')
      this.setState({ txPending: false });
  }

  _getCardDetails() {
    if (this.state.cardId) {
      import('../../locales/en_US/cFolioItems.json').then((cFolioItems) => {
        const items: IWolvesCards[] = cFolioItems[
          this.state.type
        ] as IWolvesCards[];
        const cardDetails = items.find(
          (card: IWolvesCards) => Number(card.id) === Number(this.state.cardId)
        );
        this.setState({ cardDetails });
      });
    }
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace(',', '.');
    const newState = parseFloat(event.target.value) > 0;
    this.setState({ buyInput: parseFloat(event.target.value) });
    if (newState !== this.state.inputValid)
      this.setState({ inputValid: newState });
  }

  _onBuy(): void {
    if (this.state.cardDetails) {
      const payload = {
        type: ADD_SFT_TO_CFOLIO,
        content: {},
      };
      payload.content = {
        amount: [this.state.buyInput],
        id: BigNumber.from(this.state.cardDetails.chainRef),
        tokenId: BigNumber.from(
          this.receiverImages[this.state.slideIndex].tokenId
        ),
      };
      this.setState({ txPending: true });
      StoreClasses.dispatcher.dispatch(payload);
    }
  }

  onSFTState(result: SFTStateresult) {
    if (result.status === 'user') this._updateImages();
  }

  _updateImages() {
    const cards = StoreClasses.store.getAssets().cards;
    const tokenIds = StoreClasses.store.getAssets().userSFT;
    console.log('update images clled');
    const newImages: IMAGE[] = [];
    tokenIds.forEach((elem) => {
      if (elem.isStockCard && elem.id.toNumber() >> 24 >= 4) {
        const tokenId = elem.id.toNumber();
        const newLevel = cards.cards.findIndex(
          (level) => level.chainRef === tokenId >> 24
        );
        const newIndex = cards.cards[newLevel].cards.findIndex(
          (card) => card.chainRef === ((tokenId >> 16) & 0xff)
        );
        newImages.push({ tokenId: tokenId, level: newLevel, index: newIndex });
      }
    });
    if (newImages !== this.receiverImages) {
      this.receiverImages = newImages;
      this.setCurrentImage(this.state.currentImage);
    }
    this.content = cards;
  }

  sliderInit(id: string | undefined, iface: IMAGE_SLIDER_INTERFACE) {
    this.sliderInterface = iface;
  }

  render(): JSX.Element {
    const { inputValid, isWalletConnected, txPending } = this.state;
    const handleImageChange = (change: number) => {
      if (this.state.currentImage + change < 0) {
        return this.setCurrentImage(this.investImages.length - 1);
      }

      if (this.state.currentImage + change >= this.investImages.length) {
        return this.setCurrentImage(0);
      }

      return this.setCurrentImage(this.state.currentImage + change);
    };

    return (
      <>
        <>
          <div
            className={
              'flex-column justify-content-center bg-flat2 text-white text-center '
            }
          >
            {/* Title & heading */}
            <div>
              <h2 className="mt-4 tk-vincente-lightbold font-28 single-line">
                {'WOLF TRADE FLOOR - CHOOSE YOUR C-FOLIO TO STAKE WITH'}
              </h2>
              <h3 className="tk-grotesk-lightbold font-14">
                {'PICK YOUR HIGHEST LEVEL WORK TO STAKE '}
              </h3>
            </div>

            {/* Card slider */}
            <div
              className={
                'd-flex justify-content-center bg-transparent-orange mb-3 '
              }
            >
              <div className="vw-80 py-2 glide-border-t glide-border-b p_relative center_triange_down center_triange_up">
                <ImageSlider
                  sliderId="0"
                  initCallback={this.sliderInit.bind(this)}
                  onSlideChanged={(index) => {
                    if (index !== this.state.slideIndex)
                      this.setState({ slideIndex: index });
                  }}
                  slideWidth={120}
                  slides={this.receiverImages.map((elem) => {
                    const slide = {
                      url:
                        this.content?.cards[elem.level].cards[
                          elem.index
                        ].url.replace('{res}', '300') || '',
                    } as IMAGE_SLIDER_SLIDE;
                    return slide;
                  })}
                />
              </div>
            </div>

            {/* Content */}
            <div className={'page4sInvest-container center-container my-5'}>
              <div className="d-flex align-items-center justify-content-even mb-3">
                <button
                  className="arrow_left m-0 mr-2 d-none"
                  onClick={() => handleImageChange(-1)}
                />
                <img
                  className={'w-80'}
                  src={this.state.cardDetails?.url}
                  alt={this.state.cardDetails?.url}
                  style={{ maxWidth: '500px' }}
                />
                {/*<img*/}
                {/*  className={'w-80'}*/}
                {/*  src={this.investImages[this.state.currentImage]}*/}
                {/*  alt={this.investImages[this.state.currentImage]}*/}
                {/*  style={{ maxWidth: '500px' }}*/}
                {/*/>*/}
                <button
                  className="arrow_right m-0 ml-2 d-none"
                  onClick={() => handleImageChange(1)}
                />
              </div>

              <div className={'t-left'}>
                <h1 className={'tk-vincente h-1'}>
                  {' '}
                  {this.state.cardDetails?.name}{' '}
                </h1>

                <div
                  className={'tk-grotesk-lightbold font-16 line-break-enable'}
                >
                  <p>{this.state.cardDetails?.description}</p>
                  <p>{this.state.cardDetails?.motto}</p>
                </div>

                <div className="p_relative">
                  <input
                    type="text"
                    onFocus={() => this.setState({ buyMaxVisible: false })}
                    onBlur={() =>
                      this.setState({
                        buyMaxVisible: this.inputRef.current?.value === '',
                      })
                    }
                    onChange={this.handleOnChange}
                    ref={this.inputRef}
                    className="wolve_input text-white font-14"
                    style={{ paddingRight: '125px' }}
                  />
                  {/*<div className="wolve_input_max">MAX</div>*/}
                  <div className={'wolve_input_label font-14'}>WOWS/ETH LP</div>
                </div>

                <div className="d-flex justify-content-end mt-1 font-13">
                  BUY V.2 ETH/WOWS LP TOKENS HERE
                </div>

                <button
                  onClick={() => this._onBuy()}
                  disabled={!inputValid || !isWalletConnected || txPending}
                  className={
                    'wolve_btn page4sInvest-text-input mt-3 m-0 page4sInvest-btn-stack font-10'
                  }
                >
                  BUY STAKED ETH/WOWS NFT
                </button>
              </div>
            </div>
          </div>
        </>
      </>
    );
  }
}

export default withTranslation()(Page4StakedInvest);
