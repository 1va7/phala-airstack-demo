#!/bin/bash

npm run localhost-node &

# 部署合约到本地网络
npm run localhost-deploy &&

# 启动其他服务
npx @phala/fn watch 0x5FbDB2315678afecb367f032d93F642f64180aa3 artifacts/contracts/OracleConsumerContract.sol/OracleConsumerContract.json dist/index.js -a '{"apiUrl": "https://api.airstack.xyz/gql", "apiKey": "3a41775a358a4cb99ca9a29c1f6fc486"}' &

node server.js