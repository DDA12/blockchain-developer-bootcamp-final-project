import '../../lib/redux-toolkit.umd.min.js';
import  "../../lib/ethers.5.5.1.umd.min.js";
import {chainList, buildContractsPath} from "../../common/chain.js";
import { initEthrDidResolver } from '../../common/did.js';

const apiKeys = await fetch("./src/common/apiKeys.json")
                                       .then(function(resp) {return resp.json();})
                                       .catch((e) => {return {};})

const portfolioRegistryContractBuild = await fetch(buildContractsPath+"Registry.json")
                                       .then(function(resp) {return resp.json();})

const nftContractBuild = await fetch(buildContractsPath+"vcNFT.json")
                               .then(function(resp) {return resp.json();})

export const ethrDidRegistryContractBuild = await fetch(buildContractsPath+'EthereumDIDRegistry.json')
                                                  .then(function(resp) {return resp.json();})

Object.keys(chainList).map(function(key, index) {
  chainList[key].portfolioRegistryContractAddress = portfolioRegistryContractBuild.networks[key]?.address || chainList[key].portfolioRegistryContractAddress
  chainList[key].ethrDidRegistryContractAddress = ethrDidRegistryContractBuild.networks[key]?.address || chainList[key].ethrDidRegistryContractAddress
})

let providers = {};

export function getEtherProviders() {
  return providers;
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
};

export const createProviders = RTK.createAsyncThunk("ethSettings/createProviders", async (arg, thunkAPI) => {
      return Promise.all(Object.keys(chainList).map(async (chainKey) => {
                                const chainInfo = chainList[chainKey];
                                // const provider = await ethers.getDefaultProvider(parseInt(chainInfo.chainId) || chainInfo.chainId, apiKeys);
                                let provider = undefined;
                                if (typeof chainInfo.chainId == "string") {
                                  provider = new ethers.providers.JsonRpcProvider(chainInfo.chainId);
                                } else {
                                  provider = new ethers.providers.InfuraProvider(chainInfo.chainId, apiKeys.infura);
                                }
                                const portfolioRegistryContract = new ethers.Contract(chainInfo.portfolioRegistryContractAddress, portfolioRegistryContractBuild.abi, provider);
                                providers[chainKey] = {...chainInfo,
                                                         provider: provider,
                                                         portfolioRegistryReadContract: portfolioRegistryContract, 
                                                         portfolioRegistryContractBuild: portfolioRegistryContractBuild, 
                                                         nftContractBuild: nftContractBuild,
                                                         ethrDidRegistryContractBuild: ethrDidRegistryContractBuild,
                                                      };
                                const payload = {chainKey: chainKey, chainInfo: chainInfo};
                                thunkAPI.dispatch(connected(payload))
                                return payload;
                            }))
});

export const ethSettingsSlice = RTK.createSlice({
  name: 'ethSettings',
  initialState: initialState,
  reducers: {
    connected: (state, action) =>  {
      state.providers[action.payload.chainKey] = action.payload.chainInfo;
    },
  },
  extraReducers(builder) {
    builder
    .addCase(createProviders.pending, (state, action) => {
      state.status = status.CONNECTING;
    })
    .addCase(createProviders.fulfilled, (state, action) => {
      state.status = status.READY;
      initEthrDidResolver();
    })
    .addCase(createProviders.rejected, (state, action) => {
      state.status = status.ERROR;
    })
  }
});

// Extract and export each action creator by name
export const { connected } = ethSettingsSlice.actions;
// Export the reducer, either as a default or named export
export default ethSettingsSlice.reducer;
