// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./RegistryStorage.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

/// @title Registry Contract for Portfolios of NFTs
/// @author D Collette
/// @notice You can use this contract to manage standardize Portfolios (Create/Locate portfolio contracts: Factory and Registry patterns) compliant with Verifiable credentials: Certificate of Authenticity, Certificate of Ownership, etc. )
/// @dev Need to expand the Portfolio interface (and abstract contract) and move it out in a seperate file. Verify Interface/Methods of abstract contract implemented for each Portfolio supported.

interface IPortfolio {
    function transferOwnership(address newOwner) external;
    function owner() external view returns (address);
    function initialize(string memory name_, string memory symbol_, string memory portfolioURI_) external;
}

contract Registry is RegistryStorage {

    /// @notice Emitted when a Portfolio instance is created.
    /// @dev Emitted when a Portfolio instance is deployed with createPortfolio method.
    event portfolioDeployed(string contractName, address indexed implementationAddress, address indexed portfolioAddress, address indexed owner);

    /// @notice Emitted when a Portfolio instance is registered.
    /// @dev Emitted when a Portfolio instance is added to the Portfolios Registered array.
    event portfolioRegistered(string contractName, address indexed implementationAddress, address indexed portfolioAddress, address indexed owner);

    /// @notice Emitted when a Portfolio instance is unregistered.
    /// @dev Emitted when a Portfolio instance is removed from the Portfolios Registered array.
    event portfolioUnregistered(address indexed portfolioAddress, address indexed owner);

    /// @notice Emitted when a Portfolio Support is added.
    /// @dev Emitted when a Portfolio Support is added to the map of Portfolios Supported.
    event portfolioSupportAdded(string contractName, address indexed beaconAddress, address indexed implementationAddress);

    /// @notice Emitted when a Portfolio Support is deleted.
    /// @dev Emitted when a Portfolio Support is deleted from the map of Portfolios Supported.
    event portfolioSupportDeleted(string contractName, address indexed beaconAddress, address indexed implementationAddress);

    /// @dev Called after creation of contract dues to the requirements of a proxy-based upgradeability pattern: delegateCalls using proxy storage  - no contructor can be used
    function initialize() public initializer {
        __RegistryUpgradeable_init();
    }

    /// @notice Create a Portfolio with information provided.
    /// @dev Create a Portfolio instance (Beacon proxy) using the provided contractName and register it (Factory and Registry patterns). 
    /// @dev Requirements: whenNotPaused and portfolio byte code is supported.
    /// @param contractName_ Name of Portfolio contract supported to be used to create a new instance of a portfolio.
    /// @param owner_ Address of owner of portfolio - Transfer ownership of Portfolio created to owner_.
    /// @param name_ Name of Portfolio instance.
    /// @param symbol_ Symbol of Portfolio instance.
    /// @param portfolioURI_ URI of Portfolio instance (Current Client implementation: IPFS CID of image file).
    /// @return address of created/deployed Portfolio Contract instance: BeaconProxy address.
    function createPortfolio(string memory contractName_, address owner_, string memory name_, string memory symbol_, string memory portfolioURI_)
     external whenNotPaused returns (address) {
         require(isPortoflioSupported(contractName_), "Registry: createPorfolio => Portfolio not supported");
        address addressDeployed = address(new BeaconProxy(_portfoliosSupported[contractName_].beacon, bytes("")));
        IPortfolio(addressDeployed).initialize(name_, symbol_, portfolioURI_);
        IPortfolio(addressDeployed).transferOwnership(owner_);
        _portfoliosRegistered.push(addressDeployed);
        _portfoliosRegisteredIndex[addressDeployed] = _portfoliosRegistered.length;
        emit portfolioDeployed(contractName_, _portfoliosSupported[contractName_].implementation, addressDeployed, owner_);
        emit portfolioRegistered(contractName_, _portfoliosSupported[contractName_].implementation, addressDeployed, owner_);
        return addressDeployed;
    }

    /// @notice Verify if Portfolio instance registered.
    /// @dev Verify if Portfolio rinstance egistred by checking the '_portfoliosRegisteredIndex'.
    /// @param portfolioAddress address of Portfolio instance to be verified.
    /// @return boolean - False if Portfolio instance not registered.
    function isPortoflioRegistered(address portfolioAddress) external view returns (bool) {
        uint256 idx = _portfoliosRegisteredIndex[portfolioAddress];
        if ( idx == uint256(0x0)) {
            return false;
        }
        return true;
    }

    /// @notice Unregister a Portfolio instance.
    /// @dev Unregister a Portfolio instance at address specified.
    /// @dev Requirements: whenNotPaused and called by owner of Portfolio instance or Registry only.
    /// @param portfolioAddress address of Portfolio instance to be unregistered.
    /// @return bool.
    function unregisterPortfolio(address portfolioAddress) external whenNotPaused returns (bool) {
        uint256 idx = _portfoliosRegisteredIndex[portfolioAddress];
        if ( idx == uint256(0x0)) {
            return false;
        }
        address _owner = IPortfolio(portfolioAddress).owner();
        require(_owner == _msgSender() || owner() == _msgSender(), "Registry: unregisterPortfolio => caller is not the owner of Portfolio or Registry");
        delete _portfoliosRegistered[idx-1];
        _portfoliosRegisteredIndex[portfolioAddress] = 0;
        emit portfolioUnregistered(portfolioAddress, _owner);
        return true;
    }

    /// @notice Get addresses of registered Portfolio instances.
    /// @dev Get registered Portfolios' addresses (array). 
    /// @dev Requirements: whenNotPaused.
    /// @return array of addresses.
    function getAllPortofliosRegistered() external view whenNotPaused returns (address[] memory) {
        return _portfoliosRegistered;
    }

    /// @notice Compute Hash of Portfolio bytecode.
    /// @dev Compute keccak256 Hash of bytecode provided. 
    /// @param byteCode_ creation byte code of Portfolio contract to be created.
    /// @return bytes32:keccak256 hash.
    function getHashByteCode(bytes calldata byteCode_) external pure returns (bytes32) {
        return keccak256(byteCode_);
    }

    /// @notice Upgrade implementation of Portfolio support.
    /// @dev Upgrade implementation of Portfolio support: Beacon proxy pattern -> upgrade all instances using this beacon. 
    /// @param contractName_ Name of Portoflio support to upgrade.
    /// @param newImplementation_ Address of new implementation.
    /// @return bool
    function upgradePortfolioSupport(string memory contractName_, address newImplementation_) external onlyOwner returns (bool) {
        if (isPortoflioSupported(contractName_)) {
            UpgradeableBeacon(_portfoliosSupported[contractName_].beacon).upgradeTo(newImplementation_);
            return true;
        }
        return false;
    }
    
    /// @notice Get Beacon instance for a Portfolio supported.
    /// @dev Get Beacon instance for a Portfolio supported. 
    /// @param contractName_ Name of Portoflio support.
    /// @return address:Beacon instance
        function getBeaconPortoflioSupported(string memory contractName_) public view returns (address) {
        return _portfoliosSupported[contractName_].beacon;
    }

    /// @notice Add support of a Portfolio.
    /// @dev Add support of a Portfolio. 
    /// @dev Requirements: onlyOwner.
    /// @param contractName_ Name of Portfolio Contract.
    /// @param implementation_ creation byte code Hash of Portfolio contract to be added.
    /// @return bytes32:hashCreationCode_.
    function addPortfolioSupport(string memory contractName_, address implementation_) external onlyOwner returns (address) {
        require(!isPortoflioSupported(contractName_), "addPortfolioSupport: Portfolio already supported");
        address beacon = address(new UpgradeableBeacon(implementation_));
        _portfoliosSupported[contractName_] = Portfolio(beacon, implementation_);
        emit portfolioSupportAdded(contractName_, beacon, implementation_);
        return beacon;
    }

    /// @notice Delete support of a Portfolio.
    /// @dev Delete support of a Portfolio and emits event 'portfolioSupportDeleted' if successful.
    /// @dev Requirements: onlyOwner.
    /// @param contractName_ Name of Portfolio Contract to be deleted.
    /// @return boolean - False if Portfolio hash not in the list of supported Portfolios.
    function delPortfolioSupport(string memory contractName_) external onlyOwner returns (bool) {
        if (isPortoflioSupported(contractName_)) {
            emit portfolioSupportDeleted(contractName_, _portfoliosSupported[contractName_].beacon, _portfoliosSupported[contractName_].implementation);
            delete _portfoliosSupported[contractName_];
            return true;
        }
        return false;
    }

    /// @notice Verify if Portfolio supported.
    /// @dev Verify if Portfolio supported by checking the name of Protfolio contract in the mapping '_portfoliosSupported'.
    /// @param contractName_ Name of Portfolio Contract to be verified.
    /// @return boolean - False if Portfolio not in the list of supported Portfolios.
    function isPortoflioSupported(string memory contractName_) public view returns (bool) {
        if (_portfoliosSupported[contractName_].beacon != address(0)) {
            return true;
        }
        return false;
    }

    /// @notice Verify if Portfolio supported.
    /// @dev Verify if Portfolio supported by checking the checking the name and implementation of Protfolio contract in the mapping '_portfoliosSupported'.
    /// @param contractName_ Name of Portfolio Contract to be verified.
    /// @return boolean - False if Portfolio Name and Implementation not in the list of supported Portfolios.
    function isPortoflioImplementationSupported(string memory contractName_, address implementation_) public view returns (bool) {
        if (_portfoliosSupported[contractName_].implementation == implementation_) {
            return true;
        }
        return false;
    }

    /// @notice Pause Registry Contract.
    /// @dev Pause 'createPortfolio', 'unregisterPortfolio' and 'getAllPortofliosRegistered'.
    /// @dev Requirements: whenNotPaused and onlyOwner.
    function pause() external virtual onlyOwner {
        _pause();
    }

    /// @notice Unpause Registry Contract.
    /// @dev Unpause 'createPortfolio', 'unregisterPortfolio' and 'getAllPortofliosRegistered'.
    /// @dev Requirements: whenPaused and onlyOwner.
    function unpause() external virtual onlyOwner {
        _unpause();
    }

    /// @dev Internal helper: compare two strings.
    function _equalStrings(string memory a, string memory b) internal pure returns( bool ) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

}
