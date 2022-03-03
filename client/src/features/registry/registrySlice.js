import {createAsyncThunk, createSlice} from '@reduxjs/toolkit'
import {utils as ethersUtils, Contract as ethersContract} from 'ethers'
import { getEtherProviders } from '../ethSettings/ethSettingsSlice.js'
import { getWalletProvider } from '../wallet/walletSlice.js'
import DecentralizedStorage from '../../common/Ipfs.js'

export let nftReadContracts = {}

export const status = {
    UNDEFINED: 'undefined',
    LOADING: "loading",
    READY: 'ready',
    ERROR: 'error',
    TRANSACTIONSUBMITTED: 'transactionSubmitted',
    WAITINGFORCONFIRMATION: 'waitingForConfirmation',
    CREATINGPORTFOLIOCONTRACT: 'creatingPortfolioContract',
    PORTFOLIOSELECTED: "portfolioSelected"
  }
  
const initialState = {
    status: status.UNDEFINED,
    listContracts: {},
    portfolioSelected: null,
    error: null
}

function addReadingContract(chainKey, portfolioAddress, etherProvider) {
  const readingContract = new ethersContract(portfolioAddress, etherProvider.nftContractBuild.abi, etherProvider.provider)
  nftReadContracts[chainKey][portfolioAddress] = readingContract
  return readingContract
}

export const createPortfolio = createAsyncThunk("registry/createPortfolio", async (param, thunkAPI) => {
  const DS = DecentralizedStorage.getDS()
  const cid = await DS.addUrl(param.url).catch((e) => {console.log(e); return e})
    if (typeof(cid) != "string") return thunkAPI.rejectWithValue("addFileIpfs failed") 
    const provider = getWalletProvider()
    const chainKey = param.chainKey
    const etherProvider = getEtherProviders()[chainKey]
    const signer = await provider.getSigner()
    const owner = await signer.getAddress()
    const writeContract = new ethersContract(etherProvider.portfolioRegistryContractAddress, etherProvider.portfolioRegistryContractBuild.abi, signer)
    thunkAPI.dispatch(createTransactionSubmitted())
    const transactionResponse = await writeContract.createPortfolio(etherProvider.nftContractBuild.bytecode, owner, param.name, param.symbol, ''+cid)
                                                .catch((e) => {return e})
                                                if (transactionResponse.code != undefined){
      return thunkAPI.rejectWithValue(transactionResponse)
    }
    thunkAPI.dispatch(waitingForConfirmation())
    let transactionReceipt = await transactionResponse.wait().catch((e) => {return e})
    if (transactionReceipt.reason == "cancelled") {
      return thunkAPI.rejectWithValue(transactionReceipt)
    }
    if (transactionReceipt.reason == "replaced" || transactionReceipt.reason == "repriced") {
      transactionReceipt = transactionReceipt.receipt
    }
    const iface = new ethersUtils.Interface(etherProvider.portfolioRegistryContractBuild.abi )
    const logDecoded = iface.decodeEventLog('portfolioDeployed',transactionReceipt.logs[3].data, transactionReceipt.logs[3].topics)
    const portfolioAddress = logDecoded.portfolioAddress
    const portfolioInfo = {owner, name: param.name, symbol: param.symbol,
                             collectionURI: ''+cid, totalSupply: '0', address: portfolioAddress, chainId: chainKey}
    addReadingContract(chainKey, portfolioAddress, etherProvider)
    return {chainKey , portfolioAddress, portfolioInfo: portfolioInfo, transactionReceipt}
})

export const loadContractsDeployed = createAsyncThunk("registry/loadContractsDeployed", async (arg, thunkAPI) => {
    const etherProviders = getEtherProviders()
    return Promise.all(Object.keys(etherProviders).map((chainKey) => {
        const ethrProvider = etherProviders[chainKey]
        return ethrProvider.portfolioRegistryReadContract.getAllPortofliosRegistered()
                    .then((contractsDeployed) => {
                        nftReadContracts[chainKey] = {}
                        return Promise.all(contractsDeployed.map(async (portfolioAddress) => {
                            const nftReadContract = addReadingContract(chainKey, portfolioAddress, ethrProvider)
                            nftReadContracts[chainKey][portfolioAddress] = nftReadContract
                            const info = await nftReadContract.portfolioInfo().catch((e) => {console.log(e); return e})
                            const portfolioInfo = { name: info[1],
                                            owner: info[0],
                                            symbol: info[2],
                                            collectionURI: info[3],
                                            totalSupply: info[4].toNumber(),
                                            chainId: chainKey,
                                            address: portfolioAddress
                                        }
                            const portfolio = {chainKey: chainKey, portfolioAddress: portfolioAddress, portfolioInfo: portfolioInfo}
                            thunkAPI.dispatch(contractDeployedLoaded(portfolio))    
                            return portfolio
                        }))
                        .catch((e) => {console.log(e)})
                    })
                    .catch((e) => {console.log(e); return {chainKey: chainKey, portfolioAddress: {}, portfolioInfo: {}}})
        }))
        .catch((e) => {console.log(e); return []})
  })
  
export const registrySlice = createSlice({
    name: 'registry',
    initialState: initialState,
    reducers: {
        contractDeployedLoaded:(state, action) =>  {
            const list = state.listContracts
            if (list[action.payload.chainKey] == undefined) list[action.payload.chainKey] = {}
            list[action.payload.chainKey][action.payload.portfolioAddress]=  action.payload.portfolioInfo
        },
        createTransactionSubmitted:(state) =>  {
            state.status = status.TRANSACTIONSUBMITTED
        },
        waitingForConfirmation:(state) =>  {
            state.status = status.WAITINGFORCONFIRMATION
        },
        ready:(state) =>  {
            state.status = status.READY
            state.error = null
            state.portfolioSelected = null
        },
        portFolioSelected:(state, action) =>  {
          state.status = status.PORTFOLIOSELECTED
          state.portfolioSelected = action.payload
        },
        nftAdded:(state, action) =>  {
          state.listContracts[action.payload.chainKey][action.payload.address].totalSupply +=1 
        }
},
    extraReducers(builder) {
      builder
      .addCase(loadContractsDeployed.pending, (state) => {
        state.status = status.LOADING
      })
      .addCase(loadContractsDeployed.fulfilled, (state) => {
        state.status = status.READY
        state.error = null
    })
      .addCase(loadContractsDeployed.rejected, (state, action) => {
        state.status = status.ERROR
        state.error = action
      })
      .addCase(createPortfolio.pending, (state) => {
        state.status = status.CREATINGPORTFOLIOCONTRACT
      })
      .addCase(createPortfolio.fulfilled, (state, action) => {
        state.status = status.READY
        const list = state.listContracts
        if (list[action.payload.chainKey] == undefined) list[action.payload.chainKey] = {}
        list[action.payload.chainKey][action.payload.portfolioAddress]=  action.payload.portfolioInfo
  })
      .addCase(createPortfolio.rejected, (state, action) => {
        state.status = status.ERROR
        state.error = action
      })
    }
})

// Extract and export each action creator by name
export const { portFolioSelected, ready, contractDeployedLoaded, nftAdded, createTransactionSubmitted, waitingForConfirmation } = registrySlice.actions
// Export the reducer, either as a default or named export
export default registrySlice.reducer