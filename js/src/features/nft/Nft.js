import {ipfsGatewayUrl, chainList} from "../../common/chain.js";
import '../../lib/jquery.js';
import store from '../../app/store.js';
import { getLocalUriImage } from '../ipfs/Ipfs.js';
import { verifyJws, getNewEthDid } from '../../common/did.js';
import { loadNfts, status as statusNft, createNft, reset as resetNft, nftSetPortfolio} from './nftSlice.js';
import { status as statusRegistry, ready as readyRegistry, nftAdded} from '../registry/registrySlice.js';
import { status as statusWallet } from '../wallet/walletSlice.js';
import { initPortfolio } from '../registry/Registry.js';
import {formatEthAddress, formatChainId, updateToolTip, formatDid, addSpinnerHTML} from  '../../common/helpers.js';
import {renderAlert, removeAllAlerts} from '../../common/alert.js';
import { createDropZone } from '../../common/dropZone.js'; 
import '../../lib/uuid.min.js';
import { getEthDid } from '../../common/did.js';

const CARDSCONTAINERID = 'cardsContainerId';
const COLLECTIONIMAGEID = 'collectionImageId';
const SPINNERID = 'spinnerId';
const JWSSPINNERID = 'jwsSpinnerId';
const CREATEMODALID = 'createCollectionModalId';
const OWNERADDRESSID = 'ownerAddressId';
const CHAINID = 'chainId';
const CERATENFTBUTTON = 'createNFTCollectionId'
const NFTID = 'NFTCollectionId'
const PORTFOLIONAMEID = 'portoflioNamed';
const BACKTOPORTOFLIOSBUTTON = 'backToPortoflios'
const IMAGEJWSID = 'imageJwsId';
const CREATEBUTTONMODALID = 'crreateButtonModalId';
const DIDSUBJECT = 'didSubject';
const DIDSUBJECTVALUE = 'didSubjectValue';
const OWNERTOOLTIPID = 'ownerToolTipId';
const DIDTOOLTIPID = 'didToolTipId';
const LOCATIONTOOLTIPID = 'locationToolTipId';
const CLOSENFTMODALID = 'closeNftModalId';
const CLOSENFTMODALIDSMALL = 'closeNftModalIdSmall';
const SHOWNFTMODALID = 'showNftModalId';
const VERIFIEDMODALNFT = 'verifiedModalNft';

const subscribe = store.subscribe;
const dispatch = store.dispatch;
var previousNftState = '';
var previousWalletState = '';

let unsubscribeInitNft = subscribe(initNft);
let unsubscriberenderNft = undefined;

function updateNftHtml() {
    const stateRegistry = store.getState().registry;
    if (stateRegistry.portfolioSelected == null) return;
    const stateWallet = store.getState().wallet;
    $(`#${PORTFOLIONAMEID}`).text(`Portfolio [${formatChainId(stateRegistry.portfolioSelected.chainId)}] - ${stateRegistry.portfolioSelected.name}`);
    $(`#${PORTFOLIONAMEID}Icon`).remove();
    if (stateWallet.currentAccount!= null && ethers.utils.getAddress(stateWallet.currentAccount) == ethers.utils.getAddress(stateRegistry.portfolioSelected.owner)) {
        $(`#${PORTFOLIONAMEID}`).prepend(`<img id="${PORTFOLIONAMEID}Icon" src="./assets/buddy.png" alt="" width="42" height="22" id="ownerImage" style="padding-left: 12px;padding-right: 12px;"></img>`);
    }    
}

function removeNftHTML() {
    $(`#${NFTID}`).remove();
    dispatch(readyRegistry());
    initPortfolio();
    dispatch(resetNft());
    unsubscribeInitNft = subscribe(initNft);
}

function setNftHtml() {
    unsubscribeInitNft();
    $("main").prepend(NftHTML);
    updateNftHtml();
    $(`#${BACKTOPORTOFLIOSBUTTON}`).off('click').on('click', ()=>{ 
        removeNftHTML();
    });
}

function initNft() {
    let stateRegistry = store.getState().registry;
    switch(stateRegistry.status) {
        case statusRegistry.PORTFOLIOSELECTED:
            setNftHtml();
            dispatch(nftSetPortfolio(stateRegistry.portfolioSelected))
            $(`#${CERATENFTBUTTON}`).off('click').on('click', ()=>{
                const stateWallet = store.getState().wallet;
                const portfolioSelected = store.getState().nft.portfolioSelected;
                if (!stateWallet.currentAccount || !stateWallet.currentChainId) {
                    removeAllAlerts();
                    renderAlert(`AlertCreateNft`+uuid.v4(), 'Create NFT:', 'Please "Sign in" to be able to create an NFT.', 'warning', 7000);
                    return;
                }       
                if (ethers.utils.getAddress(stateWallet.currentAccount) != ethers.utils.getAddress(portfolioSelected.owner)) {
                    removeAllAlerts();
                    renderAlert(`AlertCreateNft`+uuid.v4(), 'Create NFT:', 'You are not the Owner of this Portfolio. You can\'t create an NFT.', 'warning', 7000);
                    return;
                }
                if (parseInt(stateWallet.currentChainId) != parseInt(portfolioSelected.chainId)) {
                    removeAllAlerts();
                    const name = chainList[portfolioSelected.chainId].shortName.toUpperCase();
                    renderAlert(`AlertCreateNft`+uuid.v4(), 'Create NFT:', `Please change the chain/network in MetaMask to "${name}" to create an NFT in this Portfolio.`, 'warning', 7000);
                    return;
                }        
                initCreateModal(stateWallet, portfolioSelected);
            });
            unsubscriberenderNft = subscribe(renderNft);    
            dispatch(loadNfts(stateRegistry.portfolioSelected));
            break;
    }
};

async function  renderNftModal(nft, portfolioSelected, tokenId, localUri) {
    $("body").append(showNftModalHTML(nft, portfolioSelected, tokenId, localUri));
    const jti = nft.jwsDecoded.payload.jti;
    const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById(SHOWNFTMODALID));
    const $showNftModal = $(`#${SHOWNFTMODALID}`);
    $showNftModal.on('hidden.bs.modal', function (event) {
        modalInstance.hide();
        $showNftModal.remove();
      })
      $showNftModal.on('shown.bs.modal', async () => {
        await verifyJws(nft.jws)
        .then(() => {
            $(`#${VERIFIEDMODALNFT}${jti}spinner`).remove();
            $(`#${VERIFIEDMODALNFT}${jti}`).prepend(imageJwsVerified("./assets/confirmation.png"))
            $(`#${CLOSENFTMODALID}`).prop('disabled', false);
            $(`#${CLOSENFTMODALIDSMALL}`).prop('disabled', false);
            return;
            })
        .catch((e) => {
            console.log(e);
            $(`#${VERIFIEDMODALNFT}${jti}spinner`).remove();
            $(`#${VERIFIEDMODALNFT}${jti}`).prepend(imageJwsVerified("./assets/exclamation.png"))
            $(`#${CLOSENFTMODALID}`).prop('disabled', false);
            $(`#${CLOSENFTMODALIDSMALL}`).prop('disabled', false);
        });
        })
      addSpinnerHTML(`${VERIFIEDMODALNFT}${jti}`,`${VERIFIEDMODALNFT}${jti}spinner`, false)
      modalInstance.show();
}

