// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Multisig Vault Contract
/// @author fhevm-hardhat-template
/// @notice A privacy-preserving multisig vault that can receive and send encrypted tokens
contract FHEMultisigVault is SepoliaConfig {
    // Struct to represent a transaction proposal
    struct Transaction {
        address to;
        address tokenContract;
        euint32 amount;
        bool executed;
        uint256 confirmations;
        mapping(address => bool) isConfirmed;
    }
    
    // Vault configuration
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public requiredConfirmations;
    uint256 public transactionCount;
    
    // Transaction storage
    mapping(uint256 => Transaction) public transactions;
    
    // Encrypted vault balance for each token
    mapping(address => euint32) public vaultBalances;
    
    // Events
    event TransactionProposed(uint256 indexed txId, address indexed proposer, address to, address tokenContract);
    event TransactionConfirmed(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId);
    event Deposit(address indexed tokenContract, address indexed depositor, uint256 amount);
    event Withdrawal(address indexed tokenContract, address indexed to, uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }
    
    modifier txExists(uint256 _txId) {
        require(_txId < transactionCount, "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 _txId) {
        require(!transactions[_txId].isConfirmed[msg.sender], "Transaction already confirmed by this owner");
        _;
    }
    
    /// @notice Constructor to initialize the multisig vault
    /// @param _owners Array of owner addresses
    /// @param _requiredConfirmations Number of confirmations required to execute transactions
    constructor(address[] memory _owners, uint256 _requiredConfirmations) {
        require(_owners.length > 0, "Owners required");
        require(_requiredConfirmations > 0 && _requiredConfirmations <= _owners.length, "Invalid number of required confirmations");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        requiredConfirmations = _requiredConfirmations;
    }
    
    /// @notice Propose a new transaction to send encrypted tokens
    /// @param to Recipient address
    /// @param tokenContract Address of the token contract
    /// @param amount Encrypted amount to send
    /// @param inputProof Input proof for the encrypted amount
    /// @return txId The transaction ID
    function proposeTransaction(
        address to,
        address tokenContract,
        externalEuint32 amount,
        bytes calldata inputProof
    ) external onlyOwner returns (uint256 txId) {
        require(to != address(0), "Invalid recipient");
        require(tokenContract != address(0), "Invalid token contract");
        
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        txId = transactionCount;
        transactions[txId].to = to;
        transactions[txId].tokenContract = tokenContract;
        transactions[txId].amount = encryptedAmount;
        transactions[txId].executed = false;
        transactions[txId].confirmations = 0;
        
        transactionCount++;
        
        // Auto-confirm by the proposer
        confirmTransaction(txId);
        
        emit TransactionProposed(txId, msg.sender, to, tokenContract);
    }
    
    /// @notice Confirm a transaction
    /// @param txId Transaction ID to confirm
    function confirmTransaction(uint256 txId) 
        public 
        onlyOwner 
        txExists(txId) 
        notExecuted(txId) 
        notConfirmed(txId) 
    {
        transactions[txId].isConfirmed[msg.sender] = true;
        transactions[txId].confirmations++;
        
        emit TransactionConfirmed(txId, msg.sender);
    }
    
    /// @notice Execute a transaction if it has enough confirmations
    /// @param txId Transaction ID to execute
    function executeTransaction(uint256 txId) 
        external 
        onlyOwner 
        txExists(txId) 
        notExecuted(txId) 
    {
        require(transactions[txId].confirmations >= requiredConfirmations, "Not enough confirmations");
        
        Transaction storage txn = transactions[txId];
        txn.executed = true;
        
        // Execute the token transfer
        _executeTokenTransfer(txn.to, txn.tokenContract, txn.amount);
        
        emit TransactionExecuted(txId);
    }
    
    /// @notice Internal function to execute token transfer
    /// @param to Recipient address
    /// @param tokenContract Token contract address
    /// @param amount Encrypted amount to transfer
    function _executeTokenTransfer(
        address to,
        address tokenContract,
        euint32 amount
    ) internal {
        // Get the token contract interface
        (bool success, bytes memory data) = tokenContract.call(
            abi.encodeWithSignature(
                "transfer(address,externalEuint32,bytes)",
                to,
                amount,
                "" // Empty input proof for internal calls
            )
        );
        
        require(success, "Token transfer failed");
        
        // Update vault balance
        vaultBalances[tokenContract] = FHE.sub(vaultBalances[tokenContract], amount);
        
        // Allow access to the updated vault balance
        FHE.allowThis(vaultBalances[tokenContract]);
        FHE.allow(vaultBalances[tokenContract], msg.sender);
    }
    
    /// @notice Deposit encrypted tokens into the vault
    /// @param tokenContract Address of the token contract
    /// @param amount Encrypted amount to deposit
    /// @param inputProof Input proof for the encrypted amount
    function depositTokens(
        address tokenContract,
        externalEuint32 amount,
        bytes calldata inputProof
    ) external {
        require(tokenContract != address(0), "Invalid token contract");
        
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Transfer tokens from sender to vault
        (bool success, bytes memory data) = tokenContract.call(
            abi.encodeWithSignature(
                "transferFrom(address,address,externalEuint32,bytes)",
                msg.sender,
                address(this),
                amount,
                inputProof
            )
        );
        
        require(success, "Token deposit failed");
        
        // Update vault balance
        vaultBalances[tokenContract] = FHE.add(vaultBalances[tokenContract], encryptedAmount);
        
        // Allow access to the updated vault balance
        FHE.allowThis(vaultBalances[tokenContract]);
        FHE.allow(vaultBalances[tokenContract], msg.sender);
        
        emit Deposit(tokenContract, msg.sender, 0); // Amount is 0 since it's encrypted
    }
    
    /// @notice Get the encrypted balance of a token in the vault
    /// @param tokenContract Address of the token contract
    /// @return The encrypted balance
    function getVaultBalance(address tokenContract) external view returns (euint32) {
        return vaultBalances[tokenContract];
    }
    
    /// @notice Get transaction details
    /// @param txId Transaction ID
    /// @return to Recipient address
    /// @return tokenContract Token contract address
    /// @return executed Whether the transaction is executed
    /// @return confirmations Number of confirmations
    function getTransaction(uint256 txId) 
        external 
        view 
        returns (
            address to,
            address tokenContract,
            bool executed,
            uint256 confirmations
        ) 
    {
        Transaction storage txn = transactions[txId];
        return (txn.to, txn.tokenContract, txn.executed, txn.confirmations);
    }
    
    /// @notice Check if a transaction is confirmed by a specific owner
    /// @param txId Transaction ID
    /// @param owner Owner address
    /// @return Whether the transaction is confirmed by the owner
    function isConfirmed(uint256 txId, address owner) external view returns (bool) {
        return transactions[txId].isConfirmed[owner];
    }
    
    /// @notice Get all owners
    /// @return Array of owner addresses
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
    
    /// @notice Get the number of owners
    /// @return Number of owners
    function getOwnerCount() external view returns (uint256) {
        return owners.length;
    }
    
    /// @notice Get the required number of confirmations
    /// @return Required confirmations
    function getRequiredConfirmations() external view returns (uint256) {
        return requiredConfirmations;
    }
    
    /// @notice Get the total number of transactions
    /// @return Total transaction count
    function getTransactionCount() external view returns (uint256) {
        return transactionCount;
    }
    
    /// @notice Emergency function to recover tokens (requires all owners to confirm)
    /// @param tokenContract Token contract address
    /// @param to Recipient address
    /// @param amount Encrypted amount to recover
    /// @param inputProof Input proof for the encrypted amount
    function emergencyRecover(
        address tokenContract,
        address to,
        externalEuint32 amount,
        bytes calldata inputProof
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(tokenContract != address(0), "Invalid token contract");
        
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Execute the transfer
        _executeTokenTransfer(to, tokenContract, encryptedAmount);
        
        emit Withdrawal(tokenContract, to, 0); // Amount is 0 since it's encrypted
    }
}
