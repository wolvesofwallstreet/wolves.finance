Steps to setup the WOWS environment.

<h2>****** MAIN DEPLOY ******</h2>

1.) deploy AddressFactory\
-> parameter:\

> \- \_owner (the only address which can add addresses, most likely the deployer)

2.) deploy AddressBook\

3.) AddressFactory:: setRegistryEntry for UniswapV2Router02, MarketingWallet, TeamWallet

4.) deploy Token.sol\
-> parameter:\

> \- IAddressFactory address\ <- must contain UNISWAP_V2_ROUTER02, MARKETING_WALLET and TEAM_WALLET keys, (AddressBook.sol)\

5.) deploy Controller.sol\
-> parameter:\

> \- IAddressFactory address\
> \- rewardHandler (right now its Token.sol)\
> \- previousController: 0 address / only for later updates\

6.) deploy UniV2StakeFarm.sol\
-> parameter:\

> \- owner address\
> \- name: "WETH/WOWS LP Farm\
> \- stakingToken: Token.sol::uniV2Pair()\
> \- rewardToken: Token.sol\
> \- controller: address Controller.sol\
> \- route: address of UniV2 WETH/USDT pool, can be 0 for test

7.) AddressFactory:: setRegistryEntry for WethWowsStakeFarm (6.)

8.) deploy Booster.sol\
-> parameter:\

> \- \_owner address\

<h2>****** PRESALE DEPLOY ******</h2>

1.) deploy Crowdsale.sol\
-> parameter:\

> \- addressRegistry\
> \- rate: 80\
> \- token: Token.sol address\
> \- cap: 75\*1e18\
> \- invest_min: 2\*1e17 (0.2 ETH)\
> \- wallet_cap: 3\*1e18 (3 ETH)\
> \- lpEth: 3750\
> \- lptoken: 240000\
> \- openingTime: presale start / for test maybe now + 1 Minute\
> \- closingTime: presale end / for test maybe now + 2 Minutes

<h2>****** SETUP ******</h2>

<h3>From MultiSig marketing wallet call:</h3>

1.) call Token.sol::grantRole(Token.sol.REWARD_ROLE(), controller)\
-> This is to allow controller to call into Token.sol to distribute rewards

2.) call Controller::registerFarm\
-> parameter:\

> \- farmAddress UniV2StakeFarm address\
> \- rewardCap (15.000 \*1e18)\
> \- rewardPerDuration (5000 *2 / 52 *1e18) we have 2 week duration!\
> \- rewardProvided 0\
> \- rewardfee 2\*1e4 (0.02)

3.) call Token.sol setBooster\
-> parameter:\

> \- address of Booster.sol

4.) call Token.sol::grantRole(Token.sol.MINTER_ROLE(), Crowdsale.sol)\
\!\!\! ONLY DURING PRESALE \!\!\!
