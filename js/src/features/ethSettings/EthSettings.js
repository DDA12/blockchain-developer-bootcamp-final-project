import '../../lib/jquery.js'
import { createProviders } from './ethSettingsSlice.js'
import store from '../../app/store.js';

const subscribe = store.subscribe;
const dispatch = store.dispatch;

export function renderEthSettings() {
    dispatch(createProviders());
}