function renderCards(containerId, listNfts, walletUser) {
    const portfolioSelected = store.getState().nft.portfolioSelected;
    for (let tokenId in listNfts) {
        const nft = listNfts[tokenId];
        const nftVc = nft.jwsDecoded.payload;
        const jti = nftVc.jti;
        const nftMetaData = nftVc.vc.credentialSubject.metaData;
        let card = $(`#${jti}`);
        if (card.length == 0) {
            $(`#${containerId}`).append(cardHtml(nftVc, nft.owner, portfolioSelected, tokenId));
            card = $(`#${jti}`);
            updateToolTip(`${OWNERTOOLTIPID}${jti}`);
            updateToolTip(`${DIDTOOLTIPID}${jti}`);
            updateToolTip(`${LOCATIONTOOLTIPID}${jti}`);
            new Promise(()=> {
                return $(`#${jti}`).hide().slideDown(750).css('opacity', 0).animate({opacity: 1}, {queue: false, duration: 750});
            });
            new Promise(async (resolve, reject)=> {
                    addSpinnerHTML(`${COLLECTIONIMAGEID}${jti}`, `${SPINNERID}${jti}`, true)
                    addSpinnerHTML(`${IMAGEJWSID}${jti}`, `${JWSSPINNERID}${jti}`, true, 'text-warning');
                    return resolve(getLocalUriImage(nftMetaData.image));
                }
            ).then((localUri) => {
                $(`#${COLLECTIONIMAGEID}${jti}`)
                    .css({"background-image": "url('"+localUri+"'),"+"url('"+localUri+"')",
                        "background-size": "contain, 1000%", "background-repeat": "no-repeat, no-repeat",
                        "background-position": "center, center"})
                        .off("click").on('click', () => {
                            renderNftModal(nft, portfolioSelected, tokenId, localUri);
                        })
                        .css('cursor', 'pointer');
                $(`#${SPINNERID}${jti}`).remove();
            })
            .then(() => {
                return new Promise(async () => {
                    return await verifyJws(listNfts[tokenId].jws).then(() => {
                    $(`#${JWSSPINNERID}${jti}`).remove();
                    $(`#${IMAGEJWSID}${jti}`).prepend(imageJwsVerified("./assets/confirmation.png"));
                    })
                    .catch((e) => {
                        $(`#${JWSSPINNERID}${jti}`).remove();
                        $(`#${IMAGEJWSID}${jti}`).prepend(imageJwsVerified("./assets/exclamation.png"));
                        console.log(e);
                        return e;
                    });
                });
            });
        };
        card.find(`#ownerImage`).remove();
        if (walletUser.currentAccount!= null && ethers.utils.getAddress(walletUser.currentAccount) == ethers.utils.getAddress(nft.owner)) {
            card.find(`#owner`).prepend('<img src="./assets/buddy.png" alt="" width="42" height="22" id="ownerImage" style="padding-left: 12px;padding-right: 12px;"></img>');
        }
    }
};

function renderNft() {
    const stateWallet = store.getState().wallet;
    const state = store.getState().nft;
    let walletState = JSON.stringify(stateWallet);
    if (previousWalletState != walletState) {
        previousWalletState = walletState;
        switch(stateWallet.status) {
            case statusWallet.SIGNEDIN:
            case statusWallet.DISCONNECTED:
            case statusWallet.DETECTED:
                renderCards(CARDSCONTAINERID, state.listNfts, stateWallet);
                updateNftHtml();
                break;
        }    
    }
    let nftState = JSON.stringify(state);
    if (previousNftState == nftState) return;
    previousNftState = nftState;
    switch(state.status) {
        case statusNft.LOADING:
            if ($(`#${PORTFOLIONAMEID}div`).find(`#spinner${PORTFOLIONAMEID}`).length == 0) {
                addSpinnerHTML(`${PORTFOLIONAMEID}div`, `spinner${PORTFOLIONAMEID}`, true);
            }
            renderCards(CARDSCONTAINERID, state.listNfts, stateWallet);
            break;
        case statusNft.READY:
            $(`#${PORTFOLIONAMEID}div`).find(`#spinner${PORTFOLIONAMEID}`).remove();
            break;
        case statusNft.MINTINGNFTSUBMITTED:
            $(`#${CREATEMODALID}`).find(`#${CREATEBUTTONMODALID}`).text('Minting request submitted. Waiting for wallet confirmation...')
            .prepend('<span class="spinner-border text-warning float-end" role="status"></span>');
            break;
        case statusNft.WAITINGFORCONFIRMATION:
            $(`#${CREATEMODALID}`).find(`#${CREATEBUTTONMODALID}`).text('Mining in progress. Waiting for confirmation...')
            .prepend('<span class="spinner-border text-warning float-end" role="status"></span>');
            break;   
        case statusNft.ADDINGDELEGATE:
            $(`#${CREATEMODALID}`).find(`#${CREATEBUTTONMODALID}`).text('Adding Delegate. Waiting for wallet confirmation...')
            .prepend('<span class="spinner-border text-warning float-end" role="status"></span>');
            renderAlert(`alertADDINGDELEGATE`, 'Adding delegate:', 'No delegate found for this account and chain. A signing Delegate is needed to sign the verifiable credential.', 'warning')
            break;
        } 
}

function validateCeateForm(createModal, dropZoneId) {
    const name = createModal.find('#name');
    const description = createModal.find('#description');
    const url = createModal.find('#url');
    let test = true;
    if (name.val() == "") {
        name.css('background-color', 'red');
        test = false;
    } else {
        name.css('background-color', 'white')
    }
    if (description.val() == "") {
        description.css('background-color', 'red');
        test = false;
    } else {
        description.css('background-color', 'white')
    }
    if (url.val() == "") {
        $(`#${dropZoneId}`).css("border-color", "red");
        test = false;
    } else {
        $(`#${dropZoneId}`).css('background-color', 'white')
    }
    return test
}

function initCreateModal(walletState, portfolioSelected ) {
    $("body").append(createNftModalHTML(walletState, portfolioSelected));
    const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById(CREATEMODALID));
    const $createNftModal = $(`#${CREATEMODALID}`);
    $createNftModal.on('hidden.bs.modal', () => {$createNftModal.remove();})
    const $url = $createNftModal.find('#url');
    const dropZoneId = createDropZone($createNftModal.find(`#dropZoneDiv`), $url);
    $createNftModal.find(`#${CREATEBUTTONMODALID}`).off('click').on('click', () => {
        if (!validateCeateForm($createNftModal, dropZoneId)) return;
        $createNftModal.find(`#close`).attr("disabled", true);
        $createNftModal.find(`#${CREATEBUTTONMODALID}`).prop('disabled', true).text('Creating...');
        const name = $createNftModal.find('#name').val();
        const description = $createNftModal.find('#description').val();
        const didSubject = $createNftModal.find(`#${DIDSUBJECTVALUE}`).val();
        const image = $url.val();
        dispatch(createNft({chainId: walletState.currentChainId, contractAddress: portfolioSelected.address,
                                             didIssuer: walletState.currentDid, didSubject,
                                             metaData: {name, description, image}}))
            .unwrap()
            .then((result) => {
                removeAllAlerts();
                renderCards(CARDSCONTAINERID, {[result.nftInfo.tokenId]: result.nftInfo}, walletState);
                const targetOffset = $(`#${result.nftInfo.jwsDecoded.payload.jti}`).offset().top;
                $('html, body').animate({scrollTop: targetOffset}, 500);
                modalInstance.hide();
                renderAlert(`alert${result.nftInfo.tokenId}${result.address}`, 'Transaction completed:', `New NFT minted! 
                <a href="${chainList[portfolioSelected.chainId].chainExplorer}tx/${result.transactionReceipt.transactionHash}" target="_blank">
                Tx: ${formatEthAddress(result.transactionReceipt.transactionHash,12)}</a>`, 'success', 12000);
                dispatch(nftAdded({address: portfolioSelected.address, chainKey: portfolioSelected.chainId}));
            })
            .catch(async (e) => {
                removeAllAlerts();
                modalInstance.hide();
                console.log(e);
                switch(e.code) {
                    case 4001:
                        renderAlert(e.code, 'Transaction Cancelled!', e.message, 'warning', 7000)
                        break;
                        case "TRANSACTION_REPLACED":
                            if (e.reason == "cancelled") {
                                renderAlert(e.code, 'Transaction Cancelled!', "", 'warning', 7000)
                                break;
                            }
                            renderAlert(e.code, 'Transaction Cancelled!', e.message, 'error', 7000)
                            break;
                        default:
                        renderAlert(e.code, 'Transaction Cancelled!', e.message, 'error', 7000)
                        break;
                }
            });
        return;
    });    
    modalInstance.show();
};

function imageJwsVerified(img) {
    return `<img src="${img}" width="32" height="32" class="rounded-circle border border-white">`
}

function cardHtml(nftVc, owner, portfolioSelected, tokenId) {
    const jti = nftVc.jti;
    const didOwner = getEthDid(owner, portfolioSelected.chainId).did;
    const chainIdFormatted = formatChainId(portfolioSelected.chainId);
    const ownerFormated = formatEthAddress(owner, 12);
    const addressFormated = formatEthAddress(portfolioSelected.address, 12);
    const didFormated = formatDid(nftVc.sub);
    return `<div class="col" id="${jti}">
                <div>
                    <div class="card-header d-flex flex-column h-100 bg-black text-white text-shadow-1">
                        <small id='${OWNERTOOLTIPID}${jti}' class="text-center" 
                        data-bs-toggle="tooltip" data-bs-placement="top" title="${formatDid(didOwner, 46)}">
                        Owner: <span id="owner"><i>${chainIdFormatted}</i>&nbsp:&nbsp${ownerFormated}</span></small>
                    </div>
                    <div id="${COLLECTIONIMAGEID}${jti}" style="border-radius: 12px;" class="card-cover h-100 overflow-hidden text-white shadow-lg">
                        <div class="d-flex flex-column h-100 p-5 pb-3 text-white text-shadow-1">
                            <h2 class="pt-5 mt-5 mb-4 display-6 lh-1 fw-bold">${nftVc.vc.credentialSubject.metaData.name}</h2>
                            <ul class="d-flex list-unstyled mt-auto">
                            <li class="me-auto" id="${IMAGEJWSID}${jti}">
                            </li>
                            </ul>
                        </div>
                    </div>                    
                    <div class="card-body d-flex flex-column h-100 bg-black text-white text-shadow-1">
                        <small id="${DIDTOOLTIPID}${jti}" 
                        class="text-center" data-bs-toggle="tooltip" data-bs-placement="top" title="${nftVc.sub}">
                        NFT ID: <i>${didFormated}</i></small>
                        <small id="${LOCATIONTOOLTIPID}${jti}" 
                            class="text-center" data-bs-toggle="tooltip" data-bs-placement="top" 
                            title="Chain: ${chainIdFormatted} (${portfolioSelected.chainId})<br>Contract: ${portfolioSelected.address}<br>TokenID: ${tokenId}">
                        Location: <i>${chainIdFormatted}</i>&nbsp:&nbsp${addressFormated}&nbsp:&nbsp<i>${tokenId}</i></small>

                    </div>
                </div>
            </div>`;
        };

function createNftModalHTML(state, portfolioSelected) {
    const didSubject = getNewEthDid(state.currentChainId).did
    return `<div class="modal fade py-5" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" role="dialog" id="${CREATEMODALID}">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
      <div class="modal-content rounded-5 shadow">
        <div class="modal-header p-5 pb-4 border-bottom-0">
          <h2 class="fw-bold mb-0">Create a new NFT</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="close"></button>
        </div>
        <div class="modal-body p-5 pt-0">
          <form class="">
          <h6 class="fw-bold mb-3">NFT Decentralized ID:</h6>
          <div class="form-floating mb-3" id=${DIDSUBJECT}>${didSubject}
          </div>
          <input type="text" class="form-control" id="${DIDSUBJECTVALUE}" hidden value='${didSubject}'>
          <h6 class="fw-bold mb-3">Location</h6>
          <div class="form-floating mb-3" id=${CHAINID}>Chain: ${formatChainId(state.currentChainId)}
          </div>
          <div class="form-floating mb-3">Contract address: ${portfolioSelected.address}
          </div>
          <h6 class="fw-bold mb-3">Owner</h6>
          <div class="form-floating mb-3" id=${OWNERADDRESSID}>Decentralized ID: ${state.currentDid}
            </div>
            <div class="form-floating mb-3" id=${OWNERADDRESSID}>Account: ${state.currentAccount}
            </div>
            <h6 class="fw-bold mb-3">NFT Information</h6>
            <div class="form-floating mb-3">
              <input type="text" class="form-control rounded-4" id="name" placeholder="Name">
              <label for="floatingInput">Name</label>
            </div>
            <div class="form-floating mb-3">
              <textarea  type="text" class="form-control rounded-4" id="description" placeholder="Description" style="height: 100px"></textarea>
              <label for="text">Description</label>
            </div>
            <div class="form-floating mb-3" hidden>
              <input type="url" class="form-control rounded-4" id="url" placeholder="URL for image">
              <label for="text">URL for image</label>
            </div>
            <div id="dropZoneDiv"></div>
            <button class="w-100 mb-2 btn btn-lg rounded-4 btn-primary" id="${CREATEBUTTONMODALID}" type="button">Sign Certificate Of Authenticity and Create</button>
          </form>
        </div>
      </div>
    </div>
  </div>`
};

function NftHTML() {
    return `<div class="container px-4 py-5" id="${NFTID}" >
                <div class="container position-fixed " style="background-color: black; padding: 0em;">
                    <div class="row border-bottom" >
                        <div class="col" id="${PORTFOLIONAMEID}div">
                            <h4 class="" style="padding-top: 0em; margin:0;" id=''> 
                                <a id="${BACKTOPORTOFLIOSBUTTON}" class="btn btn-sm btn-outline-primary txt-white font-weight-bold" role="button" >Back</a>
                                <span id='${PORTFOLIONAMEID}'> </span>
                            </h4>  
                        </div>
                        <div class="col" style="">
                            <p class="text-end" style="padding-top: 0.17em; margin:0;">
                                <a id="${CERATENFTBUTTON}" class="btn btn-sm btn-outline-warning txt-white font-weight-bold" role="button" >Create an NFT</a>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 align-items-stretch g-4 py-5" id="${CARDSCONTAINERID}">
                </div>
            </div>`
};

function showNftModalHTML(nft, portfolioSelected, tokenId, localUri) {
    const nftVc = nft.jwsDecoded.payload;
    const jti = nftVc.jti;
    const chainIdFormatted = formatChainId(portfolioSelected.chainId);
    const didSubjectFormated = formatDid(nftVc.sub, 44);
    const didIssuerFormated = formatDid(nftVc.iss, 44);
    return `<div class="modal fade py-5 modal-dialog-centered" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" role="dialog" id="${SHOWNFTMODALID}">
    <div class="modal-dialog modal-dialog-centered modal-xl" role="document">
      <div class="modal-content rounded-5 shadow">
        <div class="modal-header p-5 pb-4 border-bottom-0">
          <h2 class="fw-bold mb-0">${nftVc.vc.credentialSubject.metaData.name}</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" disabled id="${CLOSENFTMODALIDSMALL}"></button>
        </div>
        <div class="modal-body p-5 pt-0">
            <form class="">
                <div class="form-floating mb-3">
                Certificate Of Authenticity &nbsp&nbsp
                    <span id='${VERIFIEDMODALNFT}${jti}'><br></span>
                </div>
                <div class="form-floating mb-3">
                    <input type="text" class="form-control rounded-4 text-white font-weight-bold form-control-plaintext font-monospace"
                    id="NftID" placeholder="NFT ID"  disabled value='${didSubjectFormated}'>
                    <label for="floatingInput" class="text-black font-weight-bold">NFT Unique Identifier</label> 
                </div>
                <div class="form-floating mb-3">
                    <input type="text" class="form-control rounded-4 text-white font-weight-bold form-control-plaintext font-monospace"
                    id="issuer" placeholder="issuer"  disabled value='${didIssuerFormated}'>
                    <label for="floatingInput" class="text-black font-weight-bold">Creator (Issuer) Unique Identifier</label> 
                </div>
                <div class="form-floating mb-3">
                    <input type="text" class="form-control rounded-4 text-white font-weight-bold form-control-plaintext font-monospace"
                    id="owner" placeholder="owner"  disabled value='${chainIdFormatted}:${nft.owner}'>
                    <label for="floatingInput" class="text-black font-weight-bold">Owner account (Chain : Account number)</label> 
                </div>
                <div class="form-floating mb-3">
                    <input type="text" class="form-control rounded-4 text-white font-weight-bold form-control-plaintext font-monospace"
                    id="location" placeholder="Location"  disabled value='${chainIdFormatted}:${portfolioSelected.address}:${tokenId}'>
                    <label for="floatingInput" class="text-black font-weight-bold">Location (Chain : Contract Address : Token ID)</label> 
                </div>
                <div class="form-floating mb-3">
                    <a href='${ipfsGatewayUrl}${nftVc.vc.credentialSubject.metaData.image}' target="_blank">
                        <img src=${localUri} style="display: block;margin-left: auto;margin-right: auto;width: 100%;">
                    </a>
                </div>
                <div class="form-floating mb-3">
                    <textarea class="form-control rounded-4 text-white font-weight-bold form-control-plaintext font-monospace"
                    id="Description" placeholder="Description"  style="height: 125px" disabled>${nftVc.vc.credentialSubject.metaData.description}</textarea>
                    <label for="floatingInput" class="text-black font-weight-bold">Description</label> 
                </div>
                <div class="form-floating mb-3">
                    <textarea class="form-control rounded-4 text-white font-weight-bold form-control-plaintext font-monospace"
                    id="VC_COA" placeholder="VC_COA"  style="height: 250px" disabled>${JSON.stringify(nftVc, undefined, 2)}</textarea>
                    <label for="floatingInput" class="text-black font-weight-bold">Certificate Of Authenticity (COA) - JSON Web Token Signed</label> 
                </div>
                <button class="w-100 mb-2 btn btn-lg rounded-4 btn-primary" data-bs-dismiss="modal" disabled id="${CLOSENFTMODALID}" type="button">Close </button>
            </form>
        </div>
      </div>
    </div>
  </div>`
};
