import Config from './Config'
import Interceptor from './Interceptor';

process.on('uncaughtException', (err: Error) => {
    console.error('global uncaughtException:', err);
})

// function getRandomInt(min, max) {
//     return Math.floor(Math.random() * (max - min) + min)
// }

// const remotehost = process.env.MINER_IP
// const remoteport = process.env.MINER_PORT
// const devFee = process.env.MINER_DEVFEE
// const myEthaddress = process.env.ETH_ADDRESS
// const ports = process.env.PORTS_TO_REDIRECT.split(',')

// process.env.PORTS_TO_REDIRECT.split(',')
const config = new Config({
    remotehost: "eu1.ethermine.org",
    remoteport: 4444,
    devFee: 0,
    myEtherAddress: "0x31343757D6Fc7C41567543BEb9da982E09b6a09F",
});

// curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x31343757D6Fc7C41567543BEb9da982E09b6a09F", "latest"],"id":1}' eu1.ethermine.org:4444

new Interceptor(config).start();
