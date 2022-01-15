import { chainList } from "./chain.js";
import '../lib/ether-did-resolver.umd.js'; // window.ethrDidResolver

export const formatEthBalance = (balance) => (balance? (parseInt(balance) / 10 ** 18).toPrecision(4) + ' ETH': '');

export function formatEthAddress(address, len = 12, seperator = '...') {
    if (len > address.length) {
        len = address.length;
        seperator = '';
    }
    const slice1Start = 0;
    const slice1End = Math.ceil(len/2) + 2; //includes 0x
    const slice2Start = address.length - Math.floor(len/2);
    const slice2End = address.length;
    const slice1 = address.slice(slice1Start, slice1End);
    const slice2 = address.slice(slice2Start, slice2End);
    return slice1 + seperator + slice2;
}

export function formatChainId(chainId) {
    const chain = parseInt(chainId);
    if (!isNaN(chain) && chainList[chain]) return chainList[chain].shortName
    if (chainList[chainId]) return chainList[chainId].shortName
    return chainId + ' (Unsupported)'
}

export function formatDid(did, len, seperator = '...') {
    const didInterpreted = ethrDidResolver.interpretIdentifier(did)
    return 'did:ethr:' + formatChainId(didInterpreted.network) + ':' + formatEthAddress(didInterpreted.address, len || 12, seperator)
}

let tooltipTriggerList = []
let tooltipList = []

export function updateToolTips() {
    tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl, {delay: { show: 500, hide: 100 }})
 })
};

export function updateToolTip(id) {
    const tooltipTriggerEl = document.getElementById(`${id}`);
    tooltipTriggerList.push(tooltipTriggerEl);
    tooltipList.push(new bootstrap.Tooltip(tooltipTriggerEl, {delay: { show: 500, hide: 100 }, html:true, trigger : 'hover'}));
};

export function addSpinnerHTML(targetId, spinnerId, floatEnd = true, type = 'text-success') {
    const floatEndHTML = floatEnd? 'float-end': ''
    const spinnerHtml =`<span class="spinner-border ${type} ${floatEndHTML}" role="status" id="${spinnerId}" >
                        </span>`
    $(`#${targetId}`).prepend(spinnerHtml);
    return 
};
