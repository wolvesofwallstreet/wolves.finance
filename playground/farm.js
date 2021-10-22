class Farm {
  timestamp = 0;
  rewardPerTokenStored = 0;
  userRewardPerTokenPaid = new Map();
  rewards = new Map();
  _balances = new Map();
  lastUpdateTime = 0;
  periodFinish = 0;
  rewardsDuration = 100;
  
  constructor() {
    this._totalSupplys= [0];
    this.slotWeights = [1];
  }

  _updateReward(account) {
    this.rewardPerTokenStored = this.rewardPerToken();
    this.lastUpdateTime = this.lastTimeRewardApplicable();

    if (account) {
      this.rewards[account] = this.earned(account);
      this.userRewardPerTokenPaid[account] = this.rewardPerTokenStored;
    }
  }

  lastTimeRewardApplicable() {
    return this.timestamp < this.periodFinish ? this.timestamp : this.periodFinish;
  }

  rewardPerToken() {
    const ts = this._totalSupply();
    if (ts === 0) {
      return this.rewardPerTokenStored;
    }

    return this.rewardPerTokenStored + (
      ((this.lastTimeRewardApplicable()-this.lastUpdateTime)*this.rewardRate) / ts
    );
  }

  earned(account) {
    return this._balance(account)
      * (this.rewardPerToken() - (this.userRewardPerTokenPaid[account] ?? 0))
      + (this.rewards[account] ?? 0);
  }

  addShares(account,amount, slotId) {
    this._updateReward(account);

    // Update state
    this._totalSupplys[slotId] = (this._totalSupplys[slotId] ?? 0) + amount;
    if (!this._balances[account])this._balances[account]=new Map();
    this._balances[account][slotId] = (this._balances[account][slotId] ?? 0) + amount;
  }

  _totalSupply() {
    let ts = 0;
    for (let i = 0; i < this.slotWeights.length; ++i)
      ts += (this._totalSupplys[i] ?? 0) * this.slotWeights[i];
    return ts;
  }

  _balance(account) {
    let balance = 0;
    for (let i = 0; i < this.slotWeights.length; ++i)
      if (this._balances[account])
        balance += (this._balances[account][i] ?? 0) * this.slotWeights[i];
    return balance;
  }

  notifyRewardAmount(reward){
    this._updateReward();

    // Update state
    if (this.timestamp >= this.periodFinish) {
      this.rewardRate = reward / this.rewardsDuration;
    } else {
      const remaining = this.periodFinish - this.timestamp;
      const leftover = remaining * this.rewardRate;
      this.rewardRate = reward + leftover / this.rewardsDuration;
    }
    // Update state
    this.lastUpdateTime = this.timestamp;
    // solhint-disable-next-line not-rely-on-time
    this.periodFinish = this.timestamp + this.rewardsDuration;
  }

  weightSlotId(slotId, weight)
  {
    this._updateReward();
    if (slotId == this.slotWeights.length) {
      this._totalSupplys.push(0);
      this.slotWeights.push(weight);
    } else this.slotWeights[slotId] = weight;
  }
}

const farm = new Farm();
farm.weightSlotId(1,1);
farm.notifyRewardAmount(10);
farm.addShares('A', 1, 0);
farm.addShares('B', 1, 1);
farm.timestamp = 50;
farm.weightSlotId(1,2);
console.log(farm.earned('A'));
console.log(farm.earned('B'));