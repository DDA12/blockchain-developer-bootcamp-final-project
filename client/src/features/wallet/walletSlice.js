import {createAsyncThunk, createSlice} from '@reduxjs/toolkit'
import {providers as ethersProviders, utils as ethersUtils} from 'ethers'
import{v4} from 'uuid'
import {MetaMaskOnboarding} from '../../lib/metamask-onboarding.bundle.js'
import {getEthDid} from '../../common/did.js'

export const status = {
    DISCONNECTED: 'disconnected', 
    DETECTING: 'detecting',
    DETECTED: 'detected',
    MISSING: 'missing',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    SIGNINGIN: 'signingIn',
    SIGNEDIN: 'signedIn',
    ACCOUNTCHANGED: 'accountChanged',
    CHAINIDCHANGED: 'chaineIdChanged',
    ERROR: 'error'
  }

const walletProvider = {
    UNDEFINED: 'undefined',
    METAMASK: "MetaMask"
  }
  
const initialState = {
    provider: walletProvider.UNDEFINED,
    status: status.DISCONNECTED,
    currentAccount: null,
    currentChainId: null,
    currentBalance: null,
    currentDid: null
}

async function getBalance(account) {
  return window.ethereum
  .request({ method: 'eth_getBalance', params: [account, 'latest']})
  .then((balance) => {return balance})
}

var provider = undefined

export function getWalletProvider() {
  return provider
}

function signInMsgParams(chainId, nonce) {
  return `Please sign this message to authenticate with this account and we’ll sign you in. This won’t cost you any Ether.
  This is a unique message: ${nonce}.`
  // return {
  //   domain: {
  //     chainId: chainId,
  //     name: 'Veri NFT',
  //     version: '1'
  //   },
  //   message: {
  //     SignIn: `Please sign this message to authenticate with this account and we’ll log you in. This won’t cost you any Ether.
  //     This is a unique message.`,
  //     Nonce: nonce
  //   },
  //   primaryType: 'LogIn',
  //   types: {
  //     EIP712Domain: [
  //       { name: 'name', type: 'string' },
  //       { name: 'version', type: 'string' },
  //       { name: 'chainId', type: 'uint256' },
  //     ],
  //     LogIn: [
  //       { name: 'SignIn', type: 'string' },
  //       { name: 'Nonce', type: 'string' },
  //     ]
  //   }
  // }
}

export const walletSignIn = createAsyncThunk("wallet/signIn", async(arg, thunkAPI) => {
  // Implementation of EIP-191: Signed Data Standard
  // const signerAddress = thunkAPI.getState().wallet.currentAccount;
  const chainId = thunkAPI.getState().wallet.currentChainId
  const msgParams = signInMsgParams(chainId, v4())
  const signature = await provider.getSigner().signMessage(msgParams).catch((e) => {return e})
  // const signature = await window.ethereum.request({ method: 'eth_signTypedData_v4',
  //                                                   params: [signerAddress, JSON.stringify(msgParams)],
  //                                                   from: signerAddress
  //                                                 }).catch((e) => {return e});
  if (signature.code != undefined) return thunkAPI.rejectWithValue(signature)
  // const msgHash = ethersUtils.hashMessage(JSON.stringify(msgParams));
  // const msgHashBytes = ethersUtils.arrayify(msgHash);
  // const recoveredPubKey = ethersUtils.recoverPublicKey(msgHash, signature);
  // const recoveredAddress = ethersUtils.recoverAddress(msgHashBytes, signature);
  const recoveredAddress2 = ethersUtils.verifyMessage(msgParams, signature)
  // console.log(recoveredAddress);
  // console.log(recoveredAddress2);
  // console.log(arg.account);
  if (ethersUtils.getAddress(recoveredAddress2) != ethersUtils.getAddress(arg.account)) {
    return thunkAPI.rejectWithValue({code: 9999, message: "Sign in cancelled: Invalid signature!"})    
  }
})

export const walletDetect = createAsyncThunk("wallet/detect", async (arg, thunkAPI) => {
  if(!await MetaMaskOnboarding.isMetaMaskInstalled()) {
    return thunkAPI.rejectWithValue('MetaMask is not installed')
  }
  updateWeb3Provider()
  return walletProvider.METAMASK
})

function updateWeb3Provider() {
  provider = new ethersProviders.Web3Provider(window.ethereum)
}

export const walletConnect = createAsyncThunk("wallet/connect", async (arg, thunkAPI) => {
  updateWeb3Provider()
  return window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then((accounts) => {return {account: accounts[0], chainId: null, balance: null}})
        .then((res) => {
          return window.ethereum
                  .request({ method: 'eth_chainId'})
                  .then((chainId) => {res.chainId = chainId; return res})
        })
        .then((res) => {
          return  getBalance(res.account)
                  .then((balance) => {res.balance = balance; return res})
        }).catch((e) => {return thunkAPI.rejectWithValue(e)})
})

export const walletAccountChanged = createAsyncThunk("wallet/accountChanged", async (account) => {
  updateWeb3Provider()
  return getBalance(account).then((balance) => {return {account: account, balance: balance}})
  })

export const walletChainIdChanged = createAsyncThunk("wallet/chainIdChanged", async (chainId, thunkAPI) => {
  updateWeb3Provider()
  return getBalance(thunkAPI.getState().wallet.currentAccount).then((balance) => {return {chainId: chainId, balance: balance}})
    })
  
export const walletSlice = createSlice({
  name: 'wallet',
  initialState: initialState,
  reducers: {
    disconnected: (state) => {
      state.status = status.DISCONNECTED
      state.provider = walletProvider.UNDEFINED
      state.currentAccount = null
      state.currentChainId = null
      state.currentBalance = null
      state.currentDid = null
    }
},
  extraReducers(builder) {
    builder
    .addCase(walletDetect.pending, (state) => {
      state.status = status.DETECTING
    })
    .addCase(walletDetect.fulfilled, (state, action) => {
      state.status = status.DETECTED
      state.provider = action.payload
    })
    .addCase(walletDetect.rejected, (state) => {
      state.status = status.MISSING
    })
    .addCase(walletConnect.pending, (state) => {
      state.status = status.CONNECTING
    })
    .addCase(walletConnect.fulfilled, (state, action) => {
      state.status = status.CONNECTED
      state.currentAccount = action.payload.account
      state.currentChainId = action.payload.chainId
      state.currentBalance = action.payload.balance
      state.currentDid = getEthDid(state.currentAccount, state.currentChainId).did
    })
    .addCase(walletConnect.rejected, (state) => {
      state.status = status.ERROR
    })
    .addCase(walletSignIn.pending, (state) => {
      state.status = status.SIGNINGIN
    })
    .addCase(walletSignIn.fulfilled, (state) => {
      state.status = status.SIGNEDIN
    })
    .addCase(walletSignIn.rejected, (state) => {
      state.status = status.ERROR
    })
    .addCase(walletAccountChanged.fulfilled, (state, action) => {
      state.status = status.ACCOUNTCHANGED
      state.currentAccount = action.payload.account
      state.currentBalance = action.payload.balance
      state.did = getEthDid(state.currentAccount, state.currentChainId).did
    })
    .addCase(walletAccountChanged.rejected, (state) => {
      state.status = status.ERROR
    })
    .addCase(walletChainIdChanged.fulfilled, (state, action) => {
      state.status = status.CHAINIDCHANGED
      state.currentChainId = action.payload.chainId
      state.currentBalance = action.payload.balance
      state.currentDid = getEthDid(state.currentAccount, state.currentChainId).did
    })
    .addCase(walletChainIdChanged.rejected, (state) => {
      state.status = status.ERROR
    })
  }
})

// Extract and export each action creator by name
export const { disconnected, chainIdChanged } = walletSlice.actions
// Export the reducer, either as a default or named export
export default walletSlice.reducer