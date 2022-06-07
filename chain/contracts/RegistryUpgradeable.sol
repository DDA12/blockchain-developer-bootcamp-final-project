// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/Create2Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/// @title Abstract Registry Upgradeable Contract based on UUPS proxy pattern
/// @author D Collette
/// @notice You can use this contract to create Registry UUPS proxiable contracts with Access control: Owner and Admin.
/// @dev Registry UUPS proxiable contracts with Access control: Owner and Admin.

abstract contract RegistryUpgradeable is Initializable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable {

    ///@dev Check that the execution is being performed by Admin role only
    modifier onlyAdmin() {
        require(_msgSender() == _getAdmin(), "Upgradeable: caller is not the admin");
        _;
    }

    constructor() {
    }

    ///@dev Must be called by derived contract to initialize contract (Initializer modifier from initialize function in derived contract)
    function __RegistryUpgradeable_init() internal onlyInitializing {
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        _changeAdmin(_msgSender()); // Default Admin is Owner of contract
    }

    /// @dev Function that will revert when `msg.sender` is not authorized to upgrade the contract: Admin only. Called by {upgradeTo} and {upgradeToAndCall}
    function _authorizeUpgrade(address) internal override onlyAdmin {}

    /// @dev Returns address of contract implementation: Implementation slot value (used by proxy to delegate calls).
    /// @return address - implementation address.
    function getImplementation() public view returns (address) {
        return _getImplementation();
    }

    /// @notice Get Admin role's account: authorized account to upgrade contract implementation
    /// @dev Returns Admin's address: authorized account to upgrade contract implementation.
    /// @return address - Admin's address.
    function getAdmin() public view returns (address) {
        return _getAdmin();
    }

    /// @notice Change Admin role's account: change authorized account to upgrade contract implementation
    /// @param newAdmin address of new Admin.
    /// @dev Change Admin's address: authorized account to upgrade contract implementation.
    /// @dev Requirements: onlyAdmin.
    function changeAdmin(address newAdmin) external onlyAdmin {
        _changeAdmin(newAdmin);
    }

}
