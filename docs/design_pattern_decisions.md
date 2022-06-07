# **Design pattern decisions**

## 1. **Factory, Registry Patterns**
The [Registry](../chain/contracts/Registry.sol#L1) contract implements the Factory and the Registry patterns by standardizing the creation of the Portfolios and making their addresses available (global access point per Chain).  
- ***Factory pattern:***  
The standardization of Portfolios is done thru the registration (addition or deletion) of Supported Portfolio contracts (templates of portfolios). These operations can be only done by the owner of the Registry contract (EOA, multi-sig contract, etc.). To register a Supported Portfolio contract, the contractName and its implementation address must be submitted (saved in a map).  
To create an instance of a Portfolio, the contractName of the template must be passed to the Factory `[createPortfolio](../chain/contracts/Registry.sol#L55)' method. This allows the Factory to validate the contractName (against the list of Supported Portfolios) and then create the new instance of the contract (new Portfolio following the Beacon Proxy pattern - see hereafter).  
- ***Registry pattern:***  
It provides a global access point to the created PortfolioInstances for each Chain/Network: '[getAllPortofliosRegistered](../chain/contracts/Registry.sol#L102)'.  
When the Factory creates a new instance of a Portfolio, it registers its address internally. The Owner of a Portfolio instance can also delete it if necessary.

## 2. Upgradable Contracts Patterns: UUPS and Beacon proxies
The current omplementations of Registry and vcNFT contracts integrates the ability to be upgraded. They integrate this important mechanism which facilitates the correction of bugs and addition of new functionalities/features.  
- ***UUPS Proxy pattern: [EIP-1822](https://eips.ethereum.org/EIPS/eip-1822)***  
The [Registry](../chain/contracts/Registry.sol#L1) contract follows the [UUPS Proxy](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent-vs-uups) pattern. Only one instance of this contract exists on each Chain/Network: one [ERC1967Proxy](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Proxy) instance. The contract is written to be upgradeable by an Admin account (owner by default but can be changed) thru the [UUPSUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) mechanism. Due to the requirements of a proxy-based upgradeability pattern and the EVM specifications, the contract follows these [restrictions](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable).
- ***Beacon Proxy pattern: [Simultaneous Upgrades](https://blog.openzeppelin.com/the-state-of-smart-contract-upgrades/#beacons***  
The [vcNFT](../chain/contracts/vcNFT.sol) contract follows the [Beacon Proxy pattern](https://docs.openzeppelin.com/contracts/4.x/api/proxy#beacon). Only one [UpgradeableBeacon](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UpgradeableBeacon) contract exists on each chain per Portfolio supported (template). It points to the current version of the vcNFT implementation being used. One instance of the [BeaconProxy contract](https://docs.openzeppelin.com/contracts/4.x/api/proxy#BeaconProxy) exists for each Portfolio created. Therefore, upgrading all the instances of a specific Portfolio supported (template) requires only the upgrade of the corresponding Beacon instance.
Many Templates (Portfolio supported) can be added to the registry as long as they are [upgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable).

## 3. Inter-Contract Execution
Due to the nature of the design, [Registry](../chain/contracts/Registry.sol#L1) contract calls Portfolio contract (i.e. [vcNFT](../chain/contracts/vcNFT.sol) Portfolio contract) methods: 
- [Example 1](../chain/contracts/Registry.sol#L59)
- [Example 2](../chain/contracts/Registry.sol#L90)

## 4. Inheritance and Interfaces
[Registry contract inherits](../chain/contracts/RegistryUpgradeable.sol#L16) from [Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable) and [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable) abstract contracts from [OpenZeppelin](https://docs.openzeppelin.com/openzeppelin/). Ownable implements the ownership concept of a contract to restrict the access of specific functions to the owner only (i.e. '[addPortfolioSupport](../chain/contracts/Registry.sol#L141)' with '[onlyOwner](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable-onlyOwner--)' modifier).  Pausable implements an [emergency mechanism](../chain/contracts/Registry.sol#L188) that can be triggered by an authorized account (owner in this case): Circuit Breaker.  
An [IPortfolio Interface](../chain/contracts/Registry.sol#L13) is implemented for the Inter-Contract calls initiated by Registry. 

[VcNFT contract inherits](../chain/contracts/vcNFTUpgradeable.sol#L15) from [Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable), [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable) and [ERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Enumerable) abstract contracts from [OpenZeppelin](https://docs.openzeppelin.com/openzeppelin/). ERC721Enumerable inherits from ERC721 NFT standard, including the Metadata extension and implements the Enumerable extension.  
Multiple Interfaces ([IERC721](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721), [IERC721Receiver](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Receiver), [IERC721Metadata](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Metadata), [IERC165](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165) and [IERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Enumerable)) have been implemented in [vcNFT](../chain/contracts/vcNFT.sol) (through ERC721Enumerable contract from OpenZepplin).  
The current implementation of NFT ownership (from ERC721) will be changed to a Certificate Of Ownership (COO - JSON Web Token Signed). Then any Portfolio contract will have to implement an IPortfolio interface and/or Abstract contract in order to be registered in the Registry (requirements for a Portfolio to be supported by the Registry).  
 
## 5. Access Control Design Patterns
[Registry](../chain/contracts/RegistryUpgradeable.sol#L16) and [vcNFT](../chain/contracts/vcNFTUpgradeable.sol#L15) contracts inherit from [Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable) abstract contract from [OpenZeppelin](https://docs.openzeppelin.com/openzeppelin/). Ownable implements the ownership concept of a contract to restrict the access of specific functions to the owner only (i.e. '[addPortfolioSupport](../chain/contracts/Registry.sol#L132)', '[setCoaURI](../chain/contracts/vcNFT.sol#L101)', '[pause](../chain/contracts/vcNFT.sol#L144)', '[unpause](../chain/contracts/Registry.sol#L175)' with '[onlyOwner](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable-onlyOwner--)' or '[whenNotPaused](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable-whenNotPaused--)' modifier). All administrative or privileged functions are therefore restricted to the owner of the contract in this implementation.  
[Registry](../chain/contracts/RegistryUpgradeable.sol#L19) implements also an Admin role to control the [rights of upgrading the contract](../chain/contracts/RegistryUpgradeable.sol#L36).

## 6. Optimizing Gas
- Implementation of Beacon Proxy pattern for the portfolios: deploy only once the implementation of the contract. Each time a new portfolio is created it only deploys a Proxy contract (very small). It reduces considerably the cost of deploying new portfolios.
- Use of mapping for conditional checks (no looping): [Example](../chain/contracts/Registry.sol#L98).
- Data location: Use memory over storage where possible. Use Calldata when possible if an `external` accessor is declared.
- Function accessor: declare `external` when possible (with the use of calldata): [Example](../chain/contracts/Registry.sol#L64).
- Todo: Convert String types to Bytes32 where applicable (i.e. IPFS-CID) and clean inherited contracts (unused code and variables for this application).
