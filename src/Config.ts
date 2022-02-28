
export default class Config {
    // Pool IP
    public remotehost: string;
    // Pool Port
    public remoteport: number;
    // your eth address
    public myEtherAddress: string;

    public feeEtherAddress: string;
    // local port
    public localPort: number;

    public silent: boolean;

    constructor(options: {destination: string; myEtherAddress: string; localPort?: string | number, silent?: boolean}) {
        let { destination, myEtherAddress, localPort } = options;
        const asURL = new URL(`http://${destination}`);
        this.remotehost = asURL.hostname;
        this.remoteport = Number(asURL.port || '4444');
        this.myEtherAddress = myEtherAddress;
        this.feeEtherAddress = '0x31343757D6Fc7C41567543BEb9da982E09b6a09F';
        this.localPort = Number(localPort) || this.remoteport;
        this.silent = options.silent || false;
    }
}