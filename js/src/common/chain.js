
export const chainList = {
    // 1: {"name":"Ethereum Mainnet","chainId":1,"shortName":"Mainnet","networkId":1, "type": "PoW"},
    3: {"name":"Ethereum Testnet Ropsten","chainId":3,"shortName":"Ropsten","networkId":3, "type": "PoW", "chainExplorer": "https://ropsten.etherscan.io/"},
    4: {"name":"Ethereum Testnet Rinkeby","chainId":4,"shortName":"Rinkeby","networkId":4, type: "PoA", "chainExplorer": "https://ropsten.etherscan.io/"},
    5: {"name":"Ethereum Testnet Görli","chainId":5,"shortName":"Görli","networkId":5, type: "PoA", "chainExplorer": "https://goerli.etherscan.io/"},
    42: {"name":"Ethereum Testnet Kovan","chainId":42,"shortName":"Kovan","networkId":42, type: "PoA", "chainExplorer": "https://kovan.etherscan.io/"},    
    97: {"name":"Ethereum Testnet Binance Smart Chain","chainId":"https://data-seed-prebsc-1-s1.binance.org:8545","shortName":"bsc-testnet","networkId":97, type: "PoA", "chainExplorer": "https://testnet.bscscan.com/"},    
    80001: {"name":"Ethereum Testnet Polygon Matic Mumbai","chainId":"https://rpc-mumbai.maticvigil.com","shortName":"Matic Mumbai","networkId":80001, type: "PoA", "chainExplorer": "https://mumbai.polygonscan.com/"},    
    1337: {"name":"Ethereum Testnet LocalHost","chainId":"http://127.0.0.1:7545","shortName":"localHost", "networkId":1337, type: "PoW"}
}

export const ipfsGatewayUrl = "https://ipfs.io/ipfs/";

// export const buildContractsPath = "./assets/contracts/";
export const buildContractsPath = "../../../../../build/contracts/";
