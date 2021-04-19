Steps to setup the WOWS environment.

<h1>****** DEPLOY ******</h1>
<h2>****** MAIN DEPLOY ******</h2>

1.) deploy AddressFactory\
-> parameter:\

> \- \_owner (the only address which can add addresses, most likely the deployer)

2.) deploy AddressBook\

3.) AddressFactory:: setRegistryEntry for UniswapV2Router02, MarketingWallet, TeamWallet

4.) deploy WOWSErc20.sol\
-> parameter:\

> \- IAddressFactory address\ <- must contain DEPLOYER, UNISWAP_V2_ROUTER02, MARKETING_WALLET, TEAM_WALLET and WOWS_TOKEN keys, (AddressBook.sol)\

5.) deploy RewardHandler.sol\
-> parameter:\

> \- \AddressRegistry address\

6.) AddressFactory:: setRegistryEntry for RewardHandler (5.)

7.) deploy Controller.sol\
-> parameter:\

> \- IAddressFactory address\
> \- rewardHandler (5.)\
> \- previousController: 0 address / only for later updates\

8.) deploy UniV2StakeFarm.sol\
-> parameter:\

> \- owner address\
> \- name: "WETH/WOWS LP Farm\
> \- stakingToken: WOWSErc20.sol::uniV2Pair()\
> \- rewardToken: WOWSErc20.sol\
> \- controller: address Controller.sol\
> \- route: address of UniV2 WETH/USDT pool, can be 0 for test

9.) AddressFactory:: setRegistryEntry for WethWowsStakeFarm (6.)

10.) deploy Booster.sol\
-> parameter:\

> \- \_owner address\

<h2>****** PRESALE DEPLOY ******</h2>

1.) deploy Crowdsale.sol\
-> parameter:\

> \- addressRegistry\
> \- rate: 80\
> \- token: WOWSErc20.sol address\
> \- cap: 75\*1e18\
> \- invest_min: 2\*1e17 (0.2 ETH)\
> \- wallet_cap: 3\*1e18 (3 ETH)\
> \- lpEth: 3750\
> \- lptoken: 240000\
> \- openingTime: presale start / for test maybe now + 1 Minute\
> \- closingTime: presale end / for test maybe now + 2 Minutes

<h2>****** SETUP ******</h2>

<h3>From MultiSig marketing wallet call:</h3>

1.) call RewardHander.sol::grantRole(RewardHandler.sol.REWARD_ROLE(), controller)\
-> This is to allow controller to call into RewardHandler to distribute rewards

2.) call WowsToken.sol::grantRole(WowsToken.sol.MINTER_ROLE(), RewardHandler)\
-> This is to allow RewardHandler to mint rewards fro distributing

3.) call Controller::registerFarm\
-> parameter:\

> \- farmAddress UniV2StakeFarm address\
> \- rewardCap (15.000 \*1e18)\
> \- rewardPerDuration (5000 *2 / 52 *1e18) we have 2 week duration!\
> \- rewardProvided 0\
> \- rewardfee 2\*1e4 (0.02)

5.) call WOWSErc20.sol::grantRole(WOWSErc20.sol.MINTER_ROLE(), Crowdsale.sol)\
\!\!\! ONLY DURING PRESALE \!\!\!

<h2>****** SFT CONTRACT ******</h2>

1.) deploy WOWSERC1155.sol\
-> parameter:\

> \- uri the uri to the location where metadata lives

2.) AddressFactory:: setRegistryEntry SFT_HOLDER (1.)

3.) deploy WOWSSftMinter.sol
-> parameter:\

> \- address owner (multisig marketing)
> \- wowsToken address
> \- rewardhandler (RewardHandler.sol)
> \- sftContract address (see 1)

Setup:

> \- RewardHandler:: grantRole (RewardHandler.REWARD_ROLE, WOWSSftMinter.sol)
> \- WOWSSftMinter:: setPrices (currently: ["0", "1", "4", "5"],["2500000000000000000", "4500000000000000000","2500000000000000000", "4500000000000000000"])
> \- WowsERC1155:: grantRole (MINTER_ROLE, WOWSSftMinter.sol)

<h2>****** TRADEFLOOR ******</h2>
1.) deploy TradeFloor.sol (Proxy client)\
-> parameter:\

> \- addressRegistry\
> \- openSeaRegistryProxy (available on rinkeby and mainnet, for other networks pass address(0))

2.) prepare the initializationCall for the Proxy (TradeFloor::encodeFunctionData)
-> parameter

> \- 'initialize' (function name)
> \- METADATA_URI
> \- CONTRACT_METADATA_URI

3.) deploy TradeFloorProxy.sol (Upgradeable Proxy)
-> parameter

> \- addressRegistry\
> \- TradeFloor address (1.)
> \- initialization data (2.)

<h2>****** TRADEFLOORCLIENT ******</h2>

1.) deploy CFolioFarm.sol\
-> parameter:\

> \- owner (deployer)
> \- name (unique name)
> \- controller

2.) AddressFactory:: setRegistryEntry WOLVES_REWARDS (1.)

3.) deploy TradeClientFloorLP.sol (for UNIV2 WOWS/ETH LP)\
-> parameter:\

> \- addressRegistry\
> \- tradeFloorProxyAddress,
> \- tradeFloorTokenId (unique and > 0x10000000000000000)

4.) CFolioFarm.sol:: transferOwnership(TradeClientFloorLP)

<h1>****** UPGRADE ******</h1>
<h2>****** CONTROLLER ******</h2>
1.) deploy Controller.sol\
-> parameter:\

> \- IAddressFactory address\
> \- rewardHandler\
> \- previousController\

2.) call RewardHander.sol::grantRole(RewardHandler.sol.REWARD_ROLE(), controller)\
-> This is to allow controller to call into RewardHandler to distribute rewards

3.) call previousController transferFarm / transferAllFarms

<h2>****** REWARDHANDLER ******</h2>

1.) deploy RewardHandler.sol\
-> parameter:\

> \- \AddressRegistry address\

2.) AddressFactory:: setRegistryEntry for RewardHandler (1.)

3.) From MarketingWallet:

> \- WowsToken.sol::grantRole(WowsToken.sol.MINTER_ROLE(), RewardHandler)\
> \- RewardHander.sol::grantRole(RewardHandler.sol.REWARD_ROLE(), controller)\
> \- RewardHandler:: grantRole (RewardHandler.REWARD_ROLE, WOWSSftMinter.sol)
> \- Controller::setRewardhandler(1.)
> \- WowsERC1155:: setRewardHandler (1.)
