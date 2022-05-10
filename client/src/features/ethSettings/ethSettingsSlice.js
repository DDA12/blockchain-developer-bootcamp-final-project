import {createAsyncThunk, createSlice} from '@reduxjs/toolkit'
import {providers as ethersProviders, Contract as ethersContract} from 'ethers'
import {chainList, buildContractsPath} from "chain.js"
import { initEthrDidResolver } from '../../common/did.js'
import ethrDidResolver from 'ether-did-resolver'

let apiKeys = {}
let portfolioRegistryContractBuild = {}
let nftContractBuild = {}
let ethrDidRegistryContractBuild = {}
let providers = {}

export async function init() {
  apiKeys = globalThis.apiKeys || {}
  portfolioRegistryContractBuild = await fetch(buildContractsPath+"Registry.json")
    .then(function(resp) {return resp.json()})
  nftContractBuild = await fetch(buildContractsPath+"vcNFT.json")
    .then(function(resp) {return resp.json()})
  ethrDidRegistryContractBuild = await fetch(buildContractsPath+'EthereumDIDRegistry.json')
    .then(function(resp) {return resp.json()})
  ethrDidResolver.setDidRegistryContract(ethrDidRegistryContractBuild)
  Object.keys(chainList).map(function(key) {
    chainList[key].portfolioRegistryContractAddress = portfolioRegistryContractBuild.networks[key]?.address || chainList[key].portfolioRegistryContractAddress
    chainList[key].ethrDidRegistryContractAddress = ethrDidRegistryContractBuild.networks[key]?.address || chainList[key].ethrDidRegistryContractAddress
  })
}

export function getEtherProviders() {
  return providers
}

export const status = {
  UNDEFINED: 'undefined',
  CONNECTING: "connecting",
  READY: 'ready',
  ERROR: 'error'
}

const initialState = {
    status: status.UNDEFINED,
    providers: {}
}

export const createProviders = createAsyncThunk("ethSettings/createProviders", async (arg, thunkAPI) => {
      return Promise.all(Object.keys(chainList).map(async (chainKey) => {
                                const chainInfo = chainList[chainKey]
                                // const provider = await ethers.getDefaultProvider(parseInt(chainInfo.chainId) || chainInfo.chainId, apiKeys);
                                let provider = undefined
                                if (typeof chainInfo.chainId == "string") {
                                  if (chainInfo.chainId.includes('wss')) {
                                    provider = new ethersProviders.WebSocketProvider(chainInfo.chainId + (apiKeys[chainInfo.provider] || ''))
                                  } else {
                                    provider = new ethersProviders.JsonRpcProvider(chainInfo.chainId + (apiKeys[chainInfo.provider] || ''))
                                  }
                                } else {
                                  provider = new ethersProviders.InfuraProvider(chainInfo.chainId, apiKeys[chainInfo.provider])
                                }
                                const portfolioRegistryContract = new ethersContract(chainInfo.portfolioRegistryContractAddress, portfolioRegistryContractBuild.abi, provider)
                                providers[chainKey] = {...chainInfo,
                                                         provider: provider,
                                                         portfolioRegistryReadContract: portfolioRegistryContract, 
                                                         portfolioRegistryContractBuild: portfolioRegistryContractBuild, 
                                                         nftContractBuild: nftContractBuild,
                                                         ethrDidRegistryContractBuild: ethrDidRegistryContractBuild,
                                                      }
                                const payload = {chainKey: chainKey, chainInfo: chainInfo}
                                thunkAPI.dispatch(connected(payload))
                                return payload
                            }))
})

export const ethSettingsSlice = createSlice({
  name: 'ethSettings',
  initialState: initialState,
  reducers: {
    connected: (state, action) =>  {
      state.providers[action.payload.chainKey] = action.payload.chainInfo
    },
  },
  extraReducers(builder) {
    builder
    .addCase(createProviders.pending, (state) => {
      state.status = status.CONNECTING
    })
    .addCase(createProviders.fulfilled, (state) => {
      state.status = status.READY
      initEthrDidResolver(getEtherProviders(), ethrDidRegistryContractBuild)
    })
    .addCase(createProviders.rejected, (state) => {
      state.status = status.ERROR
    })
  }
})

// Extract and export each action creator by name
export const { connected } = ethSettingsSlice.actions
// Export the reducer, either as a default or named export
export default ethSettingsSlice.reducer
