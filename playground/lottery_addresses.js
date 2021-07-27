var ethers = require('ethers');

var lineReader = require('readline').createInterface({
  input: require('fs').createReadStream('lottery_addresses.txt'),
});

lineReader.on('line', function (line) {
  console.log('_participiants[' + ethers.utils.getAddress(line) + '] = 1;');
});
