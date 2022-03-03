import $ from "jquery"
import {Modal} from 'bootstrap'
import {MetaMaskOnboarding} from '../../lib/metamask-onboarding.bundle.js'
import {walletDetect, status, walletConnect, walletChainIdChanged, disconnected, walletAccountChanged, walletSignIn} from './walletSlice.js'
import store from '../../app/store.js'
import {renderAlert, removeAllAlerts} from '../../common/alert.js'
import {formatEthBalance, formatChainId, addSpinnerHTML} from  '../../common/helpers.js'
import {resolveDidDocument} from '../../common/did.js'
import {chainList, ipfsGatewayUrl} from "chain.js"

const subscribe = store.subscribe
const dispatch = store.dispatch

const CREATEPROFILEMODALID = 'createProfileModalId'
const CLOSEPROFILEMODALID = 'closeProfileModalId'
const PROFILEDELEGATESID = 'profileDelegatesId'
const PROFILEDELEGATESCOUNTID = 'profileDelegatesCountId'
const PROFILEDIDDOCID = 'profileDidDocId'
const HELPMODALID = 'helpModalId'
const CLOSEHELPMODALID = 'closeHelpModalId'

const WALLETNAVBARBUTTONID = 'walletNavBarButton'
const WALLETNAVBARBUTTONTEXTID = 'walletNavBarButtonText'
const walletNavBarAccountId = 'walletNavBarAccount'
const walletNavBarChainId = 'walletNavBarChain'
const  walletNavBarBalanceId = 'walletNavBarBalance'

let walletNavBarChain = {}
let walletNavBarAccount = {}
let walletNavBarBalance = {}

export function initWallet() {
    $('#userProfileDiv').append('<img src="./assets/help.png" alt="" width="48" height="40" id="help" style=" padding-left: 15px;"></img>')
    $(`#help`).on('click', renderHelpModal).css('cursor', 'pointer')
    $('#userProfileDiv').append('<img src="./assets/buddy.png" alt="" width="48" height="38" id="userProfile" style=" padding-left: 15px;"></img>')
    $(`#userProfile`).on('click', renderProfileModal).css('cursor', 'pointer')
    $("#navBarWallet").append(walletNavBarButtonHTML())
    $("#navBarChain").append(walletNavBarChainHTML())
    walletNavBarChain = $('#'+walletNavBarChainId)
    $("#navBarAccount").append(walletNavBarAccountHTML())
    walletNavBarAccount = $('#'+walletNavBarAccountId)
    $("#navBarBalance").append(walletNavBarBalanceHTML())
    walletNavBarBalance = $('#'+walletNavBarBalanceId)
    hideAccountInfo()
    dispatch(disconnected())
}

initWallet()

let previousWalletState = ''

function renderHelpModal() {
    $("body").append(helpModalHTML())
    const modalInstance = Modal.getOrCreateInstance(document.getElementById(HELPMODALID))
    const $helpModal = $(`#${HELPMODALID}`)
    $helpModal.on('hidden.bs.modal', function () {
        modalInstance.hide()
        $helpModal.remove()
      })
    modalInstance.show()
}

function  renderProfileModal() {
    const user = store.getState().wallet
    $("body").append(createProfileModalHTML(user))
    const modalInstance = Modal.getOrCreateInstance(document.getElementById(CREATEPROFILEMODALID))
    const $createCollectionModal = $(`#${CREATEPROFILEMODALID}`)
    $createCollectionModal.on('hidden.bs.modal', function () {
        modalInstance.hide()
        $createCollectionModal.remove()
      })
    $createCollectionModal.on('shown.bs.modal', () => {
        $(`#${CLOSEPROFILEMODALID}`).prop('disabled', true).text('Resolving DID document...')
        $createCollectionModal.find('#close').prop('disabled', true)
        addSpinnerHTML(CLOSEPROFILEMODALID, 'ProfileSpinner')
        return resolveDidDocument(user.currentDid).then((doc) => {
            const verificationMethods = ((doc?.didDocument?.verificationMethod) || [])
            const delegates = verificationMethods.reduce((previousValue, currentValue) => {
                                    const match = currentValue.id.match(/(delegate)/g)
                                    if (match != null) return [...previousValue, currentValue.id]
                                    return previousValue
                                }
                            , [])
            $(`#${PROFILEDELEGATESCOUNTID}`).html('Signing Delegates: ' + delegates.length)
            $(`#${PROFILEDELEGATESID}`).html(JSON.stringify(delegates, undefined, 2))
            $(`#${PROFILEDIDDOCID}`).html(JSON.stringify(doc, undefined, 2))
            $(`#${CLOSEPROFILEMODALID}`).text('Close').prop('disabled', false)
            $createCollectionModal.find('#close').prop('disabled', false)
            return doc
            })
            .catch((e) => {
                console.log(e)
                $(`#${PROFILEDELEGATESCOUNTID}`).text('N/A')
                $(`#${PROFILEDELEGATESID}`).text('N/A')
                $(`#${PROFILEDIDDOCID}`).text(e)
                $(`#${CLOSEPROFILEMODALID}`).text('Close').prop('disabled', false)
            })
      })
      modalInstance.show()
}

function renderModalMetaMaskMissing() {
    $("body").append(modalMetaMaskMissingHTML())
    const modalInstance = Modal.getOrCreateInstance(document.getElementById(WALLETMODALID))
    const onboarding = new MetaMaskOnboarding()
    $(`#${WALLETMODALINSTALLBUTTONID}`).on('click', onboarding.startOnboarding)
    modalInstance.show()
}

async function signIn() {
    await dispatch(walletConnect())
    .unwrap()
    .then(async (result) => {
        renderSignInButton(true, 'Signing in......', true)
        renderAlert(`AlertSigningIn`, 'Signature Request:', 'Waiting for wallet to confirm sign in.', 'info')
        await dispatch(walletSignIn({account: result.account})).unwrap()
        window.ethereum.on('accountsChanged', handleAccountsChanged)
        window.ethereum.on('chainChanged', handleChainChanged)
        removeAllAlerts()
        renderAlert(`alert${result.account}`, 'Sign in successful!', '', 'success', 3000)
    })
    .catch((e) => {
        removeAllAlerts()
        console.log(e)
        switch(e.code) {
            case 4001:
                renderAlert(e.code, 'Transaction Cancelled!', e.message, 'warning', 7000)
                break
            case 9999:
                renderAlert(e.code, 'Sign in cancelled!', e.message, 'danger', 7000)
                break
            default:
                renderAlert(e.code, 'Transaction Cancelled!', e.message, 'danger', 7000)
                break
        }
    })
    return
}

function signOut() {
    dispatch(disconnected())
    renderAlert(`alert`, 'Signed out successfully!', '', 'success', 3000)
}

function initLogInButton() {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
    window.ethereum.removeListener('chainChanged', handleChainChanged)
    renderSignInButton(true, 'Sign in', false, signIn)
}

function renderSignInButton(visible, text, disabled, click) {
    const walletNavBarButton = $(`#${WALLETNAVBARBUTTONID}`)
    walletNavBarButton.prop('disabled', disabled)    
    const walletNavBarButtonText = $(`#${WALLETNAVBARBUTTONTEXTID}`)
    walletNavBarButtonText.text(text)
    if (visible) walletNavBarButton.show()
    else walletNavBarButton.hide()
    walletNavBarButton.off('click').on('click', click)
}

function renderAccount(state) {
    walletNavBarAccount.attr('value', state.currentAccount || '')
    walletNavBarChain.attr('value', formatChainId(state.currentChainId || ''))
    walletNavBarBalance.attr('value', formatEthBalance(state.currentBalance))
}

function hideAccountInfo() {
    $('#userProfile').hide()
    walletNavBarAccount.parent().hide()
    walletNavBarChain.parent().hide()
    walletNavBarBalance.parent().hide()
}

function showAccountInfo() {
    $('#userProfile').show()
    walletNavBarAccount.parent().show()
    walletNavBarChain.parent().show()
    walletNavBarBalance.parent().show()
}

export async function renderWallet() {
    let state = store.getState().wallet
    let walletState = JSON.stringify(state)
    if (previousWalletState == walletState) return
    previousWalletState = walletState
    switch(state.status) {
        case status.DISCONNECTED: 
            hideAccountInfo()
            renderSignInButton(false, '', true)
            renderAccount(state)
            removeAllAlerts()
            dispatch(walletDetect())
            break
        case status.DETECTED:
            initLogInButton()
            break
        case status.MISSING:
            renderModalMetaMaskMissing()
            break
        case status.CONNECTING:
            renderSignInButton(true, 'Connecting...', true)
            break
        case status.SIGNEDIN:
            showAccountInfo()
            renderAccount(state)
            renderSignInButton(true, 'Sign out', false, signOut)
            break
        case status.ACCOUNTCHANGED:
            renderAccount(state)
            signOut()
            initLogInButton()
            // signIn(); 
            break
        case status.CHAINIDCHANGED:
            renderAccount(state)
            // signOut();
            break
        case status.SIGNINGIN:
            break
        case status.ERROR:
            dispatch(disconnected())
            break
        }
}

function handleAccountsChanged(accounts) {
    if(accounts.length > 0) {
        dispatch(walletAccountChanged(accounts[0]))
    } else {
        dispatch(disconnected())
    }
}

function handleChainChanged(chainID) {
    dispatch(walletChainIdChanged(chainID))
}

subscribe(renderWallet)

const WALLETMODALID = 'walletModalId'
const WALLETMODALINSTALLBUTTONID = WALLETMODALID + "InstallButtonId"

function modalMetaMaskMissingHTML() {
    return `
    <div class="modal fade py-5 center" data-bs-backdrop="static" tabindex="-1" role="dialog" id="${WALLETMODALID}">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content rounded-6 shadow">
                <div class="modal-header border-bottom-0">
                    <h5 class="modal-title text-center w-100">Wallet connection</h5>
            <!-- <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button> -->
                </div>
                <div class="modal-body py-0">
                    <p>MetaMask is not installed. Please install it first.</p>
                </div>
                <div class="modal-footer flex-column border-top-0">
                    <button type="button" class="btn btn-lg btn-primary w-100 mx-0 mb-2" id='${WALLETMODALINSTALLBUTTONID}'
                        style="visibility">Install MetaMask</button>
                    <!-- <button type="button" class="btn btn-lg btn-light w-100 mx-0" data-bs-dismiss="modal">Close</button> -->
                </div>
            </div>
        </div>
    </div>
    `
}

function createProfileModalHTML(user) {
    return `<div class="modal fade py-5 modal-dialog-centered" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" role="dialog" id="${CREATEPROFILEMODALID}">
    <div class="modal-dialog modal-dialog-centered modal-xl" role="document">
      <div class="modal-content rounded-5 shadow">
        <div class="modal-header p-5 pb-4 border-bottom-0">
          <h2 class="fw-bold mb-0">Identity Profile</h2>
          <button type="button" disabled class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="close"></button>
        </div>
        <div class="modal-body p-5 pt-0">
          <form class="">
            <div class="form-floating mb-3">
              <input type="text" class="form-control rounded-4 text-white font-weight-bold"
               id="name" placeholder="Decentralized Identifier (DID)"  disabled value=${user.currentDid}>
              <label for="floatingInput" class="text-black font-weight-bold">Decentralized Identifier (DID)</label> 
            </div>
            <div class="form-floating mb-3">
              <input type="text" class="form-control rounded-4 text-white font-weight-bold form-control-plaintext"
               id="name" placeholder="Name"  disabled value=${formatChainId(user.currentChainId)}>
              <label for="floatingInput" class="text-black font-weight-bold">Chain ID</label> 
            </div>
            <div class="form-floating mb-3">
              <input type="text" class="form-control rounded-4 text-white font-weight-bold"
               id="name" placeholder="Account"  disabled value=${user.currentAccount}>
              <label for="floatingInput" class="text-black font-weight-bold">Account</label> 
            </div>
            <div class="form-floating mb-3">
                <textarea class="form-control rounded-4 text-white form-control-plaintext font-monospace" 
                placeholder="" disabled id="${PROFILEDELEGATESID}" style="height: 100px">Loading...</textarea>
                <label for="${PROFILEDELEGATESID}" class="text-black font-weight-bold" id="${PROFILEDELEGATESCOUNTID}">Signing Delegates: </label>
            </div>
            <div class="form-floating mb-3">
                <textarea class="form-control rounded-4 text-white form-control-plaintext font-monospace" 
                placeholder="" disabled id="${PROFILEDIDDOCID}" style="height: 275px">Loading...</textarea>
                <label for="${PROFILEDIDDOCID}" class="text-black font-weight-bold">DID Document</label>
            </div>
            <button class="w-100 mb-2 btn btn-lg rounded-4 btn-primary" data-bs-dismiss="modal" disabled id="${CLOSEPROFILEMODALID}" type="button">Close </button>
          </form>
        </div>
      </div>
    </div>
  </div>`
}

function helpModalHTML() {
    return `<div class="modal fade py-5 modal-dialog-centered" data-bs-keyboard="false" tabindex="-1" role="dialog" id="${HELPMODALID}">
    <div class="modal-dialog modal-dialog-centered modal-xl" role="document">
      <div class="modal-content rounded-5 shadow">
        <div class="modal-header p-5 pb-4 border-bottom-0">
          <h2 class="fw-bold mb-0">Help - Settings</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body p-5 pt-0">
          <form class="">
            <div class="form-floating mb-3">
                <textarea class="form-control rounded-4 text-white form-control-plaintext font-monospace" 
                placeholder="" disabled id="" style="height: 250px">${JSON.stringify(chainList, undefined, 2)}</textarea>
                <label for="" class="text-black font-weight-bold">Chains/Networks supported</label>
            </div>
            <div class="form-floating mb-3">
              <input type="text" class="form-control rounded-4 text-white font-weight-bold form-control-plaintext"
               id="name" placeholder="Name"  disabled value=${ipfsGatewayUrl}>
              <label for="floatingInput" class="text-black font-weight-bold">IPFS Gateway</label> 
            </div>
            <button class="w-100 mb-2 btn btn-lg rounded-4 btn-primary" data-bs-dismiss="modal" id="${CLOSEHELPMODALID}" type="button">Close </button>
          </form>
        </div>
      </div>
    </div>
  </div>`
}

function walletNavBarButtonHTML() {
return `<li style="padding-left: 15px;"><button style="width: 155px" type="button" class="btn btn-outline-primary" 
            id="${WALLETNAVBARBUTTONID}"><img src="./assets/metamask-fox.svg" style="width: 20%; float: right" align="">
                <div id="${WALLETNAVBARBUTTONTEXTID}"></div></button></li>`
}
function walletNavBarAccountHTML() {
return `<li style=" padding-left: 15px;"><div class="border-primary rounded-pill border border-2 ">
        <input type="text" class="form-control-plaintext text-white font-weight-bold" id="${walletNavBarAccountId}"
         value="" size="46" style="text-align:center;" disabled></div></li>`
}

function walletNavBarChainHTML() {
return `<li style=" padding-left: 15px;"><div class="border-primary rounded-pill border border-2">
        <input type="text" class="form-control-plaintext text-white font-weight-bold" id="${walletNavBarChainId}"
        value="" style="text-align:center;" disabled></div></li>`
}

function walletNavBarBalanceHTML(){
    return `<li style=" padding-left: 15px;"><div class="border-primary rounded-pill border border-2">
            <input type="text" class="form-control-plaintext text-white font-weight-bold" id="${walletNavBarBalanceId}"
             value="" style="text-align:center;" disabled></div></li>`
}
