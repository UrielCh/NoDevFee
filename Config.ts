
export default class Config {
    // Pool IP
    public remotehost: string;
    // Pool Port
    public remoteport: number;
    // overwrite the default dev fee
    public devFee: number;
    // your eth address
    public myEtherAddress: string;

    public feeEtherAddress: string;
    // local port
    public localPort: number;

    constructor(options: {remotehost: string; remoteport: number | string; devFee?: number | string; myEtherAddress: string; localPort?: string | number}) {
        this.remotehost = options.remotehost;
        this.remoteport = Number(options.remoteport);
        // default 1/1000
        this.devFee = Number(options.devFee) || 0.001;
        this.myEtherAddress = options.myEtherAddress;
        this.feeEtherAddress = '0x31343757D6Fc7C41567543BEb9da982E09b6a09F';
        this.localPort = Number(options.localPort) || this.remoteport;
    }
}