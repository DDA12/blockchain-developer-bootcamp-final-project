import {v4} from 'uuid'
import {utils as ethersUtils, Contract as ethersContract} from 'ethers'
import buffer from 'buffer'
import didResolver from 'did-resolver' 
import ethrDidResolver from 'ether-did-resolver'
import ethrDid from 'ether-did'
import didJwt from 'did-jwt'
import didJwtVc from 'did-jwt-vc'

let vcTemplate = {}

async function init() {
    vcTemplate = await fetch('./assets/coa.json')
    .then(function(resp) {return resp.json()})
}

(async () => await init())()

var resolver = {}

export function initEthrDidResolver(etherProviders) {
    window.Buffer= buffer.Buffer
    const configProviders = Object.entries(etherProviders).map(([chainKey, config]) => {
        return {chainId: parseInt(chainKey), provider: config.provider, registry: config.ethrDidRegistryContractAddress}
    })
    resolver = new didResolver.Resolver(ethrDidResolver.getResolver({networks: configProviders}))
    return resolver
}

export function getNewEthDid(chainNameOrId) {
    const keyPair = ethrDid.EthrDID.createKeyPair()
    return new ethrDid.EthrDID({...keyPair, chainNameOrId})
}

export function getEthDid(address, chainId) {
    return new ethrDid.EthrDID({identifier: address, chainNameOrId: chainId})
}

export async function resolveDidDocument(did) {
    const didDocument = await resolver.resolve(did)
    return didDocument
}

export function getNewSigningEthDid(chainId, save = true) {
    let keyPair = ethrDid.EthrDID.createKeyPair()
    // console.log('key pair');
    // console.log(keyPair);
    const signer = didJwt.ES256KSigner(keyPair.privateKey, false)
    const etherDid = new ethrDid.EthrDID({identifier: keyPair.address, chainNameOrId: chainId, signer})
    if (save && localStorage[etherDid.did] == undefined) {
        localStorage[etherDid.did] = JSON.stringify({keys: keyPair})
    }
    return etherDid
}

export function getSigningDelegate(ethDid) {
    if (localStorage[ethDid.did] != undefined) {
        const content = JSON.parse(localStorage[ethDid.did])
        const delegates = content.delegates || []
        for (let delegateDid of delegates) {
            const content2 = JSON.parse(localStorage[delegateDid] || {})
            if (content2.keys != undefined) {
                const keyPair = content2.keys
                const signer = didJwt.ES256KSigner(keyPair.privateKey, false)
                const chainId = parseInt(ethrDidResolver.interpretIdentifier(delegateDid).network)
                const etherDid = new ethrDid.EthrDID({identifier: keyPair.address, chainNameOrId: chainId, signer})
                return etherDid
            }
        }
    }
    return null
}

export async function addSigningDelegate(providers, ethDid, ethDidDelegate, providerSigner, save = true) {
    if (localStorage[ethDid.did] == undefined) {
        localStorage[ethDid.did] = JSON.stringify({})
    }
    let content1 = JSON.parse(localStorage[ethDid.did])
    if (content1.delegates == undefined) {
        content1.delegates = []
    }
    if (content1.delegates.includes(ethDidDelegate.did)) return true //Already registered delegate - no need to add it again
    const delegateType = ethrDid.DelegateTypes.sigAuth
    // const providers = getEtherProviders()
    const chainId = parseInt(ethrDidResolver.interpretIdentifier(ethDid.did).network)
    const etherProvider = providers[chainId]
    const writeContract = new ethersContract(etherProvider.ethrDidRegistryContractAddress,
                                              etherProvider.ethrDidRegistryContractBuild.abi,
                                              providerSigner
                                             )
    const tx = await writeContract.addDelegate(ethDid.address, ethersUtils.formatBytes32String(delegateType), ethDidDelegate.address, 8640000000)
    await tx.wait()
    if (save && localStorage[ethDidDelegate.did] != undefined) {
        let content2 = JSON.parse(localStorage[ethDidDelegate.did])
        if (content2.keys != undefined) {
            content1.delegates.push(ethDidDelegate.did)
            localStorage[ethDid.did] = JSON.stringify(content1)
        }
    }
    return true
}

export async function verifyJws(jws) {
    return await didJwtVc.verifyCredential(jws, resolver, { header: { alg: 'ES256K' } })
}

export async function signVerifiableCredential(vcPayload, ethrDidSigner) {
  const jws = await didJwtVc.createVerifiableCredentialJwt(vcPayload, ethrDidSigner,
                                                              { header: { alg: 'ES256K' } , removeOriginalFields: false})
  return jws
}

export function generateVc(didIssuer, didSubject, metaData) {
  let vc = JSON.parse(JSON.stringify(vcTemplate))
  vc.id = v4()
  vc.issuer = didIssuer
  vc.issuanceDate = Math.floor(Date.now() / 1000)
  vc.expirationDate = ""
  vc.credentialSubject.id = didSubject
  vc.credentialSubject.metaData = metaData
  return vc
}

