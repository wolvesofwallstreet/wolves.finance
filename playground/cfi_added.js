var ethers = require('ethers');

const provider = new ethers.providers.InfuraProvider(
  (network = 'rinkeby'),
  (apiKey = '6ccfc6aa1fa44805a7f4a52a2fb51ef0')
);

const sftAddress = '0x12a7e16CA95DF8f6753157d3ADAd155f90926cC9';
const tfAddress = '0x3C2073c6cDD7A6c16dB3B52C053aBF454F5C65e0';

const sftAbi = require('./abi/WOWSERC1155.json');
const cryptoAbi = require('./abi/WOWSCryptofolio.json');

const sftContract = new ethers.Contract(sftAddress, sftAbi, provider);
const cryptoContract = new ethers.Contract('0x0000000000000000000000000000000000000000', cryptoAbi, provider);
const sftInterface = new ethers.utils.Interface(sftAbi);

const transferTopic =
  ethers.utils.id('TransferSingle(address,address,address,uint256,uint256)');
const transferBatchTopic= '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb';

const deployBlockFrom = 8251437;
const deployBlockTo = 8740436;

var filter = {
  address: sftAddress,
  fromBlock: deployBlockFrom,
  toBlock: deployBlockTo,
  topics: [
    transferTopic,
    null,
    ethers.utils.hexZeroPad('0x', 32)
  ]
};

var count = 0;
const baseSfts = [];

var callPromise = provider.getLogs(filter);
callPromise
  .then(async function (events) {
    console.log('Number events:', events.length);
    for (event of events) {
      const tokenId = sftInterface.parseLog(event).args._id;
      if (tokenId.eq(tokenId.mask(64))) {
        const cFolio = await sftContract.tokenIdToAddress(tokenId);
        const attachedContract = cryptoContract.attach(cFolio);
        const result = await attachedContract.getCryptofolio(tfAddress);
        if (result.idsLength.gt(0)) {
          baseSfts.push(tokenId.toHexString());
        }
      }
    }
    console.log(baseSfts.join('","'));
  })
  .catch(function (err) {
    console.log(err);
  });

