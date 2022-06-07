// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./vcNFTStorage.sol";

/// @title Portoflio of Verifiable NFTs Contract.
/// @author D Collette.
/// @notice You can use this contract to create/mint and store Verifiable NFTs: Certificate of Authenticity, Certificate of Ownership, etc. A tokenId is a location (space) in the contract (portfolio).
/// @dev Need to support Certificate Of Ownership (ownership information in COO - JSON Web Token stored on IPFS like the COA). 
/// @dev Support of COO will make the NFT transferable to another portfolio/Chain (unchained NFT: burned from origin and created at destination): can be moved to another compatible portfolios/wallets.

contract vcNFT is vcNFTStorage  {
  using CountersUpgradeable for CountersUpgradeable.Counter;

  /// @notice Emitted when a Certificate Of Authority is set.
  /// @dev Emitted when a Certificate Of Authority is set for a tokenId (location).
  event CoaURISet(uint256 indexed tokenId, string coaURI);

  /// @notice Emitted when PortfolioURI is set.
  /// @dev Emitted when PortfolioURI is set.
  event PortfolioURISet(string portfolioURI);

  constructor() {}

  /// @dev Called after creation of contract dues to the requirements of a proxy-based upgradeability pattern: delegateCalls using proxy storage  - no contructor can be used
  function initialize(string memory name_, string memory symbol_, string memory portfolioURI_) public initializer {
    __Pausable_init();
    __Ownable_init();
    __ERC721_init(name_, symbol_);
    _portfolioURI = portfolioURI_;
    emit PortfolioURISet(portfolioURI_);
  }

    /// @notice Get Portfolio information.
    /// @dev Get Portfolio info: owner, name, symbol, portfolio URI, total supply. 
    /// @return array with information: address:owner, string:name, string:symbol , string:portfolioURI, uint256:totalSupply
    function portfolioInfo() external view returns (address, string memory, string memory, string memory, uint256) {
      return (owner(), name(), symbol(), getPortfolioURI(), totalSupply());
    }

    /// @notice Get Portfolio URI.
    /// @dev Get Portfolio URI.
    /// @return string:portfolioURI.
    function getPortfolioURI() public view returns (string memory) {
      return _portfolioURI;
    }

    /// @notice Set Portfolio URI.
    /// @dev Set Portfolio URI and emits an event 'PortfolioURISet'.
    /// @dev Requirements: whenNotPaused and onlyOwner
    /// @param portfolioURI_ URI of the portfolio - current implementation IPFS-CID of image.
    function setPortfolioURI(string calldata portfolioURI_) external whenNotPaused onlyOwner {
      _portfolioURI = portfolioURI_;
      emit PortfolioURISet(portfolioURI_);
    }

    /// @notice Get all TokenIds in use.
    /// @dev Get all TokenIds with an NFT: verifiable credentials COA and COO.
    /// @return uint256[]:tokenIds.
    function getAllTokenIds() external view returns (uint256[] memory) {
      return allTokens();
    }

    /// @notice See {vcNFT-getCoaURI}.
    /// @dev See {vcNFT-getCoaURI}.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
      return getCoaURI(tokenId);
    }

    /// @notice Get COA URI for a tokenId.
    /// @dev Get COA URI for a tokenId if tokenId exists. Current implementation of COA URI is IPFS-CID of COA
    /// @dev Requirements: TokenId must exist.
    /// @param tokenId location.
    /// @return string:COA URI
    function getCoaURI(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "VcNFT: getCoaURI => nonexistent token");
        string memory _coaURI = _vcs[tokenId].coaURI;
        return _coaURI;
    }

    /// @notice Get COA URI for a tokenId.
    /// @dev Get COA URI for a tokenId if tokenId exists and emits an event 'CoaURISet'. Current implementation of COA URI is IPFS-CID of COA.
    /// @dev Requirements: whenNotPaused and onlyOwner. 'tokenId' must exist.
    /// @param tokenId location.
    /// @param _coaURI URI of COA - Current implementation is IPFS-CID of COA.
    function setCoaURI(uint256 tokenId, string memory _coaURI) public whenNotPaused onlyOwner  {
        require(_exists(tokenId), "vcNFT: setCoaURI => nonexistent token");
        _vcs[tokenId].coaURI = _coaURI;
        emit CoaURISet(tokenId, _coaURI);
    }

    /// @notice Mint an NFT.
    /// @dev Mint an NFT. Current implementation does not have the Certificate of Ownership. Should become MOVE an NFT to toa new location in the portfolio.
    /// @dev Still using the owner concept of ERC721. Should be replaced by COO JSON Web Token signed (Verifiable Credential).
    /// @dev Requirements: whenNotPaused and onlyOwner.
    /// @param recipient address of owner - current implementation it is an ethereum address. Should be a DID.
    /// @param _coaURI URI of COA - Current implementation is IPFS-CID of COA.
    /// @return uint256:new tokenId (new location where NFT is stored).
    function mint(address recipient, string memory _coaURI) external onlyOwner returns (uint256)
    {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(recipient, newTokenId);
        setCoaURI(newTokenId, _coaURI);
        return newTokenId;
    }

    /// @notice Destroy an NFT.
    /// @dev Destroys 'tokenId'. Emits an event 'trasnfer'. Current implementation is still burning an NFT. Should become moving out an NFT (move an nft from one location to another one).
    /// @dev Still using the owner concept of ERC721. Should be replaced by COO JSON Web Token signed (Verifiable Credential).
    /// @dev Requirements: whenNotPaused and onlyOwner. 'tokenId' must exist.
    /// @param tokenId Location of NFT to be burned.
    function burn(uint256 tokenId) external onlyOwner {
      require(_exists(tokenId), "VcNFT: burn => nonexistent token");
      ERC721Upgradeable._burn(tokenId);
      if (bytes(_vcs[tokenId].coaURI).length != 0) {
          delete _vcs[tokenId];
      }
    }
    
    /// @dev Internal helper: compare two strings.
    function _equalStrings(string memory a, string memory b) internal pure returns( bool ) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    /// @notice Pause vcNFT Contract.
    /// @dev Pause all token transfers (mint - burn), setPortfolioURI and setCoaURI.
    /// @dev Requirements: whenNotPaused and onlyOwner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause vcNFT Contract.
    /// @dev Unpause all token transfers (mint - burn), setPortfolioURI and setCoaURI.
    /// @dev Requirements: whenPaused and onlyOwner.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev See {ERC721-_beforeTokenTransfer}. Internal.
    /// @dev Requirements: The contract must not be paused.
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
        require(!paused(), "VcNFTPausable: _beforeTokenTransfer => token transfer while paused");
        super._beforeTokenTransfer(from, to, tokenId);
    }

}