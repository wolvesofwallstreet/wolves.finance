const fs = require('fs');
const ethers = require('ethers');

//console.log(ethers.utils);

const data = JSON.parse('[' + fs.readFileSync('poly-sc.json', 'utf8').replace('}{','},{') + ']');

const uniqueAddresses = new Set()
for (elem of data) {
  for (log of elem.result) {
    uniqueAddresses.add(ethers.utils.defaultAbiCoder.decode(['address'], log.topics[1])[0]);
  }
}
console.log('["'+[...uniqueAddresses].join('","')+'"]');
