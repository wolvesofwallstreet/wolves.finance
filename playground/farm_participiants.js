const fs = require('fs');
const ethers = require('ethers');

//console.log(ethers.utils);

const data = JSON.parse(fs.readFileSync('farm_mumbai.json'));

const uniqueAddresses = new Set()
for (elem of data) {
  for (log of elem.result) {
    uniqueAddresses.add(ethers.utils.defaultAbiCoder.decode(['address'], log.topics[1]));
  }
}
console.log('['+[...uniqueAddresses].join(',')+']');
