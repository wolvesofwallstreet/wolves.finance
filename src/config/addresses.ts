/*
 * Copyright (C) 2020-2021 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/*
 * Address registry for the following contracts of ours:
 *
 *   - addressRegistry - The address registry contract
 *   - token - The ERC-20 WOWS token
 *   - stakeFarm - The UniV2 stake farm
 *   - booster - The booster contract
 *   - rewardHandler - The reward handler contract
 *   - sftMinter - The SFT crowdsale minting contract
 *   - sftHolder - The ERC-1155 SFT contract
 *   - tradeFloor - The Trade Floor contract for locking and trading SFTs
 *   - stakingTest - The test staking contract for the Trade Floor
 *
 * It also contains addresses for the following dependencies:
 *
 *   - weth: The W-ETH contract
 *   - uniV2Factory: The Uniswap V2 factory
 *   - uniV2Router: The Uniswap V2 router
 *   - openSeaProxyRegistry - The OpenSea proxy registry
 *
 * Addresses are available for the following networks:
 *
 *   - 1 - Mainnet
 *   - 3 - Ropsten
 *   - 4 - Rinkeby
 *   - 97 - Binance SC Test
 *   - 1337 - Private network
 *   - 4003 - Fantom Contabo
 */

import addresses from './addresses.json';

export { addresses };
