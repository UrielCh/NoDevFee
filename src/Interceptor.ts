import Config from "./Config.js";
import net from 'node:net';
import fs from 'node:fs';
import chalk from 'chalk';
import type { JsonRpcResponse, MineMessage } from "./models.js";

const EOLReg = /[\r\n]+/g;
const EOL = '\r\n';

export default class Interceptor {
    private minerMessage = 0;
    private poolMessage = 0;

    private remotesocket: net.Socket
    private ready!: Promise<void>;

    constructor(private config: Config, public localsocket: net.Socket, public id: number) {
        const { myEtherAddress } = this.config;
        this.remotesocket = this.connectRemote()

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
        
        this.ready = new Promise<void>((resolve) => {
            remotesocket.connect(remoteport, remotehost, () => {
                console.log(`>>> connection #${chalk.greenBright(this.id)} from ${this.remoteName}`)
                resolve();
            })
        })

        // local disconnection triger remote disconection
        remotesocket.once('close', () => {
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
            this._remoteName = `${remotehost}:${remoteport}`.replace('::ffff:', '');
        }
        return this._remoteName;
    }

    get isReady(): Promise<void> {
        return this.ready;
    }

}