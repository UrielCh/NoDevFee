import Config from "./Config.js";
import net from 'node:net';
import fs from 'node:fs';
import chalk from 'chalk';
import type { JsonRpcResponse, MineMessage } from "./models.js";

const EOLReg = /[\r\n]+/g;
const EOL = '\r\n';

// 13, \r is optional
const EOLByte = new Uint8Array([10]);

export default class Interceptor {
    private minerMessage = 0;
    private poolMessage = 0;

    private poolsocket: net.Socket

    private ready!: Promise<void>;
    private minerBuffer: Buffer = Buffer.from([]);

    constructor(private config: Config, public minerSocket: net.Socket, public id: number) {
        const { myEtherAddress } = this.config;

        const { remoteport, remotehost } = this.config;
        this.poolsocket = new net.Socket()

        // used to get connexion notification
        this.ready = new Promise<void>((resolve) => {
            this.poolsocket.connect(remoteport, remotehost, () => {
                console.log(`>>> connection #${chalk.greenBright(this.id)} from ${this.remoteName}`)
                resolve();
            })
        })

        /**
         * incomming local request
         */
        const onMinerData = (data: Buffer) => {
            // Ether protocol allow multi-line bulk messages, each line end with \r\n
            if (!this.minerBuffer.length) {
                this.minerBuffer = data;
            } else {
                this.minerBuffer = Buffer.concat([this.minerBuffer, data]);
            }

            let from = 0;
            const toFoward = [];

            let lastEOL = this.minerBuffer.indexOf(EOLByte, from);
            if (lastEOL === -1) {
                console.log(this.minerBuffer.toString())
                console.log(this.minerBuffer)
            }
            while (lastEOL >= 0) {
                const line = this.minerBuffer.toString('utf-8', from, lastEOL);
                this.minerMessage++;
                const message: MineMessage = JSON.parse(line);
                console.log(`${chalk.yellow("SND:")} ${this.localName} -> ${this.remoteName} ${line}`);
                if (message.method === 'eth_submitLogin') {
                    const ethAddressFull = message.params[0];
                    const ethAddress = ethAddressFull.replace(/\..*/, '');
                    if (myEtherAddress != ethAddress) {
                        console.log(`Redirect ${chalk.yellow(ethAddressFull)} to ${chalk.green(myEtherAddress)}`);
                        // fs.appendFile("address_changed.txt", `${new Date().toISOString()} - replace: ${ethAddressFull} by ${myEtherAddress}\n`, (msg) => { });
                        message.params[0] = message.params[0].replace(ethAddress, myEtherAddress);
                    }
                }
                toFoward.push(JSON.stringify(message));
                toFoward.push(EOL);
                from = lastEOL + 2;
                lastEOL = this.minerBuffer.indexOf(EOLByte, from);
            }
            if (from) {
                this.minerBuffer = this.minerBuffer.subarray(from);
            }
            if (toFoward.length) {
                const flushed = this.poolsocket.write(toFoward.join(''));
                if (!flushed) {
                    console.log(' remote not flused; pausing local')
                    this.minerSocket.pause()
                }
            }
            if (this.minerBuffer.length > 2000) {
                // that look like an fake qury, protect futher Buffer allocation attaque
                this.minerBuffer = Buffer.from([]);
            }
        };

        const onPoolData = (data: Buffer) => {
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
            const flushed = this.minerSocket.write(data)
            if (!flushed) {
                console.log('local not flushed; pausing remote')
                this.poolsocket.pause()
            }
        }

        const onMinerDrain = () => {
            console.log(`${this.localName} - resuming pool socket`)
            this.poolsocket.resume()
        };

        const onMinerClose = () => {
            console.log(`${this.localName} - closing Miner cnx`)
            this.poolsocket.end()
            unRegisterMinerEvents();
        }

        const onPoolClose = () => {
            console.log(`${this.remoteName} - closing Pool cnx`)
            this.minerSocket.end()
            unRegisterPoolEvents();
        };

        const unRegisterMinerEvents = (): void => {
            console.log('unRegisterMinerEvents')
            this.minerSocket.off('data', onMinerData);
            this.minerSocket.off('drain', onMinerDrain)
            this.minerSocket.off('close', onMinerClose)
        };

        const unRegisterPoolEvents = (): void => {
            console.log('unRegisterPoolEvents')
            this.poolsocket.off('data', onPoolData)
            this.poolsocket.off('close', onPoolClose)
        };

        /**
         * incomming local request
         */
        this.minerSocket.on('data', onMinerData);
        /**
         * RCV response from remote pool
         */
        this.poolsocket.on('data', onPoolData)

        this.minerSocket.on('drain', onMinerDrain)
        // pool disconnection triger miner disconection
        this.minerSocket.on('close', onMinerClose)
        // miner disconnection triger pool disconection
        this.poolsocket.on('close', onPoolClose)
    }

    private _localName = '';
    get localName(): string {
        if (!this._localName) {
            this._localName = `${this.minerSocket.remoteAddress}:${this.minerSocket.remotePort}`.replace('::ffff:', '');
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