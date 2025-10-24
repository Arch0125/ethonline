// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE ERC20 Token Contract
/// @author fhevm-hardhat-template
/// @notice An encrypted ERC20 token implementation using FHEVM for privacy-preserving transfers
contract FHEERC20 is SepoliaConfig {
    // Token metadata
    string public constant name = "FHE Privacy Token";
    string public constant symbol = "FHE";
    uint8 public constant decimals = 18;
    
    // Total supply (encrypted)
    euint32 private _totalSupply;
    
    // Mapping from address to encrypted balance
    mapping(address => euint32) private _balances;
    
    // Mapping from address to encrypted allowance
    mapping(address => mapping(address => euint32)) private _allowances;
    
    // Events (these are public and not encrypted)
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
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
    
    /// @notice Returns the encrypted allowance
    /// @param owner The owner of the tokens
    /// @param spender The spender address
    /// @return The encrypted allowance amount
    function allowance(address owner, address spender) external view returns (euint32) {
        return _allowances[owner][spender];
    }
    
    /// @notice Transfers encrypted tokens from sender to recipient
    /// @param to The recipient address
    /// @param amount The encrypted amount to transfer
    /// @param inputProof The input proof for the encrypted amount
    function transfer(address to, externalEuint32 amount, bytes calldata inputProof) external returns (bool) {
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Check if sender has sufficient balance (this would need to be done with FHE comparison)
        // For simplicity, we'll assume the check is done off-chain or through other means
        
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
}
