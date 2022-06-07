// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./ERC721EnumerableUpgradeable2.sol";

/// @title Abstract Storage of Portfolio Contract (Baacon Upgradeable Proxy pattern)
/// @author D Collette
/// @dev Always add new state variables at the end. Don't remove or change the type of an existing states variables.
/// @dev See details here: https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#modifying-your-contracts

contract vcNFTStorage is Initializable, OwnableUpgradeable, PausableUpgradeable, ERC721EnumerableUpgradeable  {
  using CountersUpgradeable for CountersUpgradeable.Counter;

  /// @dev Counter used to count the number of 'tokenId' minted.  
  CountersUpgradeable.Counter internal _tokenIds;
  
  /// @dev Counter used to count the number of 'tokenId' minted.  
  string internal _portfolioURI;

  /// @dev Structure to store the Verifiable credentials of one NFT: Certificate Of Authenticity and Certificate Of Ownership.  
  struct VerifiableCredentials {
    // string issuerDid; // DID of Author/Artist can be extracted from COA.
    // string subjectDid; // NFT is subject and holder at the same time - DID of NFT: can be extracted from COA.
    string coaURI; //Current implementation: IPFS-CID of Certificate Of Authenticity (Verifiable Credentials in JSON format).
    string cooURI; ///Current implementation : IPFS-CID of Certificate Of Onwership  (Verifiable Credential).
  }

  /// @dev Verifiabl Credentials for NFTs: mapping between a TokenID (location) and its asscoiated VerifiableCredentials.
  mapping(uint256 => VerifiableCredentials) internal _vcs; // Verifiabl Credentials of NFTs.

}
