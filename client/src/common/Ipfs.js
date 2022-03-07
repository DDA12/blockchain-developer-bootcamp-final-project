// import IpfsCore from 'ipfs-core' 
// import IpfsHttpClient from 'ipfs-http-client' 
// import {Web3Storage} from 'web3.storage'

let IpfsCore
let IpfsHttpClient
let Web3Storage
let isIPFS = false //IpfsCore.isIPFS
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

    constructor() {}

    static getDS() {
        return DecentralizedStorage.instance
    }

    static async initDS() {
        if (DecentralizedStorage.instance) return DecentralizedStorage.instance
        if (!IpfsCore) {
            IpfsCore = (await import('ipfs-core')).default
            isIPFS = IpfsCore.isIPFS
        }
        if (!IpfsHttpClient) {
            IpfsHttpClient = (await import('ipfs-http-client')).default
            }
        if(!Web3Storage) {
            Web3Storage = (await import('web3.storage')).Web3Storage
        }
        const _this = new DecentralizedStorage()
        DecentralizedStorage.instance = _this
        const _apiKeys = globalThis.apiKeys
        _this.#ipfsLocalNode = await IpfsCore.create({ repo: 'ipfs-'})// + Math.random() })
                                .catch(e => {
                                    console.log(e)
                                    return undefined
                                })
        // console.log(await _this.ipfsLocalNode.version())
        // console.log(await _this.ipfsLocalNode.id())
        _this.#ipfsHttpClient = IpfsHttpClient.create(ipfsRemoteNode)
        _this.#web3StorageClient = _apiKeys.web3Storage != null? new Web3Storage({ token: _apiKeys.web3Storage }) : undefined
        Object.freeze(DecentralizedStorage)
        return _this
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
            const file =  await this.#ipfsLocalNode.add(blob)
            await this.#ipfsHttpClient.add(blob)
            return file.cid.toString()          
        }    
        throw new Error(this.storageTypes.IPFS + ':  remote IPFS node not available')
    }

    async #addWeb3(blob) {
        if (this.#web3StorageClient != undefined) {
            if (this.#web3StorageClient.token != "null") {
                const cid = await this.#web3StorageClient.put([new File([blob], "")], {wrapWithDirectory: false})
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
                data = newData    
            }
            return new File([data], cid)
        }
        return EMPTYFILE
    }
}

export default DecentralizedStorage