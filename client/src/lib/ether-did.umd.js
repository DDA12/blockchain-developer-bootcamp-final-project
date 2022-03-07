import * as ethers from 'ethers'
import 'did-jwt'

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('did-jwt'), require('@ethersproject/transactions'), require('@ethersproject/signing-key'), require('@ethersproject/wallet'), require('@ethersproject/base64'), require('@ethersproject/bytes'), require('@ethersproject/basex'), require('@ethersproject/strings'), require('ethr-did-resolver')) :
  typeof define === 'function' && define.amd ? define(['exports', 'did-jwt', '@ethersproject/transactions', '@ethersproject/signing-key', '@ethersproject/wallet', '@ethersproject/base64', '@ethersproject/bytes', '@ethersproject/basex', '@ethersproject/strings', 'ethr-did-resolver'], factory) :
  (global = global || self, factory(global.ethrDid = {}, global.didJwt, ethers.utils, ethers.utils, ethers, ethers.utils, ethers.utils, ethers.utils, ethers.utils, global.ethrDidResolver));
}(this, (function (exports, didJwt, transactions, signingKey, wallet, base64, bytes, basex, strings, ethrDidResolver) {
  function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
      Object.keys(e).forEach(function (k) {
        if (k !== 'default') {
          var d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: function () {
              return e[k];
            }
          });
        }
      });
    }
    n['default'] = e;
    return n;
  }

  var base64__namespace = /*#__PURE__*/_interopNamespace(base64);

  exports.DelegateTypes = void 0;

  (function (DelegateTypes) {
    DelegateTypes["veriKey"] = "veriKey";
    DelegateTypes["sigAuth"] = "sigAuth";
    DelegateTypes["enc"] = "enc";
  })(exports.DelegateTypes || (exports.DelegateTypes = {}));

  class EthrDID {
    constructor(conf) {
      this.did = void 0;
      this.address = void 0;
      this.signer = void 0;
      this.owner = void 0;
      this.controller = void 0;
      const {
        address,
        publicKey,
        network
      } = ethrDidResolver.interpretIdentifier(conf.identifier);
      const chainNameOrId = typeof conf.chainNameOrId === 'number' ? bytes.hexValue(conf.chainNameOrId) : conf.chainNameOrId;

      if (conf.provider || conf.rpcUrl || conf.web3) {
        var _conf$web;

        let txSigner = conf.txSigner;

        if (conf.privateKey && typeof txSigner === 'undefined') {
          txSigner = new wallet.Wallet(conf.privateKey);
        }

        this.controller = new ethrDidResolver.EthrDidController(conf.identifier, undefined, txSigner, chainNameOrId, conf.provider || ((_conf$web = conf.web3) == null ? void 0 : _conf$web.currentProvider), conf.rpcUrl, conf.registry || ethrDidResolver.REGISTRY);
        this.did = this.controller.did;
      } else {
        const net = network || chainNameOrId;
        let networkString = net ? `${net}:` : '';

        if (networkString in ['mainnet:', '0x1:']) {
          networkString = '';
        }

        this.did = typeof publicKey === 'string' ? `did:ethr:${networkString}${publicKey}` : `did:ethr:${networkString}${address}`;
      }

      this.address = address;

      if (conf.signer) {
        this.signer = conf.signer;
      } else if (conf.privateKey) {
        this.signer = didJwt.ES256KSigner(conf.privateKey, true);
      }
    }

    static createKeyPair(chainNameOrId) {
      const wallet$1 = wallet.Wallet.createRandom();
      const privateKey = wallet$1.privateKey;
      const address = transactions.computeAddress(privateKey);
      const publicKey = signingKey.computePublicKey(privateKey, true);
      const net = typeof chainNameOrId === 'number' ? bytes.hexValue(chainNameOrId) : chainNameOrId;
      const identifier = net ? `did:ethr:${net}:${publicKey}` : publicKey;
      return {
        address,
        privateKey,
        publicKey,
        identifier
      };
    }

    lookupOwner(cache = true) {
      try {
        var _this$controller;

        const _this = this;

        if (typeof _this.controller === 'undefined') {
          throw new Error('a web3 provider configuration is needed for network operations');
        }

        if (cache && _this.owner) return Promise.resolve(_this.owner);
        return Promise.resolve((_this$controller = _this.controller) == null ? void 0 : _this$controller.getOwner(_this.address));
      } catch (e) {
        return Promise.reject(e);
      }
    }

    changeOwner(newOwner, txOptions) {
      try {
        const _this2 = this;

        if (typeof _this2.controller === 'undefined') {
          throw new Error('a web3 provider configuration is needed for network operations');
        }

        return Promise.resolve(_this2.lookupOwner()).then(function (owner) {
          return Promise.resolve(_this2.controller.changeOwner(newOwner, { ...txOptions,
            from: owner
          })).then(function (receipt) {
            _this2.owner = newOwner;
            return receipt.transactionHash;
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    addDelegate(delegate, delegateOptions, txOptions = {}) {
      try {
        const _this3 = this;

        if (typeof _this3.controller === 'undefined') {
          throw new Error('a web3 provider configuration is needed for network operations');
        }

        return Promise.resolve(_this3.lookupOwner()).then(function (owner) {
          return Promise.resolve(_this3.controller.addDelegate((delegateOptions == null ? void 0 : delegateOptions.delegateType) || exports.DelegateTypes.veriKey, delegate, (delegateOptions == null ? void 0 : delegateOptions.expiresIn) || 86400, { ...txOptions,
            from: owner
          })).then(function (receipt) {
            return receipt.transactionHash;
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    revokeDelegate(delegate, delegateType, txOptions = {}) {
      try {
        const _this4 = this;

        if (delegateType === undefined) delegateType = exports.DelegateTypes.veriKey;

        if (typeof _this4.controller === 'undefined') {
          throw new Error('a web3 provider configuration is needed for network operations');
        }

        return Promise.resolve(_this4.lookupOwner()).then(function (owner) {
          return Promise.resolve(_this4.controller.revokeDelegate(delegateType, delegate, { ...txOptions,
            from: owner
          })).then(function (receipt) {
            return receipt.transactionHash;
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    setAttribute(key, value, expiresIn = 86400,
    /** @deprecated, please use txOptions.gasLimit */
    gasLimit, txOptions = {}) {
      try {
        const _this5 = this;

        if (typeof _this5.controller === 'undefined') {
          throw new Error('a web3 provider configuration is needed for network operations');
        }

        return Promise.resolve(_this5.lookupOwner()).then(function (owner) {
          return Promise.resolve(_this5.controller.setAttribute(key, attributeToHex(key, value), expiresIn, {
            gasLimit,
            ...txOptions,
            from: owner
          })).then(function (receipt) {
            return receipt.transactionHash;
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    revokeAttribute(key, value,
    /** @deprecated please use `txOptions.gasLimit` */
    gasLimit, txOptions = {}) {
      try {
        const _this6 = this;

        if (typeof _this6.controller === 'undefined') {
          throw new Error('a web3 provider configuration is needed for network operations');
        }

        return Promise.resolve(_this6.lookupOwner()).then(function (owner) {
          return Promise.resolve(_this6.controller.revokeAttribute(key, attributeToHex(key, value), {
            gasLimit,
            ...txOptions,
            from: owner
          })).then(function (receipt) {
            return receipt.transactionHash;
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    } // Create a temporary signing delegate able to sign JWT on behalf of identity


    createSigningDelegate(delegateType, expiresIn = 86400) {
      try {
        const _this7 = this;

        if (delegateType === undefined) delegateType = exports.DelegateTypes.veriKey;
        const kp = EthrDID.createKeyPair();
        _this7.signer = didJwt.ES256KSigner(kp.privateKey, true);
        return Promise.resolve(_this7.addDelegate(kp.address, {
          delegateType,
          expiresIn
        })).then(function (txHash) {
          return {
            kp,
            txHash
          };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    } // eslint-disable-next-line


    signJWT(payload, expiresIn) {
      try {
        const _this8 = this;

        if (typeof _this8.signer !== 'function') {
          throw new Error('No signer configured');
        }

        const options = {
          signer: _this8.signer,
          alg: 'ES256K-R',
          issuer: _this8.did
        }; // eslint-disable-next-line @typescript-eslint/no-explicit-any

        if (expiresIn) options['expiresIn'] = expiresIn;
        return Promise.resolve(didJwt.createJWT(payload, options));
      } catch (e) {
        return Promise.reject(e);
      }
    }

    verifyJWT(jwt, resolver, audience) {
      try {
        const _this9 = this;

        if (audience === undefined) audience = _this9.did;
        return Promise.resolve(didJwt.verifyJWT(jwt, {
          resolver,
          audience
        }));
      } catch (e) {
        return Promise.reject(e);
      }
    }

  }

  function attributeToHex(key, value) {
    if (value instanceof Uint8Array || bytes.isBytes(value)) {
      return bytes.hexlify(value);
    }

    const matchKeyWithEncoding = key.match(/^did\/(pub|auth|svc)\/(\w+)(\/(\w+))?(\/(\w+))?$/);
    const encoding = matchKeyWithEncoding == null ? void 0 : matchKeyWithEncoding[6];
    const matchHexString = value.match(/^0x[0-9a-fA-F]*$/);

    if (encoding && !matchHexString) {
      if (encoding === 'base64') {
        return bytes.hexlify(base64__namespace.decode(value));
      }

      if (encoding === 'base58') {
        return bytes.hexlify(basex.Base58.decode(value));
      }
    } else if (matchHexString) {
      return value;
    }

    return bytes.hexlify(strings.toUtf8Bytes(value));
  }

  exports.EthrDID = EthrDID;

})));

export default globalThis.ethrDid