import net from "node:net";
import type { JsonRpcRequest } from "../src/models.js";

export const EthAddr1 = '0x1234567890abcdef1234567890abcdef12345678';
export const EthAddr2 = '0x01234567890abcdef1234567890abcdef1234567';
const EOLReg = /[\r\n]+/g;

export default class FakePoolServer {
    private server: net.Server;
    private sessionId = 0;
    private connextions: { [key: number]: FakePool } = {};

    private nextConnexionTriger?: () => void;

    constructor(private port: number) {
        this.server = net.createServer((localsocket: net.Socket) => {
            const id = this.sessionId++;
            const cnx = new FakePool(localsocket, id);
            this.connextions[id] = cnx;
            if (this.nextConnexionTriger) {
                this.nextConnexionTriger();
                this.nextConnexionTriger = undefined;
            }
            cnx.localsocket.once('close', () => {
                delete this.connextions[id];
            })
        });
    }

    async start(): Promise<void> {
        await new Promise<void>((resolve) => { this.server.listen(this.port, resolve) });
        console.log('FakePoolServer server is listening')
    }

    get connectionsCount(): number {
        return Object.keys(this.connextions).length;
    }

    waitforConnextion(): Promise<void> {
        return new Promise<void>((a)=> this.nextConnexionTriger = a);
    }
}

export class FakePool {
    constructor(public localsocket: net.Socket, public sessionId: number) {
        this.localsocket.on('data', (data: Buffer) => {
            const datas = data.toString().trim().split(EOLReg);
            for (const data of datas) {
                try {
                    const req = JSON.parse(data) as JsonRpcRequest;
                    switch (req.method) {
                        case 'eth_submitLogin':
                            // login Id: req.params[0];
                            localsocket.write(`{"id":${req.id},"jsonrpc":"2.0","result":true}\r\n`);
                        break;
                        case 'eth_getWork': // {"id":2,"method":"eth_getWork","params":[],"jsonrpc":"2.0"}
                            localsocket.write(`{ "id": 0, "jsonrpc": "2.0", "result":["0xdf1534f806c43ba4f1917b6d8d93387661f22386806738fd68477861ee49dc79","0xe19e4e64493d6a4177a770d71f1617ec0c7df2f20ae05afe50aabea9abfe51b6","0x00000000ffff00000000ffff00000000ffff00000000ffff00000000ffff0000","0xda1812"] }\r\n`);
                        break;
                        default:
                            console.log(`Fake pool not implemented ${req.method}`);
                    }
                } catch(e) {
                    console.error(e);
                }
            }
        })
    }
}
