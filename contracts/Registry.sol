// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title Registry Contract for Portfolios of NFTs
/// @author D Collette
/// @notice You can use this contract to manage standardize Portfolios (Create/Locate portfolio contracts: Factory and Registry patterns) compliant with Verifiable credentials: Certificate of Authenticity, Certificate of Ownership, etc. )
/// @dev Need to expand the Portfolio interface (and abstract contract) and move it out in a seperate file. Verify Interface/Methods of abstract contract implemented for each Portfolio supported.

interface IPortfolio {
    function transferOwnership(address newOwner) external;
    function owner() external view returns (address);
}

contract Registry is Ownable, Pausable {
    using Counters for Counters.Counter;

    /// @dev Counter used as Salt for create2
    Counters.Counter private _nbDeployed;
  
    /// @dev Portfolios (contracts) registered (from creation or addition)
    address[] private _portfoliosRegistered; 
    mapping(address => uint256) private _portfoliosRegisteredIndex;

    /// @dev CodeHash of supported Portfolios (contracts)
    mapping(bytes32 => string) private _portfoliosSupported; 

    /// @notice Emitted when a Portfolio contract is created.
    /// @dev Emitted when a Portfolio (contract) is deployed with createPortfolio method and create2.
    event portfolioDeployed(string contractName, bytes32 indexed hashCreationCode, address indexed portfolioAddress, bytes32 salt, address indexed owner);

    /// @notice Emitted when a Portfolio contract is registered.
    /// @dev Emitted when a Portfolio (contract address) is added to the Portfolios Registered array.
    event portfolioRegistered(string contractName, bytes32 indexed hashCreationCode, address indexed portfolioAddress, address indexed owner);

    /// @notice Emitted when a Portfolio contract is unregistered.
    /// @dev Emitted when a Portfolio (contract address) is removed from the Portfolios Registered array.
    event portfolioUnregistered(address indexed portfolioAddress, address indexed owner);

    /// @notice Emitted when a Portfolio Support is added.
    /// @dev Emitted when a Portfolio (bytecode hash) is added to the map of Portfolios Supported.
    event portfolioSupportAdded(string contractName, bytes32 indexed hashCreationCode);

    /// @notice Emitted when a Portfolio Support is deleted.
    /// @dev Emitted when a Portfolio (bytecode hash) is deleted from the map of Portfolios Supported.
    event portfolioSupportDeleted(string contractName, bytes32 indexed hashCreationCode);

    constructor() {
    }

    /// @notice Create a Portfolio with information provided.
    /// @dev Create a Portfolio using the provided byte code (create2) and regiter it (Factory and Registry patterns). 
    /// @dev Requirements: whenNotPaused and portfolio byte code is supported.
    /// @param portfolioByteCode_ creation byte code of Portfolio contract to be created. Hash of byte code must be supported by Registry.
    /// @param owner_ address of owner of portfolio - Transfer ownership of Portfolio created to owner_.
    /// @param name_ Name of Portfolio.
    /// @param symbol_ Symbol of Portfolio.
    /// @param portoflioURI_ URI of Portfolio (Current Client implementation: IPFS CID of image file).
    /// @return address of created/deployed Portfolio Contract.
    function createPortfolio(bytes calldata portfolioByteCode_, address owner_, string memory name_, string memory symbol_, string memory portoflioURI_)
     external whenNotPaused returns (address) {
         bytes32 hashCreationCode = keccak256(portfolioByteCode_);
         require(!_equalStrings(_portfoliosSupported[hashCreationCode], ''), "Registry: createPorfolio => Portfolio (byteCode) not supported");
        _nbDeployed.increment();
        bytes memory byteCreationCode = abi.encodePacked(portfolioByteCode_, abi.encode(name_, symbol_,  portoflioURI_));
        bytes32 salt = bytes32(_nbDeployed.current());
        address addressDeployed = Create2.deploy(0, salt, byteCreationCode);
        _portfoliosRegistered.push(addressDeployed);
        _portfoliosRegisteredIndex[addressDeployed] = _portfoliosRegistered.length;
        IPortfolio(addressDeployed).transferOwnership(owner_);
        emit portfolioDeployed(_portfoliosSupported[hashCreationCode], hashCreationCode, addressDeployed, salt, owner_);
        emit portfolioRegistered(_portfoliosSupported[hashCreationCode], hashCreationCode, addressDeployed, owner_);
        return addressDeployed;
    }

    /// @notice Verify if Portfolio registered.
    /// @dev Verify if Portfolio registred by checking the '_portfoliosRegisteredIndex'.
    /// @param portfolioAddress address of Portfolio to be verified.
    /// @return boolean - False if Portfolio not registered.
    function isPortoflioRegistered(address portfolioAddress) external view returns (bool) {
        uint256 idx = _portfoliosRegisteredIndex[portfolioAddress];
        if ( idx == uint256(0x0)) {
            return false;
        }
        return true;
    }

    /// @notice Unregister a Portfolio.
    /// @dev Unregister a Portfolio at address specified.
    /// @dev Requirements: whenNotPaused and called by owner of Portfolio or Registry only.
    /// @param portfolioAddress address of Portfolio to be unregistered.
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

    /// @notice Get addresses of registered Portfolios.
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

    /// @notice Add support of a Portfolio.
    /// @dev Add support of a Portfolio. 
    /// @dev Requirements: onlyOwner.
    /// @param contractName_ Name of Portfolio Contract.
    /// @param hashCreationCode_ creation byte code Hash of Portfolio contract to be added.
    /// @return bytes32:hashCreationCode_.
    function addPortfolioSupport(string calldata contractName_, bytes32 hashCreationCode_) external onlyOwner returns (bytes32) {
        _portfoliosSupported[hashCreationCode_] = contractName_;
        emit portfolioSupportAdded(contractName_, hashCreationCode_);
        return hashCreationCode_;
    }

    /// @notice Delete support of a Portfolio.
    /// @dev Delete support of a Portfolio and emits event 'portfolioSupportDeleted' if successful.
    /// @dev Requirements: onlyOwner.
    /// @param contractName_ Name of Portfolio Contract to be deleted.
    /// @param hashCreationCode_ creation byte code Hash of Portfolio contract to be deleted.
    /// @return boolean - False if Portfolio hash not in the list of supported Portfolios.
    function delPortfolioSupport(string calldata contractName_, bytes32 hashCreationCode_) external onlyOwner returns (bool) {
        if (isPortoflioSupported(contractName_, hashCreationCode_)) {
            delete _portfoliosSupported[hashCreationCode_];
            emit portfolioSupportDeleted(contractName_, hashCreationCode_);
            return true;
        }
        return false;
    }

    /// @notice Verify if Portfolio supported.
    /// @dev Verify if Portfolio supported by checking the hash and name of creationCode in the mapping '_portfoliosSupported'.
    /// @param contractName_ Name of Portfolio Contract to be verified.
    /// @param hashCreationCode_ creation byte code Hash of Portfolio contract to be verified.
    /// @return boolean - False if Portfolio hash not in the list of supported Portfolios.
    function isPortoflioSupported(string memory contractName_, bytes32 hashCreationCode_) public view returns (bool) {
        if (_equalStrings(_portfoliosSupported[hashCreationCode_], contractName_)) {
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