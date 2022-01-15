# Avoiding common attacks

- **Use Specific Compiler Pragma ([SWC-103](https://swcregistry.io/docs/SWC-103))**  
Use of [0.8.0](../contracts/Registry.sol#L2) compiler version that has been used for testing the contract libraries integrated (i.e. openZepplin). This also ensures not using an outdated comipler version.

- **External Calls**  
    - Only '*contract calls*' are made (no use of low-level call methods, i.e. call() or delegatecall()): [Example](../contracts/Registry.sol#L74). This automatically propagates an exception thrown from the external function called (no need to check that the call may fail: [SWC-104](https://swcregistry.io/docs/SWC-104)). 

    - *Favor Pull over Push*: Prioritized receiving contract calls over making external contract calls. The external contract calls were kept to a minimum in the Registry contract. vcNFT contract does not make external contract calls.

- **Use of require ([SWC-123](https://swcregistry.io/docs/SWC-123))**  
`require` is used to check valid conditions (inputs, external calls and variables) towards the begining of functions: [Example](../contracts/Registry.sol#L67).

- **Use modifiers only for checks**  
Modifiers were used to check conditions with `require` only (avoiding replication in multiple functions) : `whenNotPaused`, `whenPaused` and `onlyOwner` provided by [Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable) and [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable) contracts. 

- **Checks-Effects-Interactions Pattern ([SWC-107](https://swcregistry.io/docs/SWC-107))**  
Checks are done first. Then if the checks passed, the state variables are changed accordingy. Finally, the external calls are made. No state change is made after external calls: [Example](../contracts/Registry.sol#L64)

- **Include a Circuit breaker**  
Regsitry and vcNFT contracts implements a circuit breaker feature: Pausable. It is possible to pause most of the features of these contracts in case it is needed: [Example1](../contracts/Registry.sol#L168), [Example2](../contracts/vcNFT.sol#L144) 

- **Integer Overflow and Underflow ([SWC-101](https://swcregistry.io/docs/SWC-101))**  
Use of Solidity Compiler version 0.8.0 and use of [Counters](https://docs.openzeppelin.com/contracts/4.x/api/utils#Counters) from openZepplin.

- **Avoid using tx.origin**  
`tx.origin` is never used in the contracts for this application.


