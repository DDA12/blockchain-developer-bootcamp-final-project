import {configureStore} from '@reduxjs/toolkit'
import ethSettingsReducer from '../features/ethSettings/ethSettingsSlice.js'
import walletReducer from '../features/wallet/walletSlice.js'
import registryReducer from '../features/registry/registrySlice.js'
import nftRedcuer from '../features/nft/nftSlice.js'

const store = configureStore({
  reducer: {
    ethSettings: ethSettingsReducer,
    wallet: walletReducer,
    registry: registryReducer,
    nft: nftRedcuer
  }
})

export default store