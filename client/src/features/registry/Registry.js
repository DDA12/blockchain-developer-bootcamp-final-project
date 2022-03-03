import $ from 'jquery'
import {Modal} from 'bootstrap'
import {utils as ethersUtils} from 'ethers'
import {v4} from 'uuid'

import { portFolioSelected, loadContractsDeployed, status as statusRegistry, createPortfolio, ready} from './registrySlice.js'
import { status as statusEtherSettings } from '../ethSettings/ethSettingsSlice.js'
import { status as statusWallet } from '../wallet/walletSlice.js'
import store from '../../app/store.js'
import DecentralizedStorage from '../../common/Ipfs.js'
import {renderAlert, removeAllAlerts} from '../../common/alert.js'
import {formatEthAddress, formatChainId, updateToolTip, formatDid, updateToolTips, addSpinnerHTML} from  '../../common/helpers.js'
import { createDropZone } from '../../common/dropZone.js' 
import {chainList} from "chain.js"
import { getEthDid } from '../../common/did.js'

const CREATEMODALID = 'createCollectionModalId'
const CARDSCONTAINERID = 'cardsContainerId'
const CERATEPORTFOLIOBUTTON = 'createPortfolioId'
const PORTFOLIOID = 'portfolioId'
const OWNERADDRESSID = 'ownerAddressId'
const CHAINID = 'chainId'
const SPINNERID = 'spinnerId'
const COLLECTIONIMAGEID = 'collectionImageId'
const CREATEBUTTONMODALID = 'createButtonModalId'

const subscribe = store.subscribe
const dispatch = store.dispatch
var previousRegistryState = ''
var previousWalletState = ''

function initRegistry() {
    let state = store.getState().ethSettings
    switch(state.status) {
        case statusEtherSettings.READY:
            unsubscribeInitRegistry()
            dispatch(loadContractsDeployed())
            break
    } 
}

initRegistry()

const unsubscribeInitRegistry = subscribe(initRegistry)
let unsubscribeRenderRegistry = undefined

export function initPortfolio() {
    $("main").prepend(portfolioHTML)
    unsubscribeRenderRegistry = subscribe(renderRegistry)
    $(`#${CERATEPORTFOLIOBUTTON}`).off('click').on('click', ()=>{
        let state = store.getState().wallet
        if (state.status != statusWallet.SIGNEDIN &&  state.status != statusWallet.CHAINIDCHANGED) {
            removeAllAlerts()
            renderAlert(`AlertCreatePortfolio`+v4(), 'Create Portoflio:', 'Please "Sign in" to create a portfolio.', 'warning', 5000)
            return
        }
        if (chainList[parseInt(state.currentChainId)] == undefined) {
            removeAllAlerts()
            renderAlert(`AlertCreatePortfolio`+v4(), 'Create Portoflio:', `Unsupported Chain/Network: "${state.currentChainId}". Please change the chain/network in MetaMask to create a Portfolio.`, 'warning', 7000)
            return
        }
        initCreateModal(state)        
    })    
}

initPortfolio()

function validateCeateForm(createCollectionModal, dropZoneId) {
    const name = createCollectionModal.find('#name')
    const symbol = createCollectionModal.find('#symbol')
    const url = createCollectionModal.find('#url')
    let test = true
    if (name.val() == "") {
        name.css('background-color', 'red')
        test = false
    } else {
        name.css('background-color', 'white')
    }
    if (symbol.val() == "") {
        symbol.css('background-color', 'red')
        test = false
    } else {
        symbol.css('background-color', 'white')
    }
    if (url.val() == "") {
        $(`#${dropZoneId}`).css("border-color", "red")
        test = false
    } else {
        $(`#${dropZoneId}`).css('background-color', 'white')
    }
    return test
}

function initCreateModal(state) {
    $("body").append(createCollectionModalHTML(state))
    const modalInstance = Modal.getOrCreateInstance(document.getElementById(CREATEMODALID))
    const $createCollectionModal = $(`#${CREATEMODALID}`)
    $createCollectionModal.on('hidden.bs.modal', () => {$createCollectionModal.remove()})
    const $url = $createCollectionModal.find('#url')
    const dropZoneId = createDropZone($createCollectionModal.find(`#dropZoneDiv`), $url)
    $createCollectionModal.find(`#${CREATEBUTTONMODALID}`).off('click').on('click', ()=>{
        if (validateCeateForm($createCollectionModal, dropZoneId) == false) return
        $createCollectionModal.find(`#close`).prop("disabled", true)
        $createCollectionModal.find(`#${CREATEBUTTONMODALID}`).prop('disabled', true).text('Creating...')
        const name = $createCollectionModal.find('#name').val()
        const symbol = $createCollectionModal.find('#symbol').val()
        let state = store.getState().wallet
        dispatch(createPortfolio({chainKey: parseInt(state.currentChainId, 16), name, symbol, url: $url.val()}))
            .unwrap()
            .then((result) => {
                renderCards(CARDSCONTAINERID, {[result.chainKey]: {[result.portfolioAddress]: result.portfolioInfo}}, state)
                const targetOffset = $(`#${result.chainKey}${result.portfolioAddress}`).offset().top
                $('html, body').animate({scrollTop: targetOffset}, 500)
                modalInstance.hide()
                renderAlert(`alert${result.chainKey}${result.portfolioAddress}`, 'Transaction completed:', `New portfolio created! 
                    <a href="${chainList[result.chainKey].chainExplorer}tx/${result.transactionReceipt.transactionHash}" target="_blank">
                    Tx: ${formatEthAddress(result.transactionReceipt.transactionHash,12)}</a>`, 'success', 12000)
            })
            .catch(async (e) => {
                modalInstance.hide()
                console.log(e)
                switch(e.code) {
                    case 4001:
                        renderAlert(e.code, 'Transaction Cancelled!', e.message, 'warning', 7000)
                        break
                    case "TRANSACTION_REPLACED":
                        if (e.reason == "cancelled") {
                            renderAlert(e.code, 'Transaction Cancelled!', "", 'warning', 7000)
                            break
                        }
                        renderAlert(e.code, 'Transaction Cancelled!', e.message, 'error', 7000)
                        break
                    default:
                        renderAlert(e.code, 'Transaction Cancelled!', e.message, 'error', 7000)
                        break
                }
                dispatch(ready())
            })
        return
    })    
    modalInstance.show()
}

async function renderCards(containerId, listContracts, walletUser) {
    const DS = DecentralizedStorage.getDS()
    for (const chainKey in listContracts) {
        const chainListContracts = listContracts[chainKey]
        for (let address in chainListContracts) {
            const contract = chainListContracts[address]
            const chainId = contract.chainId
            let card = $(`#${chainId}${address}`)
            if (card.length == 0) {
                $(`#${containerId}`).append($(cardHtml(contract)))
                card = $(`#${chainId}${address}`)
                updateToolTip("toolTip"+chainId+contract.address+contract.owner)
                updateToolTip("toolTip"+chainId+contract.address)
                card.hide().slideDown(750).css('opacity', 0).animate({opacity: 1}, {queue: false, duration: 750})
                card.find(`#${COLLECTIONIMAGEID}`).prepend(cardSpinnerHTML(contract))
                DS.get(contract.collectionURI).then((file) => {return URL.createObjectURL(file)})
                    .then((localUri) => {
                        card.find(`#${COLLECTIONIMAGEID}`)
                        .css({"background-image": "url('"+localUri+"'),"+"url('"+localUri+"')",
                        "background-size": "contain, 1000%", "background-repeat": "no-repeat, no-repeat",
                        "background-position": "center, center"})
                        .css('cursor', 'pointer')
                        .off("click")
                        .on('click', () => {
                            $(`#${PORTFOLIOID}`).remove()
                            updateToolTips()
                            dispatch(portFolioSelected(contract))
                        })
                        $(`#${SPINNERID}${chainId}${address}`).remove()
                    })    
            }
            card.find(`#ownerImage`).remove()
            if (walletUser.currentAccount!= null && ethersUtils.getAddress(walletUser.currentAccount) == ethersUtils.getAddress(contract.owner)) {
                card.find(`#owner`).prepend('<img src="./assets/buddy.png" alt="" width="42" height="22" id="ownerImage" style="padding-left: 12px;padding-right: 12px;"></img>')
            }
        }    
    }
}

function renderRegistry() {
    // const stateNft = store.getState().nft
    const stateWallet = store.getState().wallet
    const stateRegistry = store.getState().registry
    let walletState = JSON.stringify(stateWallet)
    if (previousWalletState != walletState) {
        previousWalletState = walletState
        switch(stateWallet.status) {
            case statusWallet.SIGNEDIN:
            case statusWallet.DISCONNECTED:
            case statusWallet.DETECTED:
                renderCards(CARDSCONTAINERID, stateRegistry.listContracts, stateWallet)
                break
        }    
    }
    let registryState = JSON.stringify(stateRegistry)
    if (previousRegistryState == registryState) return
    previousRegistryState = registryState
    switch(stateRegistry.status) {
        case statusRegistry.PORTFOLIOSELECTED:
            unsubscribeRenderRegistry()
            break
        case statusRegistry.LOADING:
            if ($(`#${PORTFOLIOID}text`).find(`#spinner${PORTFOLIOID}`).length == 0) {
                addSpinnerHTML(`${PORTFOLIOID}text`, `spinner${PORTFOLIOID}`, true)
            }
            renderCards(CARDSCONTAINERID, stateRegistry.listContracts, stateWallet)
            break
        case statusRegistry.READY:
                renderCards(CARDSCONTAINERID, stateRegistry.listContracts, stateWallet)
                $(`#${PORTFOLIOID}text`).find(`#spinner${PORTFOLIOID}`).remove()
            break
        case statusRegistry.TRANSACTIONSUBMITTED:
            $(`#${CREATEMODALID}`).find(`#${CREATEBUTTONMODALID}`).text('Creation request submitted. Waiting for wallet confirmation...')
            .prepend('<span class="spinner-border text-warning float-end" role="status"></span>')
            break
        case statusRegistry.WAITINGFORCONFIRMATION:
            $(`#${CREATEMODALID}`).find(`#${CREATEBUTTONMODALID}`).text('Mining in progress. Waiting for confirmation...')
            .prepend('<span class="spinner-border text-warning float-end" role="status"></span>')
            break                
    }
}

function cardHtml(contract) {
    const chainId = contract.chainId
    const did = getEthDid(contract.address, chainId).did
    const chainIdFormatted = formatChainId(chainId)
    const ownerFormated = formatEthAddress(contract.owner, 12)
    const addressFormated = formatEthAddress(contract.address, 12)
    return `<div class="col" id=${chainId}${contract.address}>
                <div>
                    <div class="card-header d-flex flex-column h-100 bg-black text-white text-shadow-1">
                        <small id='toolTip${chainId}${contract.address}${contract.owner}' class="text-center" 
                        data-bs-toggle="tooltip" data-bs-placement="top" title="${formatDid(did, 46)}">
                        Owner:&nbsp<span id="owner"><i>${chainIdFormatted}</i>&nbsp:&nbsp${ownerFormated}</span></small>
                    </div>
                    <div id="${COLLECTIONIMAGEID}" style="border-radius: 12px;" class="card-cover h-100 overflow-hidden text-white shadow-lg">
                        <div class="d-flex flex-column h-100 p-5 pb-3 text-white text-shadow-1">
                            <h2 class="pt-5 mt-5 mb-4 display-6 lh-1 fw-bold">${contract.name}</h2>
                            <ul class="d-flex list-unstyled mt-auto">
                            </ul>
                        </div>
                    </div>                    
                    <div class="card-body d-flex flex-column h-100 bg-black text-white text-shadow-1">
                        <small id='toolTip${chainId}${contract.address}' 
                        class="text-center" data-bs-toggle="tooltip" data-bs-placement="top" title="Contract: ${chainIdFormatted} : ${contract.address}">
                        Location: <i>${chainIdFormatted}</i>&nbsp:&nbsp${addressFormated}<br>Total NFTs: ${contract.totalSupply}</small>
                    </div>
                </div>
            </div>`
        }

function createCollectionModalHTML(state) {
    return `<div class="modal fade py-5" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" role="dialog" id="${CREATEMODALID}">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
      <div class="modal-content rounded-5 shadow">
        <div class="modal-header p-5 pb-4 border-bottom-0">
          <h2 class="fw-bold mb-0">New Portfolio</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="close"></button>
        </div>
        <div class="modal-body p-5 pt-0">
        <form class="">
        <h6 class="fw-bold mb-3">Owner</h6>
          <div class="form-floating mb-3" id=${CHAINID}>Decentralized ID: ${state.currentDid} 
          </div>
            <div class="form-floating mb-3" id=${OWNERADDRESSID}>Account: ${state.currentAccount}
            </div>
            <h6 class="fw-bold mb-3">Location</h6>
            <div class="form-floating mb-3" id=${CHAINID}>Chain: ${formatChainId(state.currentChainId)} 
            </div>
            <h6 class="fw-bold mb-3">Portfolio Information</h6>
            <div class="form-floating mb-3">
              <input type="text" class="form-control rounded-4" id="name" placeholder="Name" >
              <label for="name">Name</label>
            </div>
            <div class="form-floating mb-3">
              <input type="text" class="form-control rounded-4" id="symbol" placeholder="Symbol" >
              <label for="symbol">Symbol</label>
            </div>
            <div class="form-floating mb-3" hidden>
              <input type="url" class="form-control rounded-4" id="url" placeholder="URL for image">
              <label for="url">URL for image</label>
            </div>
            <div id="dropZoneDiv"></div>
            <button class="w-100 mb-2 btn btn-lg rounded-4 btn-primary" id="${CREATEBUTTONMODALID}" type="button">Create </button>
          </form>
        </div>
      </div>
    </div>
  </div>`
}


function portfolioHTML() {
    return `<div class="container px-4 py-5" id="${PORTFOLIOID}" >
                <div class="container position-fixed " style="background-color: black; padding: 0em;">
                    <div class="row border-bottom" >
                        <div class="col" id="${PORTFOLIOID}text">
                            <h4 class="" style="padding-top: 0em; margin:0;" >Portfolios
                            </h4>  
                        </div>
                        <div class="col" style="">
                            <p class="text-end" style="padding-top: 0.17em; margin:0;">
                                <a id="${CERATEPORTFOLIOBUTTON}" class="btn btn-sm btn-outline-warning txt-white font-weight-bold" role="button" >Create a portfolio</a>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 align-items-stretch g-4 py-5" id="${CARDSCONTAINERID}">
                </div>
            </div>`
}

function cardSpinnerHTML(contract) {
    return `
    <div class="clearfix" id="${SPINNERID}${contract.chainId}${contract.address}">
        <span class="spinner-border text-success float-end" role="status" >
        </span>
    </div>`
}

// initPortfolio();
