import {createAsyncThunk, createSlice} from '@reduxjs/toolkit'
import {utils as ethersUtils} from 'ethers'
import didJwt from 'did-jwt'
import {getEtherProviders} from '../ethSettings/ethSettingsSlice.js'
import {getWalletProvider} from '../wallet/walletSlice.js'
import DecentralizedStorage from '../../common/Ipfs.js'
import {nftReadContracts} from '../registry/registrySlice.js'
import {generateVc, signVerifiableCredential, getEthDid, getNewSigningEthDid, addSigningDelegate, getSigningDelegate} from '../../common/did.js'

export const status = {
    UNDEFINED: 'undefined',
    LOADING: "loading",
    READY: 'ready',
    ERROR: 'error',
    MINTINGNFT: 'mintingNft',
    WAITINGFORCONFIRMATION: 'waitForMining',
    MINTINGNFTSUBMITTED: 'mintingNftSubmitted', 
    ADDINGDELEGATE: 'addingDelegate'
}

const initialState = {
    status: status.UNDEFINED,
    listNfts: {},
    portfolioSelected: null,
    error: null
}

export const createNft = createAsyncThunk("nft/createNft", async (param, thunkAPI) => {
    const DS = await DecentralizedStorage.getDS()
    const cidImage = await DS.addUrl(param.metaData.image).catch((e) => {console.log(e); return e})
    if (typeof(cidImage) != 'string') return thunkAPI.rejectWithValue("addFileIpfs failed") 
    const provider = getWalletProvider()
    const signer = provider.getSigner()
    const chainKey = parseInt(param.chainId)
    const etherProvider = getEtherProviders()[chainKey]
    param.metaData.image = cidImage
    const ethrDid = getEthDid(param.didIssuer, param.chainId)
    let ethrDidDelegate = getSigningDelegate(ethrDid)
    if (ethrDidDelegate == null) {
        thunkAPI.dispatch(addingDelegate())
        ethrDidDelegate = getNewSigningEthDid(param.chainId, true)
        const response = await addSigningDelegate(etherProvider,ethrDid, ethrDidDelegate, signer, true).catch((e) => {return e})
        if (response != true) return thunkAPI.rejectWithValue(response)
        }
    const vcPayload = generateVc(ethrDid.did, param.didSubject, param.metaData)
    ethrDid.signer = ethrDidDelegate.signer
    const jws = await signVerifiableCredential(vcPayload, ethrDid).catch((e) => {return thunkAPI.rejectWithValue(e)})
    const cidJws = await DS.add(jws).catch((e) => {return thunkAPI.rejectWithValue(e)})
    const owner = await signer.getAddress()
    thunkAPI.dispatch(mintingTransactionSent())
    const writeContract = nftReadContracts[chainKey][param.contractAddress].connect(signer)
    const transactionResponse = await writeContract.mint(owner, cidJws).catch((e) => {return e})
    if (transactionResponse.code != undefined) return thunkAPI.rejectWithValue(transactionResponse)
    thunkAPI.dispatch(waitingForConfirmation())
    let transactionReceipt = await transactionResponse.wait().catch((e) => {return e})
    if (transactionReceipt.reason == "cancelled") {
      return thunkAPI.rejectWithValue(transactionReceipt)
    }
    if (transactionReceipt.reason == "replaced" || transactionReceipt.reason == "repriced") {
      transactionReceipt = transactionReceipt.receipt
    }
    const iface = new ethersUtils.Interface(etherProvider.nftContractBuild.abi )
    const logDecoded = iface.decodeEventLog('CoaURISet',transactionReceipt.logs[1].data, transactionReceipt.logs[1].topics)
    const tokenId = logDecoded.tokenId
    const nftInfo = {address: param.contractAddress, tokenId, owner, jws, jwsDecoded: didJwt.decodeJWT(jws, {})}
    return {chainId: param.chainId , address: param.contractAddress, nftInfo: nftInfo, transactionReceipt}
})

export const loadNfts = createAsyncThunk("nft/loadNfts", async (param, thunkAPI) => {
    const DS = await DecentralizedStorage.getDS()
    const chainKey = parseInt(param.chainId)
    const contract = nftReadContracts[chainKey][param.address]
    let allTokenIds = await contract.getAllTokenIds()
    return Promise.all(allTokenIds.map(async (tokenIdBN) => {
            const tokenId = tokenIdBN.toNumber()
            // console.log("Start: " + tokenId)
            return await contract.getCoaURI(tokenId).then(async (uri) => {
                const file = await DS.get(uri)
                const jws = await file.text()
                const owner = await contract.ownerOf(tokenId).catch((e) => {console.log(e); return {}})
                // console.log("Finish: " +tokenId)
                thunkAPI.dispatch(nftLoaded({tokenId, nft: { address: param.address, tokenId, owner, jws, jwsDecoded: didJwt.decodeJWT(jws, {})}}))
                return jws
            })
            .catch((e) => {console.log(e); return {}})
    }))
    .catch((e) => {console.log(e); return []})
})
  
export const nftSlice = createSlice({
    name: 'nft',
    initialState: initialState,
    reducers: {
        nftSetPortfolio:(state, action) =>  {
          state.portfolioSelected = action.payload
        },
        nftLoaded:(state, action) =>  {
          state.listNfts[action.payload.tokenId] = action.payload.nft
        },
        reset:(state) =>  {
            state.status = status.UNDEFINED
            state.error = null
            state.listNfts = {}
            state.portfolioSelected = null
        },
        mintingTransactionSent:(state) =>  {
            state.status = status.MINTINGNFTSUBMITTED
        },
        waitingForConfirmation:(state) =>  {
            state.status = status.WAITINGFORCONFIRMATION
        },
        addingDelegate: (state) => {
            state.status = status.ADDINGDELEGATE
        }
    },
    extraReducers(builder) {
      builder
      .addCase(loadNfts.pending, (state) => {
        state.status = status.LOADING
      })
      .addCase(loadNfts.fulfilled, (state) => {
        state.status = status.READY
        state.error = null
    })
      .addCase(loadNfts.rejected, (state, action) => {
        state.status = status.ERROR
        state.error = action
      })
      .addCase(createNft.pending, (state) => {
        state.status = status.MINTINGNFT
      })
      .addCase(createNft.fulfilled, (state) => {
        state.status = status.READY
      })
      .addCase(createNft.rejected, (state, action) => {
        state.status = status.ERROR
        state.error = action
      })
    }
})

// Extract and export each action creator by name
export const { nftSetPortfolio, nftLoaded, reset, mintingTransactionSent, waitingForConfirmation, addingDelegate } = nftSlice.actions
// Export the reducer, either as a default or named export
export default nftSlice.reducer