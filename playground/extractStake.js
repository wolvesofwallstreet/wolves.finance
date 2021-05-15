var ethers = require('ethers');

var provider = new ethers.providers.InfuraProvider(
  (network = 'mainnet'),
  (apiKey = '6ccfc6aa1fa44805a7f4a52a2fb51ef0')
);
const stakeAddress = '0x6D1D6710aC18aFc168fD1637180deee8d203870F';

const stakeTopic =
  '0x9e71bc8eea02a63969f509818f2dafb9254532904319f9dbda79b67bd34a5f3d';
const unstakeTopic =
  '0x0f5bb82176feb1b5e747e28471aa92156a04d9f3ab9f45f28e2d704232b93f75';
const transferTopic =
  '0x8930ac7bcb101f94c05b13845098ae74383bfb9e348e73061b730040945cbb82';

//const rewardBlock = 11909975;
const rewardBlock = 12091743;

async function getTimestamp(n) {
  return provider.getBlock(n).then((result) => {
    return new Date(result.timestamp * 1000).toLocaleString();
  });
}

async function isContract(k, v) {
  return provider
    .getCode(k.replace('000000000000000000000000', ''))
    .then(function (result) {
      v.isContract = result !== '0x';
    });
}

var filter = {
  address: stakeAddress,
  fromBlock: 11831258,
};
var firstFetched = 0;
var lastFetched = 0;

var callPromise = provider.getLogs(filter);
callPromise
  .then(async function (events) {
    console.log('Number events:', events.length);
    const stats = {};
    firstFetched = events[0].blockNumber;
    events.forEach((event) => {
      lastFetched = event.blockNumber;
      if (event.removed === false) {
        if (event.topics[0] === stakeTopic) {
          if (stats[event.topics[1]] === undefined)
            stats[event.topics[1]] = {
              rewardValue: ethers.BigNumber.from('0'),
              value: ethers.BigNumber.from('0'),
            };
          stats[event.topics[1]].value = stats[event.topics[1]].value.add(
            event.data
          );
          if (event.blockNumber < rewardBlock)
            stats[event.topics[1]].rewardValue = stats[event.topics[1]].value;
        } else if (event.topics[0] === transferTopic) {
          if (stats[event.topics[2]] === undefined)
            stats[event.topics[2]] = {
              rewardValue: ethers.BigNumber.from('0'),
              value: ethers.BigNumber.from('0'),
            };
          stats[event.topics[2]].value = stats[event.topics[2]].value.add(
            event.data
          );
          if (event.blockNumber < rewardBlock)
            stats[event.topics[2]].rewardValue = stats[event.topics[2]].value;
          stats[event.topics[1]].value = stats[event.topics[1]].value.sub(
            event.data
          );
          if (event.blockNumber < rewardBlock)
            stats[event.topics[1]].rewardValue = stats[event.topics[1]].value;
        } else if (event.topics[0] === unstakeTopic) {
          if (stats[event.topics[1]] === undefined)
            console.log(event.transactionHash);
          stats[event.topics[1]].value = stats[event.topics[1]].value.sub(
            event.data
          );
          if (event.blockNumber < rewardBlock)
            stats[event.topics[1]].rewardValue = stats[event.topics[1]].value;
        }
      }
    });

    for (const [k, v] of Object.entries(stats)) {
      v.value = ethers.utils.formatUnits(v.value, 18);
      v.rewardValue = ethers.utils.formatUnits(v.rewardValue, 18);
      //await isContract(k,v);
    }

    //console.log("Result:");
    const ff = await getTimestamp(firstFetched);
    const lf = await getTimestamp(lastFetched);

    //console.log("FirstFetched: ", ff, "LastFetched: ", lf);

    //console.log(events);

    //console.log(stats);

    console.log('address;feb22;current');
    for (const [k, v] of Object.entries(stats)) {
      if (v.value > 0 && v.rewardValue > 0)
        console.log(
          k.replace('000000000000000000000000', ''),
          ';',
          v.rewardValue,
          ';',
          v.value
        );
    }
  })
  .catch(function (err) {
    console.log(err);
  });
