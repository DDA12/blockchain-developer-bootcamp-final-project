# **Design pattern decisions**

## 1. **Factory and Registry patterns**
The [Registry](../contracts/Registry.sol#L1) contract implements the Factory and the Registry patterns by standardizing the creation of the Portfolios and making their addresses available (global access point per Chain).  
- ***Factory pattern:***  
The standardization of Portfolios is done thru the registration (addition or deletion) of Supported Portfolio contracts. These operations can be only done by the owner of the Registry contract. To register a Supported Portfolio contract, the hash of the creation code must be submitted (keccak256) along with the name of the contract (saved in a map).  
To create an instance of a Portfolio, the creation code must be passed to the Factory `[createPortfolio](../contracts/Registry.sol#L64)' method. This allows the Factory to validate the hash (keccak256) of the creation code (against the list of Supported Portfolios) and then create the new instance of the contract (new Portfolio).  
- ***Registry pattern:***  
It provides a global access point to the created Portfolios for each Chain/Network: '[getAllPortofliosRegistered](../contracts/Registry.sol#L114)'.  
When the Factory creates a new instance of a Portfolio, it registers its address internally. The Owner of a Portfolio can also delete a registered Portfolio if necessary.  

## 2. Inter-Contract Execution
Due to the nature of the design, [Registry](../contracts/Registry.sol#L1) contract calls Portfolio contract (i.e. [vcNFT](../contracts/vcNFT.sol) Portfolio contract) methods: 
- [Example 1](../contracts/Registry.sol#L74)
- [Example 2](../contracts/Registry.sol#L102)

## 3. Inheritance and Interfaces
[Registry contract inherits](../contracts/Registry.sol#L19) from [Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable) and [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable) abstract contracts from [OpenZeppelin](https://docs.openzeppelin.com/openzeppelin/). Ownable implements the ownership concept of a contract to restrict the access of specific functions to the owner only (i.e. '[addPortfolioSupport](../contracts/Registry.sol#L132)' with '[onlyOwner](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable-onlyOwner--)' modifier).  Pausable implements an [emergency mechanism](../contracts/Registry.sol#L168) that can be triggered by an authorized account (owner in this case): Circuit Breaker.  
An [IPortfolio Interface](../contracts/Registry.sol#L14) is implemented for the Inter-Contract calls initiated by Registry. 

[VcNFT contract inherits](../contracts/vcNFT.sol#L16) from [Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable), [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable) and [ERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Enumerable) abstract contracts from [OpenZeppelin](https://docs.openzeppelin.com/openzeppelin/). ERC721Enumerable inherits from ERC721 NFT standard, including the Metadata extension and implements the Enumerable extension.  
Multiple Interfaces ([IERC721](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721), [IERC721Receiver](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Receiver), [IERC721Metadata](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Metadata), [IERC165](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165) and [IERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Enumerable)) have been implemented in [vcNFT](../contracts/vcNFT.sol) (through ERC721Enumerable contract from OpenZepplin).  
The current implementation of NFT ownership (from ERC721) will be changed to a Certificate Of Ownership (COO - JSON Web Token Signed). Then any Portfolio contract will have to implement an IPortfolio interface and/or Abstract contract in order to be registered in the Registry (requirements for a Portfolio to be supported by the Registry).  
 
## 4. Access Control Design Patterns
[Registry](../contracts/Registry.sol#L19) and [vcNFT](../contracts/vcNFT.sol#L15) contracts inherit from [Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable) abstract contract from [OpenZeppelin](https://docs.openzeppelin.com/openzeppelin/). Ownable implements the ownership concept of a contract to restrict the access of specific functions to the owner only (i.e. '[addPortfolioSupport](../contracts/Registry.sol#L132)', '[setCoaURI](../contracts/vcNFT.sol#L101)', '[pause](../contracts/vcNFT.sol#L144)', '[unpause](../contracts/Registry.sol#L175)' with '[onlyOwner](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable-onlyOwner--)' or '[whenNotPaused](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable-whenNotPaused--)' modifier). All administrative or privileged functions are therefore restricted to the owner of the contract in this implementation.

## 5. Upgradable Contracts
The current omplementations of Registry and vcNFT contracts do not integrate the ability to be upgraded. It is planned to change the design to integrate this important mechanism in a near future to facilitate the correction of bugs and upgrades with new functionalities/features.

## 6. Optimizing Gas
- Use of mapping for conditional checks (no looping): [Example](../contracts/Registry.sol#L98).
- Data location: Use memory over storage where possible. Use Calldata when possible if an `external` accessor is declared.
- Function accessor: declare `external` when possible (with the use of calldata): [Example](../contracts/Registry.sol#L64).
- Todo: Convert String types to Bytes32 where applicable (i.e. IPFS-CID) and clean inherited contracts (unused code and variables for this application).