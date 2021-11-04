#!/bin/sh

#const shareAddedTopic = "0x02bb8095d2b48242cc8de979ad9de6b2d63ac9c466aa939ffbf0dae46cd4573e"
#const assetAddedTopic = "0x016de277906da9bccd612597bb3387946bd3815de9eea61ae16105325e09d7be"

#API="https://api-testnet.polygonscan.com"
#const lpFarmAddress = '0x6Ab496D47bAD24eC92A74285Fb693D67EBf0eea9';
#const scFarmAddress = '0xf9ba64aAe2Ca14F8c5d6a785B5Dd9F1f52c09Bb9';
#const lpDeployBlock = 18924907;
#const scDeployBlock = 18924909;

API="https://api.polygonscan.com"
#const lpFarmAddress = '0x87e1f8818c5411986E61D403fa0e283ab3115973';
#const scFarmAddress = '0xFF80Df978429e2444cE7b6FBF316Afa087cE5F6b';
#const lpDeployBlock = 19420773;
#const scDeployBlock = 19420809;

FROM_BLOCK="19420809"
ADDRESS="0xFF80Df978429e2444cE7b6FBF316Afa087cE5F6b"
TOPICS="topic0=0x02bb8095d2b48242cc8de979ad9de6b2d63ac9c466aa939ffbf0dae46cd4573e"

curl "$API/api?module=logs&action=getLogs&fromBlock=$FROM_BLOCK&toBlock=latest&address=$ADDRESS&$TOPICS&apikey=9B5MFG9ECW3SWCMP1YSPHG2WQ3ZR74X5TG"

TOPICS="topic0=0x016de277906da9bccd612597bb3387946bd3815de9eea61ae16105325e09d7be"

curl "$API/api?module=logs&action=getLogs&fromBlock=$FROM_BLOCK&toBlock=latest&address=$ADDRESS&$TOPICS&apikey=9B5MFG9ECW3SWCMP1YSPHG2WQ3ZR74X5TG"
