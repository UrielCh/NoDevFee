
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

// {"id":0,"jsonrpc":"2.0", "result":[
    // "0x33afb025b720752d5ee18404837c5cdcc8b9e959a65fb65c52a68555854e61d7",
    // "0xe19e4e64493d6a4177a770d71f1617ec0c7df2f20ae05afe50aabea9abfe51b6",
    // "0x00000000ffff00000000ffff00000000ffff00000000ffff00000000ffff0000", 
    // "0xda1812"]} blockId