import Config from "./Config.js";
import net from "node:net";
import Interceptor from "./Interceptor.js";

export default class InterceptorServer {
    private server: net.Server;
    private sessionId = 0;
    private connextions: { [key: number]: Interceptor } = {};
    // private ready: Promise<any>;

    constructor(private config: Config) {
        this.server = net.createServer((localsocket: net.Socket) => {
            const id = this.sessionId++;
            const cnx = new Interceptor(config, localsocket, id);
            this.connextions[id] = cnx;
            cnx.minerSocket.once('close', () => {
                delete this.connextions[id];
            })
        });
    }
    
    async start(): Promise<void> {
        console.log(`redirecting connections from 0.0.0.0:${this.config.localPort} to ${this.config.remotehost}:${this.config.remoteport}`)
        await new Promise<void>((resolve) => {this.server.listen(this.config.localPort, resolve)});
        console.log('InterceptorServer server is listening');
    }

    get connectionsCount(): number {
        return Object.keys(this.connextions).length;
    }

    get connections(): Interceptor[] {
        return Object.values(this.connextions);
    }
}
