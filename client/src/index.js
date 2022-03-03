import './app/store.js'
import './features/wallet/Wallet.js'
import './features/nft/Nft.js'
import './features/registry/Registry.js'

import '../assets/bootstrap.min.css'
import '../assets/bootstrap-icons.css'
import '../assets/custom.css'
// import '../assets/bootstrap-icons.css'

import DecentralizedStorage from './common/Ipfs.js'
import {initEthSettings} from './features/ethSettings/EthSettings.js'

(async ()=> {
    // localStorage.clear();
    // sessionStorage.clear();
    // try {
    //     const dbs = await window.indexedDB.databases();
    //     dbs.forEach(db => { window.indexedDB.deleteDatabase(db.name) });
    // } catch(e) {
    //     console.log(e);
    // }
    globalThis.apiKeys = await fetch("./assets/apiKeys.json").then((resp) => {return resp.json()}).catch(() => {return {}})
    await DecentralizedStorage.initDS()
    await initEthSettings()
})()

/* global module */
if (typeof module != 'undefined') {
    module.hot.accept(() => {
        window.location.reload()
    })
}
