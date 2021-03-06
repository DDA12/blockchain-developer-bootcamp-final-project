(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.didResolver = {}));
}(this, (function (exports) {
  // Copyright 2018 Consensys AG
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

  function inMemoryCache() {
    const cache = new Map();
    return function (parsed, resolve) {
      try {
        let _exit;

        function _temp2(_result) {
          if (_exit) return _result;
          const cached = cache.get(parsed.didUrl);
          return cached !== undefined ? cached : Promise.resolve(resolve()).then(function (result) {
            var _result$didResolution;

            if (((_result$didResolution = result.didResolutionMetadata) == null ? void 0 : _result$didResolution.error) !== 'notFound') {
              cache.set(parsed.didUrl, result);
            }

            return result;
          });
        }

        const _temp = function () {
          if (parsed.params && parsed.params['no-cache'] === 'true') {
            _exit = 1;
            return Promise.resolve(resolve());
          }
        }();

        return Promise.resolve(_temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }
  function noCache(parsed, resolve) {
    return resolve();
  }
  const PCT_ENCODED = '(?:%[0-9a-fA-F]{2})';
  const ID_CHAR = `(?:[a-zA-Z0-9._-]|${PCT_ENCODED})`;
  const METHOD = '([a-z0-9]+)';
  const METHOD_ID = `((?:${ID_CHAR}*:)*(${ID_CHAR}+))`;
  const PARAM_CHAR = '[a-zA-Z0-9_.:%-]';
  const PARAM = `;${PARAM_CHAR}+=${PARAM_CHAR}*`;
  const PARAMS = `((${PARAM})*)`;
  const PATH = `(/[^#?]*)?`;
  const QUERY = `([?][^#]*)?`;
  const FRAGMENT = `(#.*)?`;
  const DID_MATCHER = new RegExp(`^did:${METHOD}:${METHOD_ID}${PARAMS}${PATH}${QUERY}${FRAGMENT}$`);
  function parse(didUrl) {
    if (didUrl === '' || !didUrl) return null;
    const sections = didUrl.match(DID_MATCHER);

    if (sections) {
      const parts = {
        did: `did:${sections[1]}:${sections[2]}`,
        method: sections[1],
        id: sections[2],
        didUrl
      };

      if (sections[4]) {
        const params = sections[4].slice(1).split(';');
        parts.params = {};

        for (const p of params) {
          const kv = p.split('=');
          parts.params[kv[0]] = kv[1];
        }
      }

      if (sections[6]) parts.path = sections[6];
      if (sections[7]) parts.query = sections[7].slice(1);
      if (sections[8]) parts.fragment = sections[8].slice(1);
      return parts;
    }

    return null;
  }
  const EMPTY_RESULT = {
    didResolutionMetadata: {},
    didDocument: null,
    didDocumentMetadata: {}
  };
  function wrapLegacyResolver(resolve) {
    return function (did, parsed, resolver) {
      try {
        return Promise.resolve(_catch(function () {
          return Promise.resolve(resolve(did, parsed, resolver)).then(function (doc) {
            return { ...EMPTY_RESULT,
              didResolutionMetadata: {
                contentType: 'application/did+ld+json'
              },
              didDocument: doc
            };
          });
        }, function (e) {
          return { ...EMPTY_RESULT,
            didResolutionMetadata: {
              error: 'notFound',
              message: e.toString() // This is not in spec, nut may be helpful

            }
          };
        }));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }
  class Resolver {
    constructor(registry = {}, options = {}) {
      this.registry = void 0;
      this.cache = void 0;
      this.registry = registry;
      this.cache = options.cache === true ? inMemoryCache() : options.cache || noCache;

      if (options.legacyResolvers) {
        Object.keys(options.legacyResolvers).map(methodName => {
          if (!this.registry[methodName]) {
            this.registry[methodName] = wrapLegacyResolver( // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            options.legacyResolvers[methodName]);
          }
        });
      }
    }

    resolve(didUrl, options = {}) {
      try {
        const _this = this;

        const parsed = parse(didUrl);

        if (parsed === null) {
          return Promise.resolve({ ...EMPTY_RESULT,
            didResolutionMetadata: {
              error: 'invalidDid'
            }
          });
        }

        const resolver = _this.registry[parsed.method];

        if (!resolver) {
          return Promise.resolve({ ...EMPTY_RESULT,
            didResolutionMetadata: {
              error: 'unsupportedDidMethod'
            }
          });
        }

        return Promise.resolve(_this.cache(parsed, () => resolver(parsed.did, parsed, _this, options)));
      } catch (e) {
        return Promise.reject(e);
      }
    }

  }

  exports.Resolver = Resolver;
  exports.inMemoryCache = inMemoryCache;
  exports.noCache = noCache;
  exports.parse = parse;
  exports.wrapLegacyResolver = wrapLegacyResolver;

})));

export default globalThis.didResolver