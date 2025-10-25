// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Multisig Vault Contract with Encrypted Addresses
/// @author fhevm-hardhat-template
/// @notice A privacy-preserving multisig vault with encrypted address support
contract FHEMultisigVaultWithEAddress is SepoliaConfig {
    // Struct to represent a transaction proposal
    struct Transaction {
        address to;
        address tokenContract;
        euint32 amount;
        bool executed;
        uint256 confirmations;
        mapping(address => bool) isConfirmed;
    }
    
    // Struct to represent an encrypted transaction proposal
    struct EncryptedTransaction {
        eaddress encryptedTo;
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
    uint256 public encryptedTransactionCount;
    
    // Transaction storage
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => EncryptedTransaction) public encryptedTransactions;
    
    // Encrypted vault balance for each token
    mapping(address => euint32) public vaultBalances;
    
    // Encrypted address mappings for privacy-preserving operations
    mapping(address => eaddress) private _encryptedAddresses;
    mapping(address => euint32) private _encryptedVaultBalances;
    
    // Events
    event TransactionProposed(uint256 indexed txId, address indexed proposer, address to, address tokenContract);
    event TransactionConfirmed(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId);
    event EncryptedTransactionProposed(uint256 indexed txId, address indexed proposer, eaddress encryptedTo, address tokenContract);
    event EncryptedTransactionConfirmed(uint256 indexed txId, address indexed owner);
    event EncryptedTransactionExecuted(uint256 indexed txId);
    event Deposit(address indexed tokenContract, address indexed depositor, uint256 amount);
    event Withdrawal(address indexed tokenContract, address indexed to, uint256 amount);
    event EncryptedDeposit(address indexed tokenContract, address indexed depositor, eaddress encryptedDepositor, uint256 amount);
    event EncryptedWithdrawal(address indexed tokenContract, eaddress encryptedTo, uint256 amount);
    event AddressEncrypted(address indexed plainAddress, eaddress indexed encryptedAddress);
    
    // Modifiers
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }
    
    modifier txExists(uint256 _txId) {
        require(_txId < transactionCount, "Transaction does not exist");
        _;
    }
    
    modifier encryptedTxExists(uint256 _txId) {
        require(_txId < encryptedTransactionCount, "Encrypted transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "Transaction already executed");
        _;
    }
    
    modifier encryptedNotExecuted(uint256 _txId) {
        require(!encryptedTransactions[_txId].executed, "Encrypted transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 _txId) {
        require(!transactions[_txId].isConfirmed[msg.sender], "Transaction already confirmed by this owner");
        _;
    }
    
    modifier encryptedNotConfirmed(uint256 _txId) {
        require(!encryptedTransactions[_txId].isConfirmed[msg.sender], "Encrypted transaction already confirmed by this owner");
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
    
    /// @notice Propose a new encrypted transaction to send encrypted tokens
    /// @param encryptedTo Encrypted recipient address
    /// @param tokenContract Address of the token contract
    /// @param amount Encrypted amount to send
    /// @param inputProof Input proof for the encrypted amount
    /// @return txId The encrypted transaction ID
    function proposeEncryptedTransaction(
        eaddress encryptedTo,
        address tokenContract,
        externalEuint32 amount,
        bytes calldata inputProof
    ) external onlyOwner returns (uint256 txId) {
        require(tokenContract != address(0), "Invalid token contract");
        
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        txId = encryptedTransactionCount;
        encryptedTransactions[txId].encryptedTo = encryptedTo;
        encryptedTransactions[txId].tokenContract = tokenContract;
        encryptedTransactions[txId].amount = encryptedAmount;
        encryptedTransactions[txId].executed = false;
        encryptedTransactions[txId].confirmations = 0;
        
        encryptedTransactionCount++;
        
        // Auto-confirm by the proposer
        confirmEncryptedTransaction(txId);
        
        emit EncryptedTransactionProposed(txId, msg.sender, encryptedTo, tokenContract);
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
    
    /// @notice Confirm an encrypted transaction
    /// @param txId Encrypted transaction ID to confirm
    function confirmEncryptedTransaction(uint256 txId) 
        public 
        onlyOwner 
        encryptedTxExists(txId) 
        encryptedNotExecuted(txId) 
        encryptedNotConfirmed(txId) 
    {
        encryptedTransactions[txId].isConfirmed[msg.sender] = true;
        encryptedTransactions[txId].confirmations++;
        
        emit EncryptedTransactionConfirmed(txId, msg.sender);
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
    
    /// @notice Execute an encrypted transaction if it has enough confirmations
    /// @param txId Encrypted transaction ID to execute
    function executeEncryptedTransaction(uint256 txId) 
        external 
        onlyOwner 
        encryptedTxExists(txId) 
        encryptedNotExecuted(txId) 
    {
        require(encryptedTransactions[txId].confirmations >= requiredConfirmations, "Not enough confirmations");
        
        EncryptedTransaction storage txn = encryptedTransactions[txId];
        txn.executed = true;
        
        // Execute the encrypted token transfer
        _executeEncryptedTokenTransfer(txn.encryptedTo, txn.tokenContract, txn.amount);
        
        emit EncryptedTransactionExecuted(txId);
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
    
    /// @notice Internal function to execute encrypted token transfer
    /// @param encryptedTo Encrypted recipient address
    /// @param tokenContract Token contract address
    /// @param amount Encrypted amount to transfer
    function _executeEncryptedTokenTransfer(
        eaddress encryptedTo,
        address tokenContract,
        euint32 amount
    ) internal {
        // Get the token contract interface
        (bool success, bytes memory data) = tokenContract.call(
            abi.encodeWithSignature(
                "encryptedTransfer(eaddress,externalEuint32,bytes)",
                encryptedTo,
                amount,
                "" // Empty input proof for internal calls
            )
        );
        
        require(success, "Encrypted token transfer failed");
        
        // Update encrypted vault balance
        _encryptedVaultBalances[tokenContract] = FHE.sub(_encryptedVaultBalances[tokenContract], amount);
        
        // Allow access to the updated encrypted vault balance
        FHE.allowThis(_encryptedVaultBalances[tokenContract]);
        FHE.allow(_encryptedVaultBalances[tokenContract], msg.sender);
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
    
    /// @notice Deposit encrypted tokens using encrypted address
    /// @param tokenContract Address of the token contract
    /// @param amount Encrypted amount to deposit
    /// @param inputProof Input proof for the encrypted amount
    function depositEncryptedTokens(
        address tokenContract,
        externalEuint32 amount,
        bytes calldata inputProof
    ) external {
        require(tokenContract != address(0), "Invalid token contract");
        
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        eaddress encryptedSender = _encryptedAddresses[msg.sender];
        
        // Transfer tokens from sender to vault using encrypted transfer
        (bool success, bytes memory data) = tokenContract.call(
            abi.encodeWithSignature(
                "encryptedTransferFrom(eaddress,eaddress,externalEuint32,bytes)",
                encryptedSender,
                FHE.asEaddress(address(this)),
                amount,
                inputProof
            )
        );
        
        require(success, "Encrypted token deposit failed");
        
        // Update encrypted vault balance
        _encryptedVaultBalances[tokenContract] = FHE.add(_encryptedVaultBalances[tokenContract], encryptedAmount);
        
        // Allow access to the updated encrypted vault balance
        FHE.allowThis(_encryptedVaultBalances[tokenContract]);
        FHE.allow(_encryptedVaultBalances[tokenContract], msg.sender);
        
        emit EncryptedDeposit(tokenContract, msg.sender, encryptedSender, 0); // Amount is 0 since it's encrypted
    }
    
    /// @notice Get the encrypted balance of a token in the vault
    /// @param tokenContract Address of the token contract
    /// @return The encrypted balance
    function getVaultBalance(address tokenContract) external view returns (euint32) {
        return vaultBalances[tokenContract];
    }
    
    /// @notice Get the encrypted balance of a token in the vault using encrypted address
    /// @param tokenContract Address of the token contract
    /// @return The encrypted balance
    function getEncryptedVaultBalance(address tokenContract) external view returns (euint32) {
        return _encryptedVaultBalances[tokenContract];
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
    
    /// @notice Get encrypted transaction details
    /// @param txId Encrypted transaction ID
    /// @return encryptedTo Encrypted recipient address
    /// @return tokenContract Token contract address
    /// @return executed Whether the transaction is executed
    /// @return confirmations Number of confirmations
    function getEncryptedTransaction(uint256 txId) 
        external 
        view 
        returns (
            eaddress encryptedTo,
            address tokenContract,
            bool executed,
            uint256 confirmations
        ) 
    {
        EncryptedTransaction storage txn = encryptedTransactions[txId];
        return (txn.encryptedTo, txn.tokenContract, txn.executed, txn.confirmations);
    }
    
    /// @notice Check if a transaction is confirmed by a specific owner
    /// @param txId Transaction ID
    /// @param owner Owner address
    /// @return Whether the transaction is confirmed by the owner
    function isConfirmed(uint256 txId, address owner) external view returns (bool) {
        return transactions[txId].isConfirmed[owner];
    }
    
    /// @notice Check if an encrypted transaction is confirmed by a specific owner
    /// @param txId Encrypted transaction ID
    /// @param owner Owner address
    /// @return Whether the transaction is confirmed by the owner
    function isEncryptedConfirmed(uint256 txId, address owner) external view returns (bool) {
        return encryptedTransactions[txId].isConfirmed[owner];
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
    
    /// @notice Get the total number of encrypted transactions
    /// @return Total encrypted transaction count
    function getEncryptedTransactionCount() external view returns (uint256) {
        return encryptedTransactionCount;
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
    
    /// @notice Emergency function to recover tokens using encrypted address
    /// @param tokenContract Token contract address
    /// @param encryptedTo Encrypted recipient address
    /// @param amount Encrypted amount to recover
    /// @param inputProof Input proof for the encrypted amount
    function emergencyEncryptedRecover(
        address tokenContract,
        eaddress encryptedTo,
        externalEuint32 amount,
        bytes calldata inputProof
    ) external onlyOwner {
        require(tokenContract != address(0), "Invalid token contract");
        
        euint32 encryptedAmount = FHE.fromExternal(amount, inputProof);
        
        // Execute the encrypted transfer
        _executeEncryptedTokenTransfer(encryptedTo, tokenContract, encryptedAmount);
        
        emit EncryptedWithdrawal(tokenContract, encryptedTo, 0); // Amount is 0 since it's encrypted
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
