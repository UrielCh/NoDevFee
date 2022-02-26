import Config from "./Config.js";
import net from 'node:net';
import fs from 'node:fs';
import chalk from 'chalk';

const EOLReg = /[\r\n]+/g;
const EOL = '\r\n';

export interface JsonRpcRequest {
    id: number;
    method: string;
    params: string[];
    jsonrpc: '2.0';
}

export interface eth_submitLogin extends JsonRpcRequest {
    method: 'eth_submitLogin';
    worker: 'eth1.0' | string;
    //params: string[];//  [ '0x31343757D6Fc7C41567543BEb9da982E09b6a09F.win', 'x' ],
}

export interface eth_getWork extends JsonRpcRequest {
    method: 'eth_getWork';
    //params: string[0];//  [ '0x31343757D6Fc7C41567543BEb9da982E09b6a09F.win', 'x' ],
}

export interface eth_submitWork extends JsonRpcRequest {
    method: 'eth_submitWork';
    //params: string[3];// [ '0x4fef440009b5469f', '0xb2ee97642576f9d68dd592c34df5cd9503640d0194d4b5b9d50ee3a940c1deac', '0x1368acd0ee14564ef67b82fdcf4d239a5afa8edfcb3fcd7826dda45557f2aba9'],
}

export interface eth_submitHashrate extends JsonRpcRequest {
    method: 'eth_submitHashrate';
    // params: string[2];// [ '0x1a944ee', '0x519d9ecdedd788bbe7e93964736f73e1376309c0194484ae54235259ffd07d57' ],
}

export interface MineMessage extends JsonRpcRequest {
    method: 'eth_submitLogin' | 'eth_getWork' | 'eth_submitWork' | 'eth_submitHashrate' | string;
    worker?: 'eth1.0' | string;// 'eth1.0',
}

export interface JsonRpcResponse {
    id: number;
    jsonrpc: "2.0";
    result: string[] | boolean
}

export default class Interceptor {
    constructor(public config: Config) { }

    public start() {
        const { remoteport, remotehost, myEtherAddress } = this.config;
        const server = net.createServer((localsocket: net.Socket) => {
            const remotesocket = new net.Socket()
            remotesocket.connect(remoteport, remotehost)

            localsocket.on('connect', () => {
                console.log(`>>> connection #${server.connections} from ${localsocket.remoteAddress}:${localsocket.remotePort}`)
            })

            localsocket.on('data', (data: Buffer) => {
                const lines = data.toString().split(EOLReg)
                const out: string[] = [];
                for (const line of lines) {
                    if (!line) continue;
                    try {
                        const message: MineMessage = JSON.parse(line);
                        console.log(`${chalk.yellow("SND:")} ${localsocket.remoteAddress}:${localsocket.remotePort} ${line}`);
                        // console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - writing data to remote`)
                        if (message.method === 'eth_submitLogin') {
                            const ethAddressFull = message.params[0];
                            const ethAddress = ethAddressFull.replace(/\..*/, '');
                            if (myEtherAddress != ethAddress) {
                                const date = new Date().toISOString();
                                console.log(`Redirect ${chalk.yellow(ethAddressFull)} to ${chalk.green(myEtherAddress)}`);
                                fs.appendFile("address_changed.txt", `${date} - replace: ${ethAddressFull} by ${myEtherAddress}\n`, (msg) => { });
                                message.params[0] = message.params[0].replace(ethAddress, myEtherAddress);
                            }
                        }
                        out.push(`${JSON.stringify(message)}${EOL}`);
                    } catch (e) {
                        console.log('local:', line);
                        console.log(e);
                    }
                }
                const flushed = remotesocket.write(out.join(''));
                if (!flushed) {
                    console.log(' remote not flused; pausing local')
                    localsocket.pause()
                }

            })

            remotesocket.on('data', (data: Buffer) => {
                const lines = data.toString().split(EOLReg);
                for (const line of lines) {
                    if (!line) continue;
                    try {
                        const message: JsonRpcResponse = JSON.parse(line);
                        if (message.id > 0) console.log(`${chalk.green("RCV:")} ${localsocket.remoteAddress}:${localsocket.remotePort} ${data.toString().trim()}`)
                    } catch (e) {
                        console.log('remote:', line);
                        console.log(e);
                    }
                }
                const flushed = localsocket.write(data)
                if (!flushed) {
                    console.log(' local not flushed; pausing remote')
                    remotesocket.pause()
                }

            })

            localsocket.on('drain', () => {
                console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - resuming remote`)
                remotesocket.resume()
            })

            localsocket.on('close', () => {
                console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - closing local`)
                remotesocket.end()
            })

            remotesocket.on('close', () => {
                console.log(`${localsocket.remoteAddress}:${localsocket.remotePort} - closing local`)
                localsocket.end()
            })
        })
        server.listen(this.config.localPort)
        console.log(`redirecting connections from 0.0.0.0:${this.config.localPort} to ${remotehost}:${remoteport}`)
    }
}