import test from 'ava';
import net from 'node:net';
import Config from '../src/Config.js';
import InterceptorServer from '../src/InterceptorServer.js';
import FakePoolServer, { EthAddr1 } from './FakePoolServer.js';
import { PromiseSocket } from 'promise-socket';

const localPort = 7002;

test('connection counter should follow cnx count()', async (t) => {
    const pool = new FakePoolServer(7001)
    await pool.start();
    const startCnx = pool.waitforConnextion();
    const interceptors = new InterceptorServer(new Config({ destination: 'localhost:7001', myEtherAddress: EthAddr1, localPort }));
    await interceptors.start();
    const minerSocket = new PromiseSocket(new net.Socket());
    await minerSocket.connect(localPort, 'localhost');
    await startCnx;
    t.is(interceptors.connectionsCount, 1, 'interceptor has 1 connection');
    await interceptors.connections[0].isReady;
    t.is(pool.connectionsCount, 1, 'pool has 1 connection');
    // login
    await minerSocket.write(Buffer.from('{"id":1,"method":"eth_submitLogin","worker":"eth1.0","params":["0x31343757D6Fc7C41567543BEb9da982E09b6a09F.win","x"],"jsonrpc":"2.0"}\r\n'));
    // response
    const resp = await minerSocket.read();
    if (!resp) return t.fail('login request failed');
    t.regex(resp.toString(), /"result"\s*:\s*true/, 'login request is accepted');
    await minerSocket.write(Buffer.from('{"id":2,"method":"eth_getWork","params":[],"jsonrpc":"2.0"}\r\n'));
    const resp2 = await minerSocket.read();
    if (!resp2) return t.fail('login request failed');
    t.regex(resp2.toString(), /"result"\s*:\s*\[/, 'task receved');
    await minerSocket.end();
    t.pass();
});
