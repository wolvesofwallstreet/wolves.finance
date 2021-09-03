var ethers = require('ethers');

//const network = 'mainnet';
//const farmAddress = '0xFDD2146B6b40C1E2887ca9aec9A447516819695b';

const network = 'rinkeby';
const farmAddress = '0xB6ebCBC186E222b30917444cfb39045CD4B3CBDE';

var provider = new ethers.providers.InfuraProvider(
  network,
  (apiKey = '6ccfc6aa1fa44805a7f4a52a2fb51ef0')
);

const AA =
  '0xfde45ef6c4d07139bdb3883a286ea36e8985075fe4c67d5ae2f4d3c76d16b44b';
const SA =
  '0x04ef4f1cc91a8720964828c53ded046d741f36cbc6603f187d1555bbc73d6a18';


var filter = {
  address: farmAddress,
  fromBlock: 0,
};

var callPromise = provider.getLogs(filter);
callPromise
  .then(async function (events) {
    console.log('Number events:', events.length);
    const stats = {};
    events.forEach((event) => {
      if (event.removed === false) {
        if (event.topics[0] === AA) {
          stats[event.topics[1].replace('000000000000000000000000', '')] = 'A';
        } else if (event.topics[0] === SA) {
          stats[event.topics[1].replace('000000000000000000000000', '')] = 'S';
        }
      }
    })
    for (const [k, v] of Object.entries(stats)) {
      console.log(k,';',v);
    }
  })
  .catch(function (err) {
    console.log(err);
  });
