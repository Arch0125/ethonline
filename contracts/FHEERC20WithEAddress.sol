// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE ERC20 Token Contract with Encrypted Addresses
/// @author fhevm-hardhat-template
/// @notice An encrypted ERC20 token implementation using FHEVM with encrypted address support
contract FHEERC20WithEAddress is SepoliaConfig {
    // Token metadata
    string public constant name = "FHE Privacy Token with EAddress";
    string public constant symbol = "FHE-EA";
    uint8 public constant decimals = 18;
    
    // Total supply (encrypted)
    euint32 private _totalSupply;
    
    // Mapping from address to encrypted balance
    mapping(address => euint32) private _balances;
    
    // Mapping from address to encrypted allowance
    mapping(address => mapping(address => euint32)) private _allowances;
    
    // Encrypted address mappings for privacy-preserving operations
    mapping(address => eaddress) private _encryptedAddresses;
    mapping(eaddress => euint32) private _encryptedBalances;
    mapping(eaddress => mapping(eaddress => euint32)) private _encryptedAllowances;
    
    // Events (these are public and not encrypted)
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event EncryptedTransfer(eaddress indexed from, eaddress indexed to, uint256 value);
    event EncryptedApproval(eaddress indexed owner, eaddress indexed spender, uint256 value);
    event AddressEncrypted(address indexed plainAddress, eaddress indexed encryptedAddress);
    
    /// @notice Constructor - no parameters needed
    constructor() {
        // Initialize with zero supply - will be set via initialize function
        _totalSupply = FHE.asEuint32(0);
    }
    
    /// @notice Initialize the contract with initial supply
    /// @param initialSupply The initial encrypted supply amount
    /// @param inputProof The input proof for the encrypted value
    function initialize(externalEuint32 initialSupply, bytes calldata inputProof) external {
        euint32 encryptedSupply = FHE.fromExternal(initialSupply, inputProof);
        _totalSupply = encryptedSupply;
        _balances[msg.sender] = encryptedSupply;
        
        // Allow the contract to access the total supply and sender's balance
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_totalSupply, msg.sender);
        FHE.allow(_balances[msg.sender], msg.sender);
    }
    
    /// @notice Encrypt an address for privacy-preserving operations
    /// @param plainAddress The plaintext address to encrypt
    /// @param encryptedAddress The encrypted address
    /// @param inputProof The input proof for the encrypted address
    function encryptAddress(
        address plainAddress,
        externalEaddress encryptedAddress,
        bytes calldata inputProof
    ) external {
        eaddress encryptedAddr = FHE.fromExternal(encryptedAddress, inputProof);
        _encryptedAddresses[plainAddress] = encryptedAddr;
        
        // Allow access to the encrypted address
        FHE.allowThis(encryptedAddr);
        FHE.allow(encryptedAddr, msg.sender);
        
        emit AddressEncrypted(plainAddress, encryptedAddr);
    }
    
    /// @notice Get the encrypted address for a plain address
    /// @param plainAddress The plaintext address
    /// @return The encrypted address
    function getEncryptedAddress(address plainAddress) external view returns (eaddress) {
        return _encryptedAddresses[plainAddress];
    }
    
    /// @notice Returns the encrypted total supply
    /// @return The encrypted total supply
    function totalSupply() external view returns (euint32) {
        return _totalSupply;
    }
    
    /// @notice Returns the encrypted balance of an account
    /// @param account The account to query
    /// @return The encrypted balance of the account
    function balanceOf(address account) external view returns (euint32) {
        return _balances[account];
    }
    
    /// @notice Returns the encrypted balance using encrypted address
    /// @param encryptedAccount The encrypted account address
    /// @return The encrypted balance
    function encryptedBalanceOf(eaddress encryptedAccount) external view returns (euint32) {
        return _encryptedBalances[encryptedAccount];
    }
    
    /// @notice Returns the encrypted allowance
    /// @param owner The owner of the tokens
    /// @param spender The spender address
    /// @return The encrypted allowance amount
    function allowance(address owner, address spender) external view returns (euint32) {
        return _allowances[owner][spender];
    }
    
    /// @notice Returns the encrypted allowance using encrypted addresses
    /// @param encryptedOwner The encrypted owner address
    /// @param encryptedSpender The encrypted spender address
    /// @return The encrypted allowance amount
    function encryptedAllowance(eaddress encryptedOwner, eaddress encryptedSpender) external view returns (euint32) {
        return _encryptedAllowances[encryptedOwner][encryptedSpender];
    }
    
    /// @notice Transfers encrypted tokens from sender to recipient
    /// @param to The recipient address
    /// @param amount The encrypted amount to transfer
    /// @param inputProof The input proof for the encrypted amount
    function transfer(address to, externalEuint32 amount, bytes calldata inputProof) external returns (bool) {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Update balances
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], encryptedAmount);
        _balances[to] = FHE.add(_balances[to], encryptedAmount);
        
        // Allow access to the updated balances
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[to], to);
        
        emit Transfer(msg.sender, to, 0); // Value is 0 since it's encrypted
        
        return true;
    }
    
    /// @notice Transfers encrypted tokens using encrypted addresses
    /// @param encryptedTo The encrypted recipient address
    /// @param amount The encrypted amount to transfer
    /// @param inputProof The input proof for the encrypted amount
    function encryptedTransfer(eaddress encryptedTo, externalEuint32 amount, bytes calldata inputProof) external returns (bool) {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Get sender's encrypted address
        eaddress encryptedSender = _encryptedAddresses[msg.sender];
        
        // Update encrypted balances
        _encryptedBalances[encryptedSender] = FHE.sub(_encryptedBalances[encryptedSender], encryptedAmount);
        _encryptedBalances[encryptedTo] = FHE.add(_encryptedBalances[encryptedTo], encryptedAmount);
        
        // Allow access to the updated balances
        FHE.allowThis(_encryptedBalances[encryptedSender]);
        FHE.allowThis(_encryptedBalances[encryptedTo]);
        FHE.allow(_encryptedBalances[encryptedSender], msg.sender);
        FHE.allow(_encryptedBalances[encryptedTo], msg.sender);
        
        emit EncryptedTransfer(encryptedSender, encryptedTo, 0); // Value is 0 since it's encrypted
        
        return true;
    }
    
    /// @notice Approves an encrypted allowance for a spender
    /// @param spender The spender address
    /// @param amount The encrypted allowance amount
    /// @param inputProof The input proof for the encrypted amount
    function approve(address spender, externalEuint32 amount, bytes calldata inputProof) external returns (bool) {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        _allowances[msg.sender][spender] = encryptedAmount;
        
        // Allow access to the allowance
        FHE.allowThis(_allowances[msg.sender][spender]);
        FHE.allow(_allowances[msg.sender][spender], msg.sender);
        FHE.allow(_allowances[msg.sender][spender], spender);
        
        emit Approval(msg.sender, spender, 0); // Value is 0 since it's encrypted
        
        return true;
    }
    
    /// @notice Approves an encrypted allowance using encrypted addresses
    /// @param encryptedSpender The encrypted spender address
    /// @param amount The encrypted allowance amount
    /// @param inputProof The input proof for the encrypted amount
    function encryptedApprove(eaddress encryptedSpender, externalEuint32 amount, bytes calldata inputProof) external returns (bool) {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        eaddress encryptedSender = _encryptedAddresses[msg.sender];
        _encryptedAllowances[encryptedSender][encryptedSpender] = encryptedAmount;
        
        // Allow access to the allowance
        FHE.allowThis(_encryptedAllowances[encryptedSender][encryptedSpender]);
        FHE.allow(_encryptedAllowances[encryptedSender][encryptedSpender], msg.sender);
        FHE.allow(_encryptedAllowances[encryptedSender][encryptedSpender], msg.sender);
        
        emit EncryptedApproval(encryptedSender, encryptedSpender, 0); // Value is 0 since it's encrypted
        
        return true;
    }
    
    /// @notice Transfers encrypted tokens using allowance
    /// @param from The sender address
    /// @param to The recipient address
    /// @param amount The encrypted amount to transfer
    /// @param inputProof The input proof for the encrypted amount
    function transferFrom(address from, address to, externalEuint32 amount, bytes calldata inputProof) external returns (bool) {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Update allowance (subtract the transferred amount)
        _allowances[from][msg.sender] = FHE.sub(_allowances[from][msg.sender], encryptedAmount);
        
        // Update balances
        _balances[from] = FHE.sub(_balances[from], encryptedAmount);
        _balances[to] = FHE.add(_balances[to], encryptedAmount);
        
        // Allow access to the updated values
        FHE.allowThis(_allowances[from][msg.sender]);
        FHE.allowThis(_balances[from]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_allowances[from][msg.sender], from);
        FHE.allow(_allowances[from][msg.sender], msg.sender);
        FHE.allow(_balances[from], from);
        FHE.allow(_balances[to], to);
        
        emit Transfer(from, to, 0); // Value is 0 since it's encrypted
        
        return true;
    }
    
    /// @notice Transfers encrypted tokens using encrypted addresses and allowance
    /// @param encryptedFrom The encrypted sender address
    /// @param encryptedTo The encrypted recipient address
    /// @param amount The encrypted amount to transfer
    /// @param inputProof The input proof for the encrypted amount
    function encryptedTransferFrom(eaddress encryptedFrom, eaddress encryptedTo, externalEuint32 amount, bytes calldata inputProof) external returns (bool) {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        eaddress encryptedSender = _encryptedAddresses[msg.sender];
        
        // Update allowance (subtract the transferred amount)
        _encryptedAllowances[encryptedFrom][encryptedSender] = FHE.sub(_encryptedAllowances[encryptedFrom][encryptedSender], encryptedAmount);
        
        // Update balances
        _encryptedBalances[encryptedFrom] = FHE.sub(_encryptedBalances[encryptedFrom], encryptedAmount);
        _encryptedBalances[encryptedTo] = FHE.add(_encryptedBalances[encryptedTo], encryptedAmount);
        
        // Allow access to the updated values
        FHE.allowThis(_encryptedAllowances[encryptedFrom][encryptedSender]);
        FHE.allowThis(_encryptedBalances[encryptedFrom]);
        FHE.allowThis(_encryptedBalances[encryptedTo]);
        FHE.allow(_encryptedAllowances[encryptedFrom][encryptedSender], msg.sender);
        FHE.allow(_encryptedBalances[encryptedFrom], msg.sender);
        FHE.allow(_encryptedBalances[encryptedTo], msg.sender);
        
        emit EncryptedTransfer(encryptedFrom, encryptedTo, 0); // Value is 0 since it's encrypted
        
        return true;
    }
    
    /// @notice Mints new encrypted tokens to a specified address
    /// @param to The address to mint tokens to
    /// @param amount The encrypted amount to mint
    /// @param inputProof The input proof for the encrypted amount
    function mint(address to, externalEuint32 amount, bytes calldata inputProof) external {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Increase total supply
        _totalSupply = FHE.add(_totalSupply, encryptedAmount);
        
        // Increase recipient's balance
        _balances[to] = FHE.add(_balances[to], encryptedAmount);
        
        // Allow access to the updated values
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_balances[to]);
        FHE.allow(_totalSupply, msg.sender);
        FHE.allow(_balances[to], to);
        
        emit Transfer(address(0), to, 0); // Value is 0 since it's encrypted
    }
    
    /// @notice Mints new encrypted tokens using encrypted address
    /// @param encryptedTo The encrypted address to mint tokens to
    /// @param amount The encrypted amount to mint
    /// @param inputProof The input proof for the encrypted amount
    function encryptedMint(eaddress encryptedTo, externalEuint32 amount, bytes calldata inputProof) external {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Increase total supply
        _totalSupply = FHE.add(_totalSupply, encryptedAmount);
        
        // Increase recipient's encrypted balance
        _encryptedBalances[encryptedTo] = FHE.add(_encryptedBalances[encryptedTo], encryptedAmount);
        
        // Allow access to the updated values
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_encryptedBalances[encryptedTo]);
        FHE.allow(_totalSupply, msg.sender);
        FHE.allow(_encryptedBalances[encryptedTo], msg.sender);
        
        emit EncryptedTransfer(FHE.asEaddress(address(0)), encryptedTo, 0); // Value is 0 since it's encrypted
    }
    
    /// @notice Burns encrypted tokens from a specified address
    /// @param from The address to burn tokens from
    /// @param amount The encrypted amount to burn
    /// @param inputProof The input proof for the encrypted amount
    function burn(address from, externalEuint32 amount, bytes calldata inputProof) external {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Decrease total supply
        _totalSupply = FHE.sub(_totalSupply, encryptedAmount);
        
        // Decrease sender's balance
        _balances[from] = FHE.sub(_balances[from], encryptedAmount);
        
        // Allow access to the updated values
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_balances[from]);
        FHE.allow(_totalSupply, msg.sender);
        FHE.allow(_balances[from], from);
        
        emit Transfer(from, address(0), 0); // Value is 0 since it's encrypted
    }
    
    /// @notice Burns encrypted tokens using encrypted address
    /// @param encryptedFrom The encrypted address to burn tokens from
    /// @param amount The encrypted amount to burn
    /// @param inputProof The input proof for the encrypted amount
    function encryptedBurn(eaddress encryptedFrom, externalEuint32 amount, bytes calldata inputProof) external {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Decrease total supply
        _totalSupply = FHE.sub(_totalSupply, encryptedAmount);
        
        // Decrease sender's encrypted balance
        _encryptedBalances[encryptedFrom] = FHE.sub(_encryptedBalances[encryptedFrom], encryptedAmount);
        
        // Allow access to the updated values
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_encryptedBalances[encryptedFrom]);
        FHE.allow(_totalSupply, msg.sender);
        FHE.allow(_encryptedBalances[encryptedFrom], msg.sender);
        
        emit EncryptedTransfer(encryptedFrom, FHE.asEaddress(address(0)), 0); // Value is 0 since it's encrypted
    }
    
    /// @notice Check if two encrypted addresses are equal
    /// @param encryptedAddr1 First encrypted address
    /// @param encryptedAddr2 Second encrypted address
    /// @return True if addresses are equal
    function encryptedAddressesEqual(eaddress encryptedAddr1, eaddress encryptedAddr2) external view returns (bool) {
        // Note: This function returns the encrypted comparison result
        // The actual decryption should be done off-chain or through other means
        return true; // Placeholder - actual implementation would require different approach
    }
    
    /// @notice Check if two encrypted addresses are not equal
    /// @param encryptedAddr1 First encrypted address
    /// @param encryptedAddr2 Second encrypted address
    /// @return True if addresses are not equal
    function encryptedAddressesNotEqual(eaddress encryptedAddr1, eaddress encryptedAddr2) external view returns (bool) {
        // Note: This function returns the encrypted comparison result
        // The actual decryption should be done off-chain or through other means
        return true; // Placeholder - actual implementation would require different approach
    }
}
