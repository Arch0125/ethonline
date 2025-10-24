# FHE Multisig Vault Contract

This is a privacy-preserving multisig vault implementation using Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) for encrypted token operations with multi-signature security.

## Features

- **Encrypted Token Operations**: All token amounts are encrypted using FHE
- **Multi-Signature Security**: Requires multiple confirmations to execute transactions
- **Privacy-Preserving**: All operations maintain privacy of amounts and balances
- **Flexible Configuration**: Configurable number of owners and required confirmations
- **Emergency Recovery**: Emergency functions for token recovery
- **Event Logging**: Comprehensive event system for transaction tracking

## Contract Structure

### Core Functions

- `proposeTransaction(address to, address tokenContract, externalEuint32 amount, bytes calldata inputProof)`: Propose a new transaction
- `confirmTransaction(uint256 txId)`: Confirm a transaction
- `executeTransaction(uint256 txId)`: Execute a confirmed transaction
- `depositTokens(address tokenContract, externalEuint32 amount, bytes calldata inputProof)`: Deposit encrypted tokens
- `emergencyRecover(address tokenContract, address to, externalEuint32 amount, bytes calldata inputProof)`: Emergency token recovery

### View Functions

- `getVaultBalance(address tokenContract)`: Get encrypted vault balance
- `getTransaction(uint256 txId)`: Get transaction details
- `isConfirmed(uint256 txId, address owner)`: Check if transaction is confirmed by owner
- `getOwners()`: Get all owners
- `getOwnerCount()`: Get number of owners
- `getRequiredConfirmations()`: Get required confirmations
- `getTransactionCount()`: Get total transaction count

## Usage Examples

### Deploy the Contract

```bash
# Deploy to localhost
npx hardhat --network localhost deploy

# Deploy to Sepolia
npx hardhat --network sepolia deploy
```

### Interact with the Vault

```bash
# Check vault information
npx hardhat --network sepolia task:vault-info

# Check vault address
npx hardhat --network sepolia task:vault-address

# Check encrypted vault balance
npx hardhat --network sepolia task:vault-balance --token 0x...

# Deposit encrypted tokens
npx hardhat --network sepolia task:vault-deposit --token 0x... --amount 100

# Propose a transaction
npx hardhat --network sepolia task:vault-propose --to 0x... --token 0x... --amount 50

# Confirm a transaction
npx hardhat --network sepolia task:vault-confirm --txId 0

# Execute a transaction
npx hardhat --network sepolia task:vault-execute --txId 0

# Get transaction details
npx hardhat --network sepolia task:vault-transaction --txId 0

# Emergency recovery
npx hardhat --network sepolia task:vault-emergency --token 0x... --to 0x... --amount 25
```

## Workflow Example

### 1. Deposit Tokens
```bash
# First approve the vault to spend your tokens
npx hardhat --network sepolia task:erc20-approve --spender <VAULT_ADDRESS> --amount 200

# Then deposit tokens into the vault
npx hardhat --network sepolia task:vault-deposit --token <TOKEN_ADDRESS> --amount 200
```

### 2. Propose Transaction
```bash
# Propose to send 50 tokens to another address
npx hardhat --network sepolia task:vault-propose --to <RECIPIENT_ADDRESS> --token <TOKEN_ADDRESS> --amount 50
```

### 3. Confirm Transaction
```bash
# Second owner confirms the transaction
npx hardhat --network sepolia task:vault-confirm --txId 0
```

### 4. Execute Transaction
```bash
# Execute the transaction (requires enough confirmations)
npx hardhat --network sepolia task:vault-execute --txId 0
```

## Testing

### Run Local Tests

```bash
npx hardhat test test/FHEMultisigVault.ts
```

### Run Sepolia Tests

```bash
npx hardhat test test/FHEMultisigVaultSepolia.ts --network sepolia
```

## Security Features

### Multi-Signature Security
- **Configurable Owners**: Set any number of owners
- **Required Confirmations**: Set minimum confirmations needed
- **Owner Verification**: Only owners can propose, confirm, and execute
- **Double Confirmation Prevention**: Owners cannot confirm twice

### Privacy Features
- **Encrypted Amounts**: All token amounts are encrypted
- **Encrypted Balances**: Vault balances are encrypted
- **Privacy-Preserving**: No amounts visible on-chain
- **FHE Operations**: Uses FHE arithmetic for all calculations

### Access Control
- **Owner-Only Functions**: Critical functions restricted to owners
- **Transaction Validation**: Proper validation of all transactions
- **Emergency Recovery**: Emergency functions for critical situations

## Events

The contract emits the following events:
- `TransactionProposed(uint256 indexed txId, address indexed proposer, address to, address tokenContract)`
- `TransactionConfirmed(uint256 indexed txId, address indexed owner)`
- `TransactionExecuted(uint256 indexed txId)`
- `Deposit(address indexed tokenContract, address indexed depositor, uint256 amount)`
- `Withdrawal(address indexed tokenContract, address indexed to, uint256 amount)`

Note: The `amount` parameter in events is always 0 since amounts are encrypted and not visible.

## Configuration

### Default Configuration
- **Owners**: 3 owners (first 3 signers)
- **Required Confirmations**: 2 out of 3
- **Network Support**: Localhost, Sepolia, Mainnet

### Custom Configuration
You can modify the deployment script to:
- Change the number of owners
- Adjust required confirmations
- Set different owner addresses

## Limitations

- Requires FHEVM-compatible network
- Operations are more gas-intensive than standard multisig
- Requires relayer service for encrypted input proofs
- Limited to euint32 range for amounts
- Emergency recovery requires owner access

## Use Cases

### DeFi Protocols
- **Treasury Management**: Secure management of protocol funds
- **Token Vaults**: Encrypted token storage and distribution
- **Governance**: Privacy-preserving governance token operations

### Enterprise Applications
- **Corporate Treasuries**: Secure corporate fund management
- **Escrow Services**: Privacy-preserving escrow operations
- **Investment Funds**: Encrypted fund management

### Privacy Applications
- **Private Transactions**: Completely private token operations
- **Confidential DeFi**: Privacy-preserving DeFi operations
- **Anonymous Governance**: Private governance token operations

## Future Enhancements

- Support for larger integer types (euint64)
- Batch transaction operations
- Time-locked transactions
- Advanced governance features
- Integration with more DeFi protocols
- Cross-chain privacy features

## Dependencies

- `@fhevm/solidity`: FHE operations and types
- `@fhevm/hardhat-plugin`: Hardhat integration
- `@zama-fhe/relayer-sdk`: Relayer for encrypted operations
- `hardhat-deploy`: Deployment management

## Network Configuration

The contract is configured for:
- **Localhost**: For development and testing
- **Sepolia**: For testnet deployment
- **Mainnet**: Ready for production deployment

## Security Considerations

- All encrypted operations require proper input proofs
- The contract uses Zama's FHEVM for secure encrypted computations
- Multi-signature security prevents single points of failure
- Emergency recovery functions for critical situations
- Comprehensive event logging for audit trails
