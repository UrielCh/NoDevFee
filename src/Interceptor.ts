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

export function startInterceptor(config: Config): net.Server {
    const server = net.createServer((localsocket: net.Socket) => {
        new Interceptor(config, localsocket);
    });
    server.listen(config.localPort)
    console.log(`redirecting connections from 0.0.0.0:${config.localPort} to ${config.remotehost}:${config.remoteport}`)
    return server;
}

class Interceptor {
    private minerMessage = 0;
    private poolMessage = 0;

    private remotesocket: net.Socket

    constructor(private config: Config, private localsocket: net.Socket) {
        const { myEtherAddress } = this.config;
        this.remotesocket = this.connectRemote()

        // this.localsocket.on('connect', () => {
        //     console.log(`>>> connection #${chalk.greenBright(this.server.connections)} from ${this.localName}`)
        // })

        /**
         * incomming local request
         * Layzie implementation if a request is split in multiple packets it will be failed
         */
        this.localsocket.on('data', (data: Buffer) => {
            // Ether protocol allow multi-line bulk messages, each line end with \r\n
            const lines = data
                .toString()
                .split(EOLReg)
                .filter(a => a)
                .map((line) => {
                    try {
                        this.minerMessage++;
                        const message: MineMessage = JSON.parse(line);
                        console.log(`${chalk.yellow("SND:")} ${this.localName} -> ${this.remoteName} ${line}`);
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
                        return `${JSON.stringify(message)}${EOL}`;
                    } catch (e) {
                        console.log('local:', line);
                        console.log(e);
                        return '';
                    }
                })
            const flushed = this.remotesocket.write(lines.join(''));
            if (!flushed) {
                console.log(' remote not flused; pausing local')
                this.localsocket.pause()
            }
        })

        /**
         * RCV response from remote pool
         */
        this.remotesocket.on('data', (data: Buffer) => {
            const lines = data.toString().split(EOLReg);
            for (const line of lines) {
                if (!line) continue;
                try {
                    this.poolMessage++;
                    const message: JsonRpcResponse = JSON.parse(line);
                    if (message.id > 0) console.log(`${chalk.green("RCV:")} ${this.remoteName} -> ${this.localName} ${data.toString().trim()} ${this.poolMessage} / ${this.minerMessage}`);
                } catch (e) {
                    console.log('remote:', line);
                    console.log(e);
                }
            }
            // forward data to local socket
            const flushed = this.localsocket.write(data)
            if (!flushed) {
                console.log(' local not flushed; pausing remote')
                this.remotesocket.pause()
            }
        })

        this.localsocket.on('drain', () => {
            console.log(`${this.localName} - resuming remote`)
            this.remotesocket.resume()
        })

        this.localsocket.on('close', () => {
            console.log(`${this.localName} - closing local`)
            this.remotesocket.end()
        })
    }

    private connectRemote(): net.Socket {
        const { remoteport, remotehost } = this.config;
        const remotesocket = new net.Socket()
        remotesocket.connect(remoteport, remotehost)

        // local disconnection triger remote disconection
        remotesocket.on('close', () => {
            console.log(`${this.remoteName} - closing local`)
            this.localsocket.end()
        })
        this.remotesocket = remotesocket;
        return remotesocket;
    }

    private _localName = '';
    get localName(): string {
        if (!this._localName) {
            this._localName = `${this.localsocket.remoteAddress}:${this.localsocket.remotePort}`.replace('::ffff:', '');
        }
        return this._localName;
    }

    private _remoteName = '';
    get remoteName(): string {
        if (!this._remoteName) {
            const { remoteport, remotehost } = this.config;
            // console.log(this.remotesocket);
            this._remoteName = `${remotehost}:${remoteport}`.replace('::ffff:', '');
        }
        return this._remoteName;
    }

}