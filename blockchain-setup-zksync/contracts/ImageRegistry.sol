// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ImageRegistry {
    // Immutable storage (gas optimized)
    uint256 private constant MAX_TITLE_LENGTH = 100;
    uint256 private constant MAX_DESC_LENGTH = 500;

    struct Image {
        bytes32 sha256Hash;
        bytes32 creatorHash;
        string ipfsHash;
        string title;
        string description;
        uint256 timestamp;
        bool isVerified;  // ← NEW: Auto-set to true at registration
    }

    // Gas-optimized storage (public mappings cheaper reads)
    mapping(bytes32 => Image) public images;  // ← Changed to public (saves gas)
    mapping(bytes32 => bool) public imageExists;

    // Events (indexed for efficient filtering)
    event ImageRegistered(
        bytes32 indexed sha256Hash,
        bytes32 indexed creatorHash,
        string ipfsHash,
        uint256 timestamp
    );
    event OwnershipProved(bytes32 indexed sha256Hash, uint256 timestamp);

    // Gas-optimized: Single storage write with auto-verification
    function registerImage(
        bytes32 _sha256Hash,
        bytes32 _creatorHash,
        string calldata _ipfsHash,
        string calldata _title,
        string calldata _description
    ) external {
        // Reentrancy-safe (no external calls before state change)
        require(!imageExists[_sha256Hash], "Image already registered");
        require(bytes(_title).length <= MAX_TITLE_LENGTH, "Title too long");
        require(bytes(_description).length <= MAX_DESC_LENGTH, "Desc too long");

        // Single storage write (gas optimized)
        images[_sha256Hash] = Image({
            sha256Hash: _sha256Hash,
            creatorHash: _creatorHash,
            ipfsHash: _ipfsHash,
            title: _title,
            description: _description,
            timestamp: block.timestamp,
            isVerified: true  // ← AUTO-VERIFIED at registration
        });

        imageExists[_sha256Hash] = true;
        emit ImageRegistered(_sha256Hash, _creatorHash, _ipfsHash, block.timestamp);
    }

    // Simplified (since auto-verified, this is for later re-verification)
    function setVerified(bytes32 _sha256Hash) external {
        require(imageExists[_sha256Hash], "Image not found");
        require(!images[_sha256Hash].isVerified, "Already verified");

        images[_sha256Hash].isVerified = true;
        emit OwnershipProved(_sha256Hash, block.timestamp);
    }

    // Gas-optimized view functions (no require if not found)
    function verifyImage(bytes32 _sha256Hash) external view returns (bool) {
        return imageExists[_sha256Hash];
    }

    function getImageStatus(bytes32 _sha256Hash) external view returns (
        bool exists,
        bool verified,
        uint256 verifiedTime
    ) {
        if (!imageExists[_sha256Hash]) return (false, false, 0);
        Image memory img = images[_sha256Hash];
        return (true, img.isVerified, img.timestamp);  // timestamp as verified time
    }

    // Gas-optimized: Pack return values
    function getImage(bytes32 _sha256Hash) external view returns (
        bytes32 sha256Hash,
        bytes32 creatorHash,
        string memory ipfsHash,
        string memory title,
        string memory description,
        uint256 timestamp,
        bool verified
    ) {
        if (!imageExists[_sha256Hash]) revert("Image not found");
        Image memory img = images[_sha256Hash];
        return (
            img.sha256Hash,
            img.creatorHash,
            img.ipfsHash,
            img.title,
            img.description,
            img.timestamp,
            img.isVerified
        );
    }
}
