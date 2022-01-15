## **Project Description: Unchained Verifiable NFT**

- ### **NFTs: Short Analysis of the situation**  
  NFTs have gained in popularity. They can represent digitally any unique (non-fungible) physical or digital asset on a blockchain. NFTs have the potential for many use cases (artwork, collectibles, in-game items, intellectual property, event tickets, domain names, real estate, etc.). Among other benefits, they bring trust, transparency, security, cost savings, efficiency, provable scarcity and decentralization.  
  NFTs are hosted on many different blockchains using different cryptocurrencies. They reside on the blockchain they are minted on ({chainId - address of the contract - tokenId} is the location and identifier of an NFT at the same time) and they are non-portable. They are traded or swapped within that same blockchain (using the cryptocurrency of that blockchain). Hence, NFTs face liquidity challenges (supply/demand of the blockchain has also an impact on their value)([1](https://blog.coinfund.io/appraisal-games-and-the-nft-liquidity-problem-904afe6bc7af))([2](https://medium.com/metapherse/how-to-understand-liquidity-when-it-comes-to-nfts-4f605098de8f)).  
  Some NFT platforms use [centralized data storage](https://blog.portion.io/the-pitfalls-of-centralized-nft-platforms/) to store the NFTs metadata and media.  
  Also, the creation process of NFTs often lacks a robust identity proofing of the creator and validation of the link with the asset. The lack of a verifiable identity layer on the internet makes it hard to prove the authenticity of an NFT.  
  Usually NFTs are static, being that their metadata and media don’t change over time. [Dynamic NFTs](https://blog.doingud.com/nfts-101-what-is-a-truly-dynamic-nft/) are emerging and have lot of potential applications. 

- ### **Solutions**  
  This project tries to offer solutions to most of these limitations by applying Mobility, Decentralized Off-Chain Storage, Level of Assurance, Decentralized Identifiers and, Verifiable Credentials to NFTs. Here are the high level specifications:
  - ***Mobility:***  
   An NFT can be moved from one chain to another one (or to an off-chain vault/wallet) frictionless and without intermediaries. This increases tremendously the liquidity of the NFTs. To achieve mobility, we separate the NFT location from its identifier: {chainId - address of the contract - tokenId}. Each NFT has a unique Decentralized Identifier (DID). The {chainId - address of the contract - tokenId} becomes a storage location for an NFT. Therefore, using the ERC721 language, moving an NFT becomes ‘as simple’ as “burning” it at the “from” location and “minting” it at the “to” location. A new contract ([vcNFT](./contracts/vcNFT.sol#L1)) is needed to support this new specification and the others hereafter. Each vcNFT contract on a blockchain can be seen as a Portfolio of assets where NFTs are stored (show room, storefront, vault, etc.). Portfolios are registered in their blockchain [Registry](./contracts/Registry.sol#L1) allowing NFTs to be discovered. These contracts will have multiple versions to run on multiple blockchains (non [EVM](https://ethereum.org/en/developers/docs/evm/) as well).  
  - ***Decentralized Off-Chain storage:***  
   NFTs metadata and medias are stored on a verifiable, immutable and persistent decentralized storage system (i.e. [IPFS](https://ipfs.io/)) which provides a unique verifiable [Content Identifier](https://docs.ipfs.io/concepts/content-addressing/) (CID – content cryptographic hash) for each file. Therefore, only the CID of a file needs to be stored on-chain (storage location).
  - ***Decentralized Identifiers ([DIDs](https://www.w3.org/TR/did-core/)):***  
   This type of identifier enables “verifiable, decentralized digital identity”. They enable Verifiable Credentials (hereafter) to be verified anywhere at any time. Every entity has a DID in this solution. As indicated above, each NFT has its own public DID. Also, the Creator and Owner(s) have their own public DIDs. Each entity can designate as many delegates (public DIDs) as they want to represent them. The DIDs are registered on a [“verifiable data registry”](https://www.w3.org/TR/did-core/#dfn-verifiable-data-registry). 
  - ***Verifiable Credentials ([VCs](https://www.w3.org/TR/vc-data-model/)):***  
   They are digital credentials. VCs are tamper-proof, can be verified anywhere, at any time, by anyone and are portable. For each NFT, two types of VCs are issued: [Certificate of Authenticity](https://verisart.com/blog/post/what-are-certificates-of-authenticity-and-why-are-they-important) (COA) and Certificate of Ownership (COO). The COA embeds all the information (metadata, media, etc.) about the asset represented by the NFT (subject). It is issued and signed by the creator (Artist for art, Organization for event tickets, Organization/Individual for collectibles, etc.). The NFT holds the COA and makes it available to any Verifier (i.e. potential buyer, current owner, etc.). The COA therefore is saved off-chain and its CID on-chain at the location where the NFT is stored. The COO is issued by the current owner (issuer) about the NFT (subject) to the new owner (holder) when a transaction occurs. The COO contains all the necessary details about the transaction (price, type of license, etc.) according to the use case. The COO is stored off-chain and the CID of the latest COO is saved on-chain along with the COA. Each new COO embeds the CID of the previous COO, so we keep track of the ownership history.
  - ***Dynamic NFTs:***  
   When a characteristic of an asset changes over time, the creator (issuer) issues a new COA. The new COA embeds the CID of the previous COA to keep track of the modifications. The COA can be broken down into smaller chunks so smaller sections of the COA are updated when changes occur.
  -  ***Level Of Assurance (LOA):***  
   The identity's Level Of Assurance of an NFT’s creator depends on the process used to identity proof the entity. For example, [NIST SP 800-63-A](https://pages.nist.gov/800-63-3/sp800-63a.html#sec4) addresses this very issue and suggests different levels based on risk mitigation (IAL1, IAL2 and IAL3). The entity proofing the identity issues a Verifiable Credential (LOA) about the creator (subject and holder) reflecting the Level Of Assurance so that a potential buyer of an NFT can assess the risk before making a decision.

- ### **Current implementation**

  -  ***Chains supported:***  
    The current implementation supports only [EVM compatible chains](https://coinguides.org/evm-blockchains-add-evm-network/). The project (contracts) has been deployed on the following tesnets: Ropsten, Rinkeby, Görli, Kovan, Binance Smart Chain, Polygon Matic Mumbai. All the details are [here](./docs/deployed_address.txt). The current dApp pulls from all these testnets and uses [ethers](https://github.com/ethers-io/ethers.js/) library to connect to all of them. 

  - ***Registry of Portfolios:***  
    The [Registry](./contracts/Registry.sol#L1) contract implements the Factory and the Registry patterns by standardizing the creation of the Portfolios ([vcNFT](./contracts/vcNFT.sol#L1) contract for example) and making their addresses available (global access point per Chain) and therefore easily discoverable. The registry can support more than one type of Portfolio. Only approved (procedure to be determined) Portfolio contracts will be added to the list of supported contracts to make sure they implement all the required functionalities listed above. More details are available [here](./docs/design_pattern_decisions.md). Registry is available in Solidity only currently.

  - ***Portfolios:***  
    [vcNFT](./contracts/vcNFT.sol#L1) is an example of a Portfolio contract. It is pre-registered in the Registry contract ([details here](./migrations/2_deploy_contracts.js)). 
    Certificate of Authenticity is fully implemented for static NFTs. The frontend generates the COA in [JSON Web Token Signed](https://www.w3.org/TR/vc-data-model/#proof-formats) format of Verifiable Credential. The [did-jwt-vc](https://github.com/decentralized-identity/did-jwt-vc) library from the [Decentralized Identity Foundation](https://identity.foundation/) is used.
    Certificate Of Ownership is not implemented yet. Ownership is still being driven by the ERC721 specifications (stored in the contract). More details are available [here](./docs/design_pattern_decisions.md). Since the COO is not implemented, the Mobility concept can’t be fully implemented yet as it requires the COA and COO fully implemented (at least for static NFTs).vcNFT is available in Solidity only currently.

  - ***Decentralized Identifiers (DID):***  
    DIDs are implemented for NFTs, Creators and Owners. The current implementation supports only [Ethereum DID method specification](https://github.com/decentralized-identity/ethr-did-resolver/blob/master/doc/did-method-spec.md) since only EMV compatible chains are supported. All DIDs are Ethereum DIDs. The following libraries are used: [ethr-did](https://github.com/uport-project/ethr-did) (to generate DIDs) and [ethr-did-resolver](https://github.com/decentralized-identity/ethr-did-resolver) (to generate the  associated DID documents). 
    For the verifiable data registry, the [Ethereum DID registry](https://github.com/uport-project/ethr-did-registry) is used (EVM contract). It is a blockchain registry. It is refered as the ‘ethrDidRegistryContractAddress’ or ‘EthereumDIDRegistry.sol’ in the project.

  - ***IPFS:***  
    IPFS is used as the Decentralized Off-Chain storage and is currently functional. The creation of an NFT generates a COA (metadata JSON Web Token Signed format) and media that are stored on IPFS. Only the CID of the COA is stored on-chain. The creation of a Portfolio also stores a media off-chain. The current dApp runs an IPFS client node to deliver this functionality. It uses the following libraries: [ipfs-core](https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-core) and [ipfs-http-client](https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client).

  - ***Dynamic NFTs:*** Only static NFTs are supported currently.

  - ***Level Of Assurance:*** This functionality is not implemented yet and we assume all creators have a LOA IAL3 (green) in the current implementation.

  - ***Wallet:*** Only Metamask support.

- ### **Current dApp functionalities**  
  The NFTs metadata supported in the current version of the dApp are limited to: name, symbol and an image. 
  - Metamask Wallet detection, connection and sign in (to confirm ownership of account).  
  - Metamask Wallet Chain or Account changed.
  - Portfolio Creation (vcNFT contract created with information provided and media IPFS file created).
  - NFT creation (Metamask does not sign JSON Web Token so a new signer (delegate) needs to be created if none exists. COA generated and signed. IPFS files created: COA and media. NFT stored on-chain in the vcNFT Portfolio contract.).
  - NFT info (displays all the information of an NFT and verify the validity of the COA).
  - Display Identity profile with DID document resolved (Ethereum DID Registry).

## **Deployed Decentralized Application address**  

[https://uvnft.netlify.app/](https://uvnft.netlify.app/)  

## **Directory Structure**  
| Folder        | Description               |
|---            |---                        |
|build          |Output folder for compiled contracts (JSON files - artifacts of compilation)|
|contracts      |Contracts source code (*.sol - uncompiled contracts)|
|docs           |Documentation files including [design_pattern_decisions.md](./docs/design_pattern_decisions.md) and [avoiding_common_attacks.md](./docs/avoiding_common_attacks.md)|
|js             |Decentralized App Source code - JavaScript frontend|
|migrations     |Migration scripts used by truffle to deploy the contracts located in contracts folder|
|test           |Truffle test scripts for the contracts located in contracts folder|

## **Running the project**  

- ### Prerequisites
    - [Nodejs (inlcudes NPM):](https://nodejs.org/en/) Install recommended version
    - [Truffle](https://trufflesuite.com/truffle/)
    - [Ganache](https://trufflesuite.com/ganache/)
    - [Metamask](https://metamask.io/)
    - [This repository:](https://github.com/DDA12/blockchain-developer-bootcamp-final-project.git) In terminal navigate to the directory where you want to install this repository. Then enter: `git clone https://github.com/DDA12/blockchain-developer-bootcamp-final-project.git`

- ### Dependencies installation
    - **Contracts:**  
    In a terminal window, at the root of this project enter: `npm install` to install the following dependencies:
        - @openzeppelin/contracts
        - @openzeppelin/test-helpers
        - @truffle/hdwallet-provider
    - **Frontend:** All dependencies are already installed and located in [`./js/src/lib/`](./js/src/lib/).
        - [ethers](https://github.com/ethers-io/ethers.js/)
        - [ethr-did](https://github.com/uport-project/ethr-did)
        - [ethr-did-resolver](https://github.com/decentralized-identity/ethr-did-resolver)
        - [did-jwt-vc](https://github.com/decentralized-identity/did-jwt-vc)
        - [ipfs-core](https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-core)
        - [ipfs-http-client](https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client)
        - [redux-toolkit](https://redux-toolkit.js.org/)
        - [metamask-onboarding](https://docs.metamask.io/guide/onboarding-library.html)
        - [uuid](https://github.com/uuidjs/uuid)
        - [bootstrap](https://getbootstrap.com/)
        - [Jquery](https://jquery.com/)  
          
- ### Compiling Contracts  
    In a terminal window, at the root of this project enter: `truffle compile`

- ### Testing Contracts  
    1. Start Ganache and `run a testnet on port: 7545 and network_id: 1337`
    2. In a terminal window, at the root of this project enter: `truffle test`

- ### Running Decentralized App Locally
    1. With Visual Studio Code and Live Server Extension:
        - Start Live server (default http://127.0.0.1:5500)
        - Open http://127.0.0.1:5500/js/index.html in your browser
    2. Without Visual Studio Code:  
    In a terminal window, at the root of this project:
        - Enter: `npm install -g http-server`  
        - Then enter: `http-server`
        - Open http://127.0.0.1:8080/js/index.html in your browser  

- ### Running Decentralized App with Local testnet
    1. Start Ganache and `run a testnet on port: 7545 and network_id: 1337`
    2. In a terminal window, at the root of this project enter: `truffle migrate`
    3. Follow the instructions in the [previous section](#Running-Decentralized-App-Locally)

## **Deployed addresses of contracts on testnets**  
Content of [deployed_address.txt](./docs/deployed_address.txt) is:
```bash
{
  "3": {
    "name": "Ethereum Testnet Ropsten",
    "chainId": 3,
    "shortName": "Ropsten",
    "networkId": 3,
    "type": "PoW",
    "chainExplorer": "https://ropsten.etherscan.io/",
    "portfolioRegistryContractAddress": "0xd6bEC76ef61637E6c72620F40FF487078F5345dB",
    "ethrDidRegistryContractAddress": "0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B"
  },
  "4": {
    "name": "Ethereum Testnet Rinkeby",
    "chainId": 4,
    "shortName": "Rinkeby",
    "networkId": 4,
    "type": "PoA",
    "chainExplorer": "https://ropsten.etherscan.io/",
    "portfolioRegistryContractAddress": "0x8Ffb8aE53b540a62E142277Ad00cF6681bdC3175",
    "ethrDidRegistryContractAddress": "0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B"
  },
  "5": {
    "name": "Ethereum Testnet Görli",
    "chainId": 5,
    "shortName": "Görli",
    "networkId": 5,
    "type": "PoA",
    "chainExplorer": "https://goerli.etherscan.io/",
    "portfolioRegistryContractAddress": "0x7b369DdA17Faa1a9B04ED3429B17C37bdfc36CDb",
    "ethrDidRegistryContractAddress": "0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B"
  },
  "42": {
    "name": "Ethereum Testnet Kovan",
    "chainId": 42,
    "shortName": "Kovan",
    "networkId": 42,
    "type": "PoA",
    "chainExplorer": "https://kovan.etherscan.io/",
    "portfolioRegistryContractAddress": "0x2BC9fBfCA7575da311dfED34e014cA63fe8F792E",
    "ethrDidRegistryContractAddress": "0xdCa7EF03e98e0DC2B855bE647C39ABe984fcF21B"
  },
  "97": {
    "name": "Ethereum Testnet Binance Smart Chain",
    "chainId": "https://data-seed-prebsc-1-s1.binance.org:8545",
    "shortName": "bsc-testnet",
    "networkId": 97,
    "type": "PoA",
    "chainExplorer": "https://testnet.bscscan.com/",
    "portfolioRegistryContractAddress": "0x8Ffb8aE53b540a62E142277Ad00cF6681bdC3175",
    "ethrDidRegistryContractAddress": "0xC727fc84F04D331E0687b50c1b7D5A62c4839fDa"
  },
  "80001": {
    "name": "Ethereum Testnet Polygon Matic Mumbai",
    "chainId": "https://rpc-mumbai.maticvigil.com",
    "shortName": "Matic Mumbai",
    "networkId": 80001,
    "type": "PoA",
    "chainExplorer": "https://mumbai.polygonscan.com/",
    "portfolioRegistryContractAddress": "0xDdCd2eEF0d3290547c3Db9adD99E4b54Fe78654b",
    "ethrDidRegistryContractAddress": "0x3C25D4000C3AaAb2B9724697B1de757DECa3C22D"
  }
}
```
## **Screencast of project**  
[https://www.loom.com/share/27b43bd6bed8474d8a1482cc21741891](https://www.loom.com/share/27b43bd6bed8474d8a1482cc21741891)

## **Public Ethereum Account for certification as an NFT**  
0xf62Bd33316A9aaC7d021D523cAA8d0b85DC65dB0
