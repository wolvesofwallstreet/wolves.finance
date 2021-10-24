var ethers = require('ethers');


const network = 'goerli';
const minterAddress = '0x35d0F435E80CA53ED1E1E0C3341e4E8B93575d75';


/*
const network = 'mainnet';
const sftAddress = '0x64B3342dB643f3Fb4da5781b6D09B44Ab4668dE4';
const tfAddress = '0x7C621229fB0293ef8A4f5cAa79a8bB4D60BF5ca4';
const sftDeployBlockFrom = 12052172;
*/

const minterAbi = require('./abi/WOWSSftMinter.json');

const provider = new ethers.providers.InfuraProvider(
  network,
  (apiKey = '6ccfc6aa1fa44805a7f4a52a2fb51ef0')
);

const minterInterface = new ethers.utils.Interface(minterAbi);

const mintWOWSTopic = '0xb4c03061fb5b7fed76389d5af8f2e0ddb09f8c70d1333abbb62582835e10accb';

const filter = {
  address: minterAddress,
  fromBlock: 0,
  topics: [
    mintWOWSTopic,
    null
  ]
};

var count = 0;
const results = [];

var callPromise = provider.getLogs(filter);
callPromise
  .then(async function (events) {
    console.log('Number events:', events.length);
    for (event of events) {
      const tokenId = minterInterface.parseLog(event).args.tokenId;
      if (tokenId.lt(0x100000000))
        results.push(tokenId);
    }
    console.log(results.sort( (a, b) => {return a.gt(b) ? 1 : a.lt(b) ? -1 : 0}));
  })
  .catch(function (err) {
    console.log(err);
  });
