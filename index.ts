import Config from './Config.js'
import Interceptor from './Interceptor.js';
import meow, { AnyFlags, Flag, Result } from 'meow';

process.on('uncaughtException', (err: Error) => {
    console.error('global uncaughtException:', err);
})

const DestType: Flag<'string', undefined> = {
    type: 'string',
    alias: 'd',
    // default: undefined,
    isRequired: true,
    isMultiple: false,
}

const localport: Flag<'number', 4444> = {
    type: 'number',
    alias: 'l',
    default: 4444,
    isRequired: false,
    isMultiple: false,
}

interface Options extends AnyFlags {
    destination: Flag<'string', 'eu1.ethermine.org:4444'>;
    localport: Flag<'number', 0>;
};

// curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x31343757D6Fc7C41567543BEb9da982E09b6a09F", "latest"],"id":1}' eu1.ethermine.org:4444

const cli = meow<Options>(`
	Usage
	  $ nodevfee --destination <ip:port> --fee <fee> 0x<my-ether-address>

	Options
	  --destination, -d ether_pool_address:port
      --localport, -l local_port local port to listen on

	Examples
	  $ nodevfee --destination eu1.ethermine.org:4444 0x31343757D6Fc7C41567543BEb9da982E09b6a09F
`, {
	importMeta: import.meta,
	flags: {
		destination: {
			type: 'string',
			alias: 'd',
            default: 'eu1.ethermine.org:4444',
            isRequired: true,
            isMultiple: false,
		},
		localport: {
			type: 'number',
			alias: 'l',
            default: 0,
            isRequired: false,
            isMultiple: false,
		}
	}
});

let myEtherAddress = "0x31343757D6Fc7C41567543BEb9da982E09b6a09Fl";
if (cli.input) {
    myEtherAddress = cli.input[0];
}

cli.input
const config = new Config({
    destination: cli.flags.destination as string,
    localPort: cli.flags.localport as number,
    myEtherAddress,
});

new Interceptor(config).start();
