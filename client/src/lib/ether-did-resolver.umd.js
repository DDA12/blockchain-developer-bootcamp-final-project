import * as ethers from 'ethers'

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@ethersproject/basex'), require('@ethersproject/bignumber'), require('@ethersproject/contracts'), require('@ethersproject/providers'), require('ethr-did-registry'), require('@ethersproject/address'), require('@ethersproject/transactions'), require('querystring')) :
  typeof define === 'function' && define.amd ? define(['exports', '@ethersproject/basex', '@ethersproject/bignumber', '@ethersproject/contracts', '@ethersproject/providers', 'ethr-did-registry', '@ethersproject/address', '@ethersproject/transactions', 'querystring'], factory) :
  (global = global || self, factory(global.ethrDidResolver = {}, ethers.utils, ethers, ethers, ethers.providers, {}, ethers.utils, ethers.utils, global.querystring));
}(this, (function (exports, basex, bignumber, contracts, providers, DidRegistryContract, address, transactions, qs) {
  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

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

  function setDidRegistryContract(reg) {
    DidRegistryContract = reg
    DidRegistryContract__default = /*#__PURE__*/_interopDefaultLegacy(DidRegistryContract)
  }

  var DidRegistryContract__default = /*#__PURE__*/_interopDefaultLegacy(DidRegistryContract);
  var qs__namespace = /*#__PURE__*/_interopNamespace(qs);

  const identifierMatcher = /^(.*)?(0x[0-9a-fA-F]{40}|0x[0-9a-fA-F]{66})$/;
  const nullAddress = '0x0000000000000000000000000000000000000000';
  const DEFAULT_REGISTRY_ADDRESS = '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b';
  exports.verificationMethodTypes = void 0;

  (function (verificationMethodTypes) {
    verificationMethodTypes["EcdsaSecp256k1VerificationKey2019"] = "EcdsaSecp256k1VerificationKey2019";
    verificationMethodTypes["EcdsaSecp256k1RecoveryMethod2020"] = "EcdsaSecp256k1RecoveryMethod2020";
    verificationMethodTypes["Ed25519VerificationKey2018"] = "Ed25519VerificationKey2018";
    verificationMethodTypes["RSAVerificationKey2018"] = "RSAVerificationKey2018";
    verificationMethodTypes["X25519KeyAgreementKey2019"] = "X25519KeyAgreementKey2019";
  })(exports.verificationMethodTypes || (exports.verificationMethodTypes = {}));

  var eventNames;

  (function (eventNames) {
    eventNames["DIDOwnerChanged"] = "DIDOwnerChanged";
    eventNames["DIDAttributeChanged"] = "DIDAttributeChanged";
    eventNames["DIDDelegateChanged"] = "DIDDelegateChanged";
  })(eventNames || (eventNames = {}));

  const legacyAttrTypes = {
    sigAuth: 'SignatureAuthentication2018',
    veriKey: 'VerificationKey2018',
    enc: 'KeyAgreementKey2019'
  };
  const legacyAlgoMap = {
    /**@deprecated */
    Secp256k1VerificationKey2018: exports.verificationMethodTypes.EcdsaSecp256k1VerificationKey2019,

    /**@deprecated */
    Ed25519SignatureAuthentication2018: exports.verificationMethodTypes.Ed25519VerificationKey2018,

    /**@deprecated */
    Secp256k1SignatureAuthentication2018: exports.verificationMethodTypes.EcdsaSecp256k1VerificationKey2019,
    //keep legacy mapping
    RSAVerificationKey2018: exports.verificationMethodTypes.RSAVerificationKey2018,
    Ed25519VerificationKey2018: exports.verificationMethodTypes.Ed25519VerificationKey2018,
    X25519KeyAgreementKey2019: exports.verificationMethodTypes.X25519KeyAgreementKey2019
  };
  function strip0x(input) {
    return input.startsWith('0x') ? input.slice(2) : input;
  }
  function bytes32toString(input) {
    const buff = typeof input === 'string' ? Buffer.from(input.slice(2), 'hex') : Buffer.from(input);
    return buff.toString('utf8').replace(/\0+$/, '');
  }
  function stringToBytes32(str) {
    const buffStr = '0x' + Buffer.from(str).slice(0, 32).toString('hex');
    return buffStr + '0'.repeat(66 - buffStr.length);
  }
  function interpretIdentifier(identifier) {
    let id = identifier;
    let network = undefined;

    if (id.startsWith('did:ethr')) {
      id = id.split('?')[0];
      const components = id.split(':');
      id = components[components.length - 1];

      if (components.length >= 4) {
        network = components.splice(2, components.length - 3).join(':');
      }
    }

    if (id.length > 42) {
      return {
        address: transactions.computeAddress(id),
        publicKey: id,
        network
      };
    } else {
      return {
        address: address.getAddress(id),
        network
      }; // checksum address
    }
  }
  const knownInfuraNetworks = {
    mainnet: '0x1',
    ropsten: '0x3',
    rinkeby: '0x4',
    goerli: '0x5',
    kovan: '0x2a'
  };
  const knownNetworks = { ...knownInfuraNetworks,
    rsk: '0x1e',
    'rsk:testnet': '0x1f',
    artis_t1: '0x03c401',
    artis_s1: '0x03c301',
    matic: '0x89',
    maticmum: '0x13881'
  };
  exports.Errors = void 0;

  (function (Errors) {
    /**
     * The resolver has failed to construct the DID document.
     * This can be caused by a network issue, a wrong registry address or malformed logs while parsing the registry history.
     * Please inspect the `DIDResolutionMetadata.message` to debug further.
     */
    Errors["notFound"] = "notFound";
    /**
     * The resolver does not know how to resolve the given DID. Most likely it is not a `did:ethr`.
     */

    Errors["invalidDid"] = "invalidDid";
    /**
     * The resolver is misconfigured or is being asked to resolve a DID anchored on an unknown network
     */

    Errors["unknownNetwork"] = "unknownNetwork";
  })(exports.Errors || (exports.Errors = {}));

  function configureNetworksWithInfura(projectId) {
    if (!projectId) {
      return {};
    }

    const networks = [{
      name: 'mainnet',
      chainId: '0x1',
      provider: new providers.InfuraProvider('homestead', projectId)
    }, {
      name: 'ropsten',
      chainId: '0x3',
      provider: new providers.InfuraProvider('ropsten', projectId)
    }, {
      name: 'rinkeby',
      chainId: '0x4',
      provider: new providers.InfuraProvider('rinkeby', projectId)
    }, {
      name: 'goerli',
      chainId: '0x5',
      provider: new providers.InfuraProvider('goerli', projectId)
    }, {
      name: 'kovan',
      chainId: '0x2a',
      provider: new providers.InfuraProvider('kovan', projectId)
    }];
    return configureNetworks({
      networks
    });
  }

  function getContractForNetwork(conf) {
    var _conf$web;

    let provider = conf.provider || ((_conf$web = conf.web3) == null ? void 0 : _conf$web.currentProvider);
    if (!provider) {
      if (conf.rpcUrl) {
        var _conf$name;

        const chainIdRaw = conf.chainId ? conf.chainId : knownNetworks[conf.name || ''];
        const chainId = chainIdRaw ? bignumber.BigNumber.from(chainIdRaw).toNumber() : chainIdRaw;
        const networkName = knownInfuraNetworks[conf.name || ''] ? (_conf$name = conf.name) == null ? void 0 : _conf$name.replace('mainnet', 'homestead') : 'any';
        provider = new providers.JsonRpcProvider(conf.rpcUrl, chainId || networkName);
      } else {
        throw new Error(`invalid_config: No web3 provider could be determined for network ${conf.name || conf.chainId}`);
      }
    }
    DidRegistryContract__default['default'] = DidRegistryContract;
    const contract = contracts.ContractFactory.fromSolidity(DidRegistryContract__default['default']).attach(conf.registry || DEFAULT_REGISTRY_ADDRESS).connect(provider);
    return contract;
  }

  function configureNetwork(net) {
    const networks = {};
    const chainId = net.chainId || knownNetworks[net.name || ''];

    if (chainId) {
      if (net.name) {
        networks[net.name] = getContractForNetwork(net);
      }

      const id = typeof chainId === 'number' ? `0x${chainId.toString(16)}` : chainId;
      networks[id] = getContractForNetwork(net);
    } else if (net.provider || net.web3 || net.rpcUrl) {
      networks[net.name || ''] = getContractForNetwork(net);
    }

    return networks;
  }

  function configureNetworks(conf) {
    var _conf$networks;

    return { ...configureNetwork(conf),
      ...((_conf$networks = conf.networks) == null ? void 0 : _conf$networks.reduce((networks, net) => {
        return { ...networks,
          ...configureNetwork(net)
        };
      }, {}))
    };
  }
  /**
   * Generates a configuration that maps ethereum network names and chainIDs to the respective ERC1056 contracts deployed on them.
   * @returns a record of ERC1056 `Contract` instances
   * @param conf configuration options for the resolver. An array of network details.
   * Each network entry should contain at least one of `name` or `chainId` AND one of `provider`, `web3`, or `rpcUrl`
   * For convenience, you can also specify an `infuraProjectId` which will create a mapping for all the networks supported by https://infura.io.
   * @example ```js
   * [
   *   { name: 'development', registry: '0x9af37603e98e0dc2b855be647c39abe984fc2445', rpcUrl: 'http://127.0.0.1:8545/' },
   *   { name: 'goerli', chainId: 5, provider: new InfuraProvider('goerli') },
   *   { name: 'rinkeby', provider: new AlchemyProvider('rinkeby') },
   *   { name: 'rsk:testnet', chainId: '0x1f', rpcUrl: 'https://public-node.testnet.rsk.co' },
   * ]
   * ```
   */


  function configureResolverWithNetworks(conf = {}) {
    const networks = { ...configureNetworksWithInfura(conf.infuraProjectId),
      ...configureNetworks(conf)
    };

    if (Object.keys(networks).length === 0) {
      throw new Error('invalid_config: Please make sure to have at least one network');
    }

    return networks;
  }

  /**
   * A class that can be used to interact with the ERC1056 contract on behalf of a local controller key-pair
   */

  class EthrDidController {
    /**
     * Creates an EthrDidController instance.
     *
     * @param identifier - required - a `did:ethr` string or a publicKeyHex or an ethereum address
     * @param signer - optional - a Signer that represents the current controller key (owner) of the identifier. If a 'signer' is not provided, then a 'contract' with an attached signer can be used.
     * @param contract - optional - a Contract instance representing a ERC1056 contract. At least one of `contract`, `provider`, or `rpcUrl` is required
     * @param chainNameOrId - optional - the network name or chainID, defaults to 'mainnet'
     * @param provider - optional - a web3 Provider. At least one of `contract`, `provider`, or `rpcUrl` is required
     * @param rpcUrl - optional - a JSON-RPC URL that can be used to connect to an ethereum network. At least one of `contract`, `provider`, or `rpcUrl` is required
     * @param registry - optional - The ERC1056 registry address. Defaults to '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b'. Only used with 'provider' or 'rpcUrl'
     */
    constructor(identifier, contract, signer, chainNameOrId = 'mainnet', provider, rpcUrl, registry = DEFAULT_REGISTRY_ADDRESS) {
      this.contract = void 0;
      this.signer = void 0;
      this.address = void 0;
      this.did = void 0;
      // initialize identifier
      const {
        address,
        publicKey,
        network
      } = interpretIdentifier(identifier);
      const net = network || chainNameOrId; // initialize contract connection

      if (contract) {
        this.contract = contract;
      } else if (provider || signer != null && signer.provider || rpcUrl) {
        const prov = provider || (signer == null ? void 0 : signer.provider);
        this.contract = getContractForNetwork({
          name: net,
          provider: prov,
          registry,
          rpcUrl
        });
      } else {
        throw new Error(' either a contract instance or a provider or rpcUrl is required to initialize');
      }

      this.signer = signer;
      this.address = address;
      let networkString = net ? `${net}:` : '';

      if (networkString in ['mainnet:', '0x1:']) {
        networkString = '';
      }

      this.did = publicKey ? `did:ethr:${networkString}${publicKey}` : `did:ethr:${networkString}${address}`;
    }

    getOwner(address, blockTag) {
      try {
        const _this = this;

        return Promise.resolve(_this.contract.functions.identityOwner(address, {
          blockTag
        })).then(function (result) {
          return result[0];
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    attachContract(controller) {
      try {
        const _this2 = this;

        return Promise.resolve(controller ? controller : _this2.getOwner(_this2.address, 'latest')).then(function (currentOwner) {
          const signer = _this2.signer ? _this2.signer : _this2.contract.provider.getSigner(currentOwner) || _this2.contract.signer;
          return _this2.contract.connect(signer);
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    changeOwner(newOwner, options = {}) {
      try {
        const _this3 = this;

        // console.log(`changing owner for ${oldOwner} on registry at ${registryContract.address}`)
        const overrides = {
          gasLimit: 123456,
          gasPrice: 1000000000,
          ...options
        };
        return Promise.resolve(_this3.attachContract(overrides.from)).then(function (contract) {
          delete overrides.from;
          return Promise.resolve(contract.functions.changeOwner(_this3.address, newOwner, overrides)).then(function (ownerChange) {
            return Promise.resolve(ownerChange.wait());
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    addDelegate(delegateType, delegateAddress, exp, options = {}) {
      try {
        const _this4 = this;

        const overrides = {
          gasLimit: 123456,
          gasPrice: 1000000000,
          ...options
        };
        return Promise.resolve(_this4.attachContract(overrides.from)).then(function (contract) {
          delete overrides.from;
          const delegateTypeBytes = stringToBytes32(delegateType);
          return Promise.resolve(contract.functions.addDelegate(_this4.address, delegateTypeBytes, delegateAddress, exp, overrides)).then(function (addDelegateTx) {
            addDelegateTx;
            return Promise.resolve(addDelegateTx.wait());
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    revokeDelegate(delegateType, delegateAddress, options = {}) {
      try {
        const _this5 = this;

        const overrides = {
          gasLimit: 123456,
          gasPrice: 1000000000,
          ...options
        };
        delegateType = delegateType.startsWith('0x') ? delegateType : stringToBytes32(delegateType);
        return Promise.resolve(_this5.attachContract(overrides.from)).then(function (contract) {
          delete overrides.from;
          return Promise.resolve(contract.functions.revokeDelegate(_this5.address, delegateType, delegateAddress, overrides)).then(function (addDelegateTx) {
            return Promise.resolve(addDelegateTx.wait());
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    setAttribute(attrName, attrValue, exp, options = {}) {
      try {
        const _this6 = this;

        const overrides = {
          gasLimit: 123456,
          gasPrice: 1000000000,
          controller: undefined,
          ...options
        };
        attrName = attrName.startsWith('0x') ? attrName : stringToBytes32(attrName);
        attrValue = attrValue.startsWith('0x') ? attrValue : '0x' + Buffer.from(attrValue, 'utf-8').toString('hex');
        return Promise.resolve(_this6.attachContract(overrides.from)).then(function (contract) {
          delete overrides.from;
          return Promise.resolve(contract.functions.setAttribute(_this6.address, attrName, attrValue, exp, overrides)).then(function (setAttrTx) {
            return Promise.resolve(setAttrTx.wait());
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    revokeAttribute(attrName, attrValue, options = {}) {
      try {
        const _this7 = this;

        // console.log(`revoking attribute ${attrName}(${attrValue}) for ${identity}`)
        const overrides = {
          gasLimit: 123456,
          gasPrice: 1000000000,
          ...options
        };
        attrName = attrName.startsWith('0x') ? attrName : stringToBytes32(attrName);
        attrValue = attrValue.startsWith('0x') ? attrValue : '0x' + Buffer.from(attrValue, 'utf-8').toString('hex');
        return Promise.resolve(_this7.attachContract(overrides.from)).then(function (contract) {
          delete overrides.from;
          return Promise.resolve(contract.functions.revokeAttribute(_this7.address, attrName, attrValue, overrides)).then(function (revokeAttributeTX) {
            return Promise.resolve(revokeAttributeTX.wait());
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

  }

  function populateEventMetaClass(logResult, blockNumber) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {};

    if (logResult.eventFragment.inputs.length !== logResult.args.length) {
      throw new TypeError('malformed event input. wrong number of arguments');
    }

    logResult.eventFragment.inputs.forEach((input, index) => {
      let val = logResult.args[index];

      if (typeof val === 'object') {
        val = bignumber.BigNumber.from(val);
      }

      if (input.type === 'bytes32') {
        val = bytes32toString(val);
      }

      result[input.name] = val;
    });
    result._eventName = logResult.name;
    result.blockNumber = blockNumber;
    return result;
  }

  function logDecoder(contract, logs) {
    const results = logs.map(log => {
      const res = contract.interface.parseLog(log);
      const event = populateEventMetaClass(res, log.blockNumber);
      return event;
    });
    return results;
  }

  function _settle(pact, state, value) {
    if (!pact.s) {
      if (value instanceof _Pact) {
        if (value.s) {
          if (state & 1) {
            state = value.s;
          }

          value = value.v;
        } else {
          value.o = _settle.bind(null, pact, state);
          return;
        }
      }

      if (value && value.then) {
        value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
        return;
      }

      pact.s = state;
      pact.v = value;
      const observer = pact.o;

      if (observer) {
        observer(pact);
      }
    }
  }

  const _Pact = /*#__PURE__*/function () {
    function _Pact() {}

    _Pact.prototype.then = function (onFulfilled, onRejected) {
      const result = new _Pact();
      const state = this.s;

      if (state) {
        const callback = state & 1 ? onFulfilled : onRejected;

        if (callback) {
          try {
            _settle(result, 1, callback(this.v));
          } catch (e) {
            _settle(result, 2, e);
          }

          return result;
        } else {
          return this;
        }
      }

      this.o = function (_this) {
        try {
          const value = _this.v;

          if (_this.s & 1) {
            _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
          } else if (onRejected) {
            _settle(result, 1, onRejected(value));
          } else {
            _settle(result, 2, value);
          }
        } catch (e) {
          _settle(result, 2, e);
        }
      };

      return result;
    };

    return _Pact;
  }();

  function _isSettledPact(thenable) {
    return thenable instanceof _Pact && thenable.s & 1;
  }

  function _for(test, update, body) {
    var stage;

    for (;;) {
      var shouldContinue = test();

      if (_isSettledPact(shouldContinue)) {
        shouldContinue = shouldContinue.v;
      }

      if (!shouldContinue) {
        return result;
      }

      if (shouldContinue.then) {
        stage = 0;
        break;
      }

      var result = body();

      if (result && result.then) {
        if (_isSettledPact(result)) {
          result = result.s;
        } else {
          stage = 1;
          break;
        }
      }

      if (update) {
        var updateValue = update();

        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          stage = 2;
          break;
        }
      }
    }

    var pact = new _Pact();

    var reject = _settle.bind(null, pact, 2);

    (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
    return pact;

    function _resumeAfterBody(value) {
      result = value;

      do {
        if (update) {
          updateValue = update();

          if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
            updateValue.then(_resumeAfterUpdate).then(void 0, reject);
            return;
          }
        }

        shouldContinue = test();

        if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
          _settle(pact, 1, result);

          return;
        }

        if (shouldContinue.then) {
          shouldContinue.then(_resumeAfterTest).then(void 0, reject);
          return;
        }

        result = body();

        if (_isSettledPact(result)) {
          result = result.v;
        }
      } while (!result || !result.then);

      result.then(_resumeAfterBody).then(void 0, reject);
    }

    function _resumeAfterTest(shouldContinue) {
      if (shouldContinue) {
        result = body();

        if (result && result.then) {
          result.then(_resumeAfterBody).then(void 0, reject);
        } else {
          _resumeAfterBody(result);
        }
      } else {
        _settle(pact, 1, result);
      }
    }

    function _resumeAfterUpdate() {
      if (shouldContinue = test()) {
        if (shouldContinue.then) {
          shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        } else {
          _resumeAfterTest(shouldContinue);
        }
      } else {
        _settle(pact, 1, result);
      }
    }
  }

  function _catch(body, recover) {
    try {
      var result = body();
    } catch (e) {
      return recover(e);
    }

    if (result && result.then) {
      return result.then(void 0, recover);
    }

    return result;
  }

  function getResolver(options) {
    return new EthrDidResolver(options).build();
  }
  class EthrDidResolver {
    constructor(options) {
      this.contracts = void 0;
      this.contracts = configureResolverWithNetworks(options);
    }
    /**
     * returns the current owner of a DID (represented by an address or public key)
     *
     * @param address
     */


    getOwner(address, networkId, blockTag) {
      try {
        const _this = this;

        //TODO: check if address or public key
        return Promise.resolve(new EthrDidController(address, _this.contracts[networkId]).getOwner(address, blockTag));
      } catch (e) {
        return Promise.reject(e);
      }
    }
    /**
     * returns the previous change
     *
     * @param address
     */


    previousChange(address, networkId, blockTag) {
      try {
        const _this2 = this;

        return Promise.resolve(_this2.contracts[networkId].functions.changed(address, {
          blockTag
        })).then(function (result) {
          // console.log(`last change result: '${BigNumber.from(result['0'])}'`)
          return bignumber.BigNumber.from(result['0']);
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    getBlockMetadata(blockHeight, networkId) {
      try {
        const _this3 = this;

        return Promise.resolve(_this3.contracts[networkId].provider.getBlock(blockHeight)).then(function (block) {
          return {
            height: block.number.toString(),
            isoDate: new Date(block.timestamp * 1000).toISOString().replace('.000', '')
          };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }

    changeLog(identity, networkId, blockTag = 'latest') {
      try {
        const _this4 = this;

        function _temp3(_provider$getNetwork) {
          const chainId = hexChainId ? _provider$getNetwork : _provider$getNetwork.chainId;
          const history = [];
          const {
            address,
            publicKey
          } = interpretIdentifier(identity);
          const controllerKey = publicKey;
          return Promise.resolve(_this4.previousChange(address, networkId, blockTag)).then(function (previousChange) {
            function _temp2() {
              return {
                address,
                history,
                controllerKey,
                chainId
              };
            }

            const _temp = _for(function () {
              return !!previousChange;
            }, void 0, function () {
              const blockNumber = previousChange; // console.log(`gigel ${previousChange}`)

              return Promise.resolve(provider.getLogs({
                address: contract.address,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                topics: [null, `0x000000000000000000000000${address.slice(2)}`],
                fromBlock: previousChange.toHexString(),
                toBlock: previousChange.toHexString()
              })).then(function (logs) {
                const events = logDecoder(contract, logs);
                events.reverse();
                previousChange = null;

                for (const event of events) {
                  history.unshift(event);

                  if (event.previousChange.lt(blockNumber)) {
                    previousChange = event.previousChange;
                  }
                }
              });
            });

            return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
          });
        }

        const contract = _this4.contracts[networkId];
        const provider = contract.provider;
        const hexChainId = networkId.startsWith('0x') ? networkId : knownNetworks[networkId]; //TODO: this can be used to check if the configuration is ok

        return Promise.resolve(hexChainId ? _temp3(bignumber.BigNumber.from(hexChainId).toNumber()) : Promise.resolve(provider.getNetwork()).then(_temp3));
      } catch (e) {
        return Promise.reject(e);
      }
    }

    wrapDidDocument(did, address, controllerKey, history, chainId, blockHeight, now) {
      var _didDocument$verifica;

      const baseDIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1', 'https://identity.foundation/EcdsaSecp256k1RecoverySignature2020/lds-ecdsa-secp256k1-recovery2020-0.0.jsonld'],
        id: did,
        verificationMethod: [],
        authentication: [],
        assertionMethod: []
      };
      let controller = address;
      const authentication = [`${did}#controller`];
      const keyAgreement = [];
      let versionId = 0;
      let nextVersionId = Number.POSITIVE_INFINITY;
      let deactivated = false;
      let delegateCount = 0;
      let serviceCount = 0;
      const auth = {};
      const keyAgreementRefs = {};
      const pks = {};
      const services = {};

      for (const event of history) {
        if (blockHeight !== -1 && event.blockNumber > blockHeight) {
          if (nextVersionId > event.blockNumber) {
            nextVersionId = event.blockNumber;
          }

          continue;
        } else {
          if (versionId < event.blockNumber) {
            versionId = event.blockNumber;
          }
        }

        const validTo = event.validTo || bignumber.BigNumber.from(0);
        const eventIndex = `${event._eventName}-${event.delegateType || event.name}-${event.delegate || event.value}`;

        if (validTo && validTo.gte(now)) {
          if (event._eventName === eventNames.DIDDelegateChanged) {
            const currentEvent = event;
            delegateCount++;
            const delegateType = currentEvent.delegateType; //conversion from bytes32 is done in logParser

            switch (delegateType) {
              case 'sigAuth':
                auth[eventIndex] = `${did}#delegate-${delegateCount}`;
              // eslint-disable-line no-fallthrough

              case 'veriKey':
                pks[eventIndex] = {
                  id: `${did}#delegate-${delegateCount}`,
                  type: exports.verificationMethodTypes.EcdsaSecp256k1RecoveryMethod2020,
                  controller: did,
                  blockchainAccountId: `${currentEvent.delegate}@eip155:${chainId}`
                };
                break;
            }
          } else if (event._eventName === eventNames.DIDAttributeChanged) {
            const currentEvent = event;
            const name = currentEvent.name; //conversion from bytes32 is done in logParser

            const match = name.match(/^did\/(pub|svc)\/(\w+)(\/(\w+))?(\/(\w+))?$/);

            if (match) {
              const section = match[1];
              const algorithm = match[2];
              const type = legacyAttrTypes[match[4]] || match[4];
              const encoding = match[6];

              switch (section) {
                case 'pub':
                  {
                    delegateCount++;
                    const pk = {
                      id: `${did}#delegate-${delegateCount}`,
                      type: `${algorithm}${type}`,
                      controller: did
                    };
                    pk.type = legacyAlgoMap[pk.type] || algorithm;

                    switch (encoding) {
                      case null:
                      case undefined:
                      case 'hex':
                        pk.publicKeyHex = strip0x(currentEvent.value);
                        break;

                      case 'base64':
                        pk.publicKeyBase64 = Buffer.from(currentEvent.value.slice(2), 'hex').toString('base64');
                        break;

                      case 'base58':
                        pk.publicKeyBase58 = basex.Base58.encode(Buffer.from(currentEvent.value.slice(2), 'hex'));
                        break;

                      case 'pem':
                        pk.publicKeyPem = Buffer.from(currentEvent.value.slice(2), 'hex').toString();
                        break;

                      default:
                        pk.value = strip0x(currentEvent.value);
                    }

                    pks[eventIndex] = pk;

                    if (match[4] === 'sigAuth') {
                      auth[eventIndex] = pk.id;
                    } else if (match[4] === 'enc') {
                      keyAgreementRefs[eventIndex] = pk.id;
                    }

                    break;
                  }

                case 'svc':
                  serviceCount++;
                  services[eventIndex] = {
                    id: `${did}#service-${serviceCount}`,
                    type: algorithm,
                    serviceEndpoint: Buffer.from(currentEvent.value.slice(2), 'hex').toString()
                  };
                  break;
              }
            }
          }
        } else if (event._eventName === eventNames.DIDOwnerChanged) {
          const currentEvent = event;
          controller = currentEvent.owner;

          if (currentEvent.owner === nullAddress) {
            deactivated = true;
            break;
          }
        } else {
          if (event._eventName === eventNames.DIDDelegateChanged || event._eventName === eventNames.DIDAttributeChanged && event.name.match(/^did\/pub\//)) {
            delegateCount++;
          } else if (event._eventName === eventNames.DIDAttributeChanged && event.name.match(/^did\/svc\//)) {
            serviceCount++;
          }

          delete auth[eventIndex];
          delete pks[eventIndex];
          delete services[eventIndex];
        }
      }

      const publicKeys = [{
        id: `${did}#controller`,
        type: exports.verificationMethodTypes.EcdsaSecp256k1RecoveryMethod2020,
        controller: did,
        blockchainAccountId: `${controller}@eip155:${chainId}`
      }];

      if (controllerKey && controller == address) {
        publicKeys.push({
          id: `${did}#controllerKey`,
          type: exports.verificationMethodTypes.EcdsaSecp256k1VerificationKey2019,
          controller: did,
          publicKeyHex: strip0x(controllerKey)
        });
        authentication.push(`${did}#controllerKey`);
      }

      const didDocument = { ...baseDIDDocument,
        verificationMethod: publicKeys.concat(Object.values(pks)),
        authentication: authentication.concat(Object.values(auth))
      };

      if (Object.values(services).length > 0) {
        didDocument.service = Object.values(services);
      }

      if (Object.values(keyAgreementRefs).length > 0) {
        didDocument.keyAgreement = keyAgreement.concat(Object.values(keyAgreementRefs));
      }

      didDocument.assertionMethod = [...(((_didDocument$verifica = didDocument.verificationMethod) == null ? void 0 : _didDocument$verifica.map(pk => pk.id)) || [])];
      return deactivated ? {
        didDocument: { ...baseDIDDocument,
          '@context': 'https://www.w3.org/ns/did/v1'
        },
        deactivated,
        versionId,
        nextVersionId
      } : {
        didDocument,
        deactivated,
        versionId,
        nextVersionId
      };
    }

    resolve(did, parsed, // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _unused, options) {
      try {
        const _this5 = this;

        function _temp9() {
          return Promise.resolve(_this5.changeLog(id, networkId, 'latest')).then(function ({
            address,
            history,
            controllerKey,
            chainId
          }) {
            return _catch(function () {
              function _temp7() {
                function _temp5() {
                  return {
                    didDocumentMetadata: { ...status,
                      ...versionMeta,
                      ...versionMetaNext
                    },
                    didResolutionMetadata: {
                      contentType: 'application/did+ld+json'
                    },
                    didDocument
                  }; // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }

                const _temp4 = function () {
                  if (nextVersionId !== Number.POSITIVE_INFINITY) {
                    return Promise.resolve(_this5.getBlockMetadata(nextVersionId, networkId)).then(function (block) {
                      versionMetaNext = {
                        nextVersionId: block.height,
                        nextUpdate: block.isoDate
                      };
                    });
                  }
                }();

                return _temp4 && _temp4.then ? _temp4.then(_temp5) : _temp5(_temp4);
              }

              const {
                didDocument,
                deactivated,
                versionId,
                nextVersionId
              } = _this5.wrapDidDocument(did, address, controllerKey, history, chainId, blockTag, now);

              const status = deactivated ? {
                deactivated: true
              } : {};
              let versionMeta = {};
              let versionMetaNext = {};

              const _temp6 = function () {
                if (versionId !== 0) {
                  return Promise.resolve(_this5.getBlockMetadata(versionId, networkId)).then(function (block) {
                    versionMeta = {
                      versionId: block.height,
                      updated: block.isoDate
                    };
                  });
                }
              }();

              return _temp6 && _temp6.then ? _temp6.then(_temp7) : _temp7(_temp6);
            }, function (e) {
              return {
                didResolutionMetadata: {
                  error: exports.Errors.notFound,
                  message: e.toString() // This is not in spec, nut may be helpful

                },
                didDocumentMetadata: {},
                didDocument: null
              };
            });
          });
        }

        const fullId = parsed.id.match(identifierMatcher);

        if (!fullId) {
          return Promise.resolve({
            didResolutionMetadata: {
              error: exports.Errors.invalidDid,
              message: `Not a valid did:ethr: ${parsed.id}`
            },
            didDocumentMetadata: {},
            didDocument: null
          });
        }

        const id = fullId[2];
        const networkId = !fullId[1] ? 'mainnet' : fullId[1].slice(0, -1);
        let blockTag = options.blockTag || 'latest';

        if (typeof parsed.query === 'string') {
          const qParams = qs__namespace.decode(parsed.query);
          blockTag = typeof qParams['versionId'] === 'string' ? qParams['versionId'] : blockTag;

          try {
            blockTag = Number.parseInt(blockTag);
          } catch (e) {
            blockTag = 'latest'; // invalid versionId parameters are ignored
          }
        }

        if (!_this5.contracts[networkId]) {
          console.log(_this5.contracts);
          console.log(networkId)
          return Promise.resolve({
            didResolutionMetadata: {
              error: exports.Errors.unknownNetwork,
              message: `The DID resolver does not have a configuration for network: ${networkId}`
            },
            didDocumentMetadata: {},
            didDocument: null
          });
        }

        let now = bignumber.BigNumber.from(Math.floor(new Date().getTime() / 1000));

        const _temp8 = function () {
          if (typeof blockTag === 'number') {
            return Promise.resolve(_this5.getBlockMetadata(blockTag, networkId)).then(function (block) {
              now = bignumber.BigNumber.from(Date.parse(block.isoDate) / 1000);
            });
          }
        }();

        return Promise.resolve(_temp8 && _temp8.then ? _temp8.then(_temp9) : _temp9(_temp8));
      } catch (e) {
        return Promise.reject(e);
      }
    }

    build() {
      return {
        ethr: this.resolve.bind(this)
      };
    }

  }

  exports.EthrDidController = EthrDidController;
  exports.REGISTRY = DEFAULT_REGISTRY_ADDRESS;
  exports.attrTypes = legacyAttrTypes;
  exports.bytes32toString = bytes32toString;
  exports.delegateTypes = legacyAlgoMap;
  exports.getResolver = getResolver;
  exports.identifierMatcher = identifierMatcher;
  exports.interpretIdentifier = interpretIdentifier;
  exports.stringToBytes32 = stringToBytes32;
  exports.setDidRegistryContract = setDidRegistryContract

})));

export default globalThis.ethrDidResolver