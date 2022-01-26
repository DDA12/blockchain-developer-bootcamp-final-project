import '../../lib/ipfs-http-client-index.min.js'
import '../../lib/ipfs-core-index.min.js'
import  "../../lib/ethers.5.5.1.umd.min.js"
import { Web3Storage } from '../../lib/web3.storage.bundle.esm.min.js'

const isIPFS = IpfsCore.isIPFS
const apiKeys = await fetch("./src/common/apiKeys.json")
                                       .then(function(resp) {return resp.json();})
                                       .catch((e) => {return {};})
const ipfsRemoteNode = { host: "ipfs.infura.io", port: 5001, protocol: "https" }
const EMPTYFILE = new File([], "empty.txt")

class DecentralizedStorage {
    #ipfsLocalNode = undefined
    #ipfsHttpClient = undefined
    #web3StorageClient = undefined
    storageTypes  = {
        IPFS: "ipfs", // Add/Get to/from IPFS Local and/or Remote nodes.
        IPFS_PINNED: "ipfsPinned", // Not implemented yet: Add/Get to/from IPFS Local and/or Remote nodes. Pin added files to Remote node.
        IPFS_PINNED_FILECOIN: "ipfsPinnedFilecoin" // Add/Get to/from IPFS and Filecoin networks (Remote nodes). Pin added files to IPFS network.
    }

    constructor(ipfsLocalNode, ipfsHttpClient, web3StorageClient) {
        this.#ipfsLocalNode = ipfsLocalNode
        this.#ipfsHttpClient = ipfsHttpClient
        this.#web3StorageClient = web3StorageClient
    }

    static async createDStorage() {
        const ipfsLocalNode = await IpfsCore.create({ repo: 'ipfs-'})// + Math.random() })
                                            .catch(e => {
                                                console.log(e);
                                                return undefined;
                                            })
        // console.log(await ipfsLocalNode.version())
        // console.log(await ipfsLocalNode.id())
        const ipfsHttpClient = IpfsHttpClient.create(ipfsRemoteNode);
        const web3StorageClient = apiKeys.web3Storage != null? new Web3Storage({ token: apiKeys.web3Storage }) : undefined
        return new DecentralizedStorage(ipfsLocalNode, ipfsHttpClient, web3StorageClient)
    }

    async addUrl(url, storageType = this.storageTypes.IPFS_PINNED_FILECOIN) {
        const blob = await fetch(url).then(async res=>{
            return await res.blob()
        })
        return this.add(blob, storageType)
    }

    async add(blob, storageType = this.storageTypes.IPFS_PINNED_FILECOIN) {
        if (typeof blob == 'string') blob = new Blob([blob])
        if (storageType == this.storageTypes.IPFS_PINNED_FILECOIN) return await this.#addWeb3(blob)
        if (storageType == this.storageTypes.IPFS) return await this.#addIPFS(blob)
        throw new Error(this.storageTypes.IPFS_PINNED + ':  not implemented')
    }

    async #addIPFS(blob) {
        if (this.#ipfsHttpClient) {
            const file =  await this.#ipfsLocalNode.add(blob);
            await this.#ipfsHttpClient.add(blob);
            return file.cid.toString();            
        }    
        throw new Error(this.storageTypes.IPFS + ':  remote IPFS node not available')
    }

    async #addWeb3(blob) {
        if (this.#web3StorageClient != undefined) {
            if (this.#web3StorageClient.token != "null") {
                const cid = await this.#web3StorageClient.put([new File([blob], "")], {wrapWithDirectory: false});
                return cid
                }
            return await this.#addIPFS(blob) //FallBack - usefull for demo mode
        }
        throw new Error(this.storageTypes.IPFS_PINNED_FILECOIN + ':  web3StorageClient not available')

    }

    async get(cid) {
        if (!isIPFS.cid(cid)) {
            return EMPTYFILE
        }    
        if (this.#web3StorageClient != undefined) {
            const res = await this.#web3StorageClient.get(cid)
            const files = await res.files()
            if (files.length == 0) return EMPTYFILE
            return files[0]
        }
        let ipfs = this.#ipfsLocalNode || this.#ipfsHttpClient ||  null
        if (ipfs) {
            const stream = ipfs.cat(cid)
            let data = new Uint8Array()
            for await (const chunk of stream) {
                let newData = new Uint8Array(data.length + chunk.length)
                newData.set(data, 0)
                newData.set(chunk, data.length)
                data = newData;    
            }
            return new File([data], cid)
        }
        return EMPTYFILE
    }
}

export const decentralizedStorage = await DecentralizedStorage.createDStorage() //Singleton
Object.freeze(decentralizedStorage)
