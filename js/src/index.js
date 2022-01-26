
import './app/store.js';
import {renderEthSettings} from './features/ethSettings/EthSettings.js';
import {renderWallet} from './features/wallet/Wallet.js';
import './features/registry/Registry.js';
import './features/nft/Nft.js';
import './common/did.js';

// localStorage.clear();
// sessionStorage.clear();
// try 
// {
//     const dbs = await window.indexedDB.databases();
//     dbs.forEach(db => { window.indexedDB.deleteDatabase(db.name) });
// } catch(e) {
//     console.log(e);
// }

renderEthSettings();
renderWallet();
