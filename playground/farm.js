class Farm {
  timestamp = 0;
  periodFinish = 0;  
  rewardsDuration = 100;

  slotData = new Array();
  
  constructor() {
    this.slotData.push({
      totalSupply: 0,
      weight: 1,
      rewardPerTokenStored: 0,
      lastUpdateTime: 0,
      balances: new Map(),
      rewards: new Map(),
      userRewardPerTokenPaid: new Map()});
  }

  _updateReward(account, slotId) {
    const slot = this.slotData[slotId];
    
    slot.rewardPerTokenStored = this.rewardPerToken(slotId);
    slot.lastUpdateTime = this.lastTimeRewardApplicable();

    if (account) {
      slot.rewards[account] = this.earned(account, slotId);
      slot.userRewardPerTokenPaid[account] = slot.rewardPerTokenStored;
    }
  }

  lastTimeRewardApplicable() {
    return this.timestamp < this.periodFinish ? this.timestamp : this.periodFinish;
  }

  rewardPerToken(slotId) {
    const slot = this.slotData[slotId];
    const ts = slot.totalSupply;
    if (ts === 0) {
      return slot.rewardPerTokenStored;
    }

    return slot.rewardPerTokenStored + (
      ((this.lastTimeRewardApplicable()-slot.lastUpdateTime) * slot.rewardRate) / ts
    );
  }

  earned(account, slotId) {
    const slot = this.slotData[slotId];
    return (slot.balances[account] ?? 0)
      * (this.rewardPerToken(slotId) - (slot.userRewardPerTokenPaid[account] ?? 0))
      + (slot.rewards[account] ?? 0);
  }

  addShares(account,amount, slotId) {
    this._updateReward(account, slotId);
    // Update state
    this.slotData[slotId].totalSupply = (this.slotData[slotId].totalSupply ?? 0) + amount;
    this.slotData[slotId].balances[account] = (this.slotData[slotId].balances[account] ?? 0) + amount;
  }

  notifyRewardAmount(reward){
    // Accumulate weights
    let weightSum = 0;
    let rewardRate = 0;
    for (let i = 0; i < this.slotData.length; ++i) {
      this._updateReward(undefined, i);
      weightSum += this.slotData[i].weight;
      rewardRate += this.slotData[i].rewardRate;
    }
    // Update state
    if (this.timestamp >= this.periodFinish) {
      rewardRate = reward / this.rewardsDuration;
    } else {
      const remaining = this.periodFinish - this.timestamp;
      const leftover = remaining * rewardRate;
      rewardRate = reward + leftover / this.rewardsDuration;
    }
    for (let i = 0; i < this.slotData.length; ++i) {
      this.slotData[i].rewardRate = (rewardRate * this.slotData[i].weight) / weightSum;
      this.slotData[i].lastUpdateTime = this.timestamp;
    }
    // solhint-disable-next-line not-rely-on-time
    this.periodFinish = this.timestamp + this.rewardsDuration;
  }

  weightSlotId(slotId, weight)
  {
    let rewardRate = 0;
    let weightSum = 0;
    for (let i = 0; i < this.slotData.length; ++i) {
      this._updateReward(undefined, i);
      rewardRate += this.slotData[i].rewardRate;
      weightSum += this.slotData[i].weight;
    }
    if (slotId == this.slotData.length) {
      this.slotData.push({
        totalSupply: 0,
        weight,
        rewardPerTokenStored: 0,
        lastUpdateTime: 0,
        balances: new Map(),
        rewards: new Map(),
        userRewardPerTokenPaid: new Map()
      });
    } else {
      weightSum -= this.slotData[slotId].weight;
      this.slotData[slotId].weight = weight;
    }
    weightSum += weight;

    for (let i = 0; i < this.slotData.length; ++i) {
      this.slotData[i].rewardRate = (rewardRate * this.slotData[i].weight) / weightSum;
    }
  }
}

const farm = new Farm();
farm.weightSlotId(1,1);
farm.notifyRewardAmount(10);
farm.addShares('A', 1, 0);
farm.addShares('B', 1, 1);
farm.timestamp = 50;
farm.weightSlotId(1,2);
console.log(farm.earned('A', 0));
console.log(farm.earned('B', 1));
farm.timestamp = 100;
console.log(farm.earned('A', 0));
console.log(farm.earned('B', 1));
farm.notifyRewardAmount(10);
console.log(farm.earned('A', 0));
console.log(farm.earned('B', 1));
farm.timestamp = 150;
console.log(farm.earned('A', 0));
console.log(farm.earned('B', 1));
farm.weightSlotId(1,1);
farm.timestamp = 200;
console.log(farm.earned('A', 0));
console.log(farm.earned('B', 1));