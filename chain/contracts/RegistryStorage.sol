// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./RegistryUpgradeable.sol";

/// @title Abstract Storage of Registry Contract (UUPS Upgradeable)
/// @author D Collette
/// @dev Always add new state variables at the end. Don't remove or change the type of an existing states variables.
/// @dev See details here: https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#modifying-your-contracts

abstract contract RegistryStorage is RegistryUpgradeable {
    /// @dev Version of the Registry contract (for upgrades management) - stored in bytecode
    uint private constant _version = 1; 

    /// @dev Counter used as Salt for create2
    // CountersUpgradeable.Counter internal _nbDeployed;
  
    /// @dev Portfolios (contracts) registered (from creation or addition)
    address[] internal _portfoliosRegistered; 
    mapping(address => uint256) internal _portfoliosRegisteredIndex;

    /// @dev Supported Portfolio details
    struct Portfolio {
        address beacon;
        address implementation;
    }

    /// @dev Supported Portfolios
    mapping(string => Portfolio) internal _portfoliosSupported; 

    /// @notice Returns Version of Registry contract (implementation version).
    /// @dev Returns Version of Registry contract (implementation version).
    /// @return uint - version.
    function version() public pure returns (uint) {
        return _version;
    }
}
