import { createProviders, init } from './ethSettingsSlice.js'
import store from '../../app/store.js'

// const subscribe = store.subscribe;
const dispatch = store.dispatch

export async function initEthSettings() {
  await init()
  await dispatch(createProviders())
}
