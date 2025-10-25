# FHE Encrypted Address (EAddress) Implementation

This implementation extends the FHE ERC20 and Multisig Vault contracts with encrypted address functionality using Zama's FHEVM. Based on the [Zama documentation](https://docs.zama.ai/protocol/solidity-guides/smart-contract/types), `eaddress` is an alias for `Euint160` and supports operations like `eq`, `ne`, and `select`.

## Features

- **Encrypted Address Operations**: All address operations are encrypted using FHE
- **Privacy-Preserving Transfers**: Token transfers using encrypted addresses
- **Encrypted Approvals**: Allowance system with encrypted addresses
- **Address Comparison**: Equality and inequality checks on encrypted addresses
- **Multisig Support**: Encrypted address support in multisig vault operations
- **Event Logging**: Comprehensive event system for encrypted operations

## Supported Operations

Based on the Zama documentation, `eaddress` (Euint160) supports:
- **Equality**: `eq` - Check if two encrypted addresses are equal
- **Inequality**: `ne` - Check if two encrypted addresses are not equal
- **Selection**: `select` - Conditional selection based on encrypted addresses

## Contract Structure

### FHEERC20WithEAddress

#### Core Functions
- `encryptAddress(address plainAddress, externalEaddress encryptedAddress, bytes calldata inputProof)`: Encrypt an address
- `encryptedTransfer(eaddress encryptedTo, externalEuint32 amount, bytes calldata inputProof)`: Transfer using encrypted addresses
- `encryptedApprove(eaddress encryptedSpender, externalEuint32 amount, bytes calldata inputProof)`: Approve using encrypted addresses
- `encryptedTransferFrom(eaddress encryptedFrom, eaddress encryptedTo, externalEuint32 amount, bytes calldata inputProof)`: TransferFrom using encrypted addresses
- `encryptedMint(eaddress encryptedTo, externalEuint32 amount, bytes calldata inputProof)`: Mint using encrypted addresses
- `encryptedBurn(eaddress encryptedFrom, externalEuint32 amount, bytes calldata inputProof)`: Burn using encrypted addresses

#### View Functions
- `getEncryptedAddress(address plainAddress)`: Get encrypted address for a plain address
- `encryptedBalanceOf(eaddress encryptedAccount)`: Get encrypted balance using encrypted address
- `encryptedAllowance(eaddress encryptedOwner, eaddress encryptedSpender)`: Get encrypted allowance using encrypted addresses
- `encryptedAddressesEqual(eaddress encryptedAddr1, eaddress encryptedAddr2)`: Check if encrypted addresses are equal
- `encryptedAddressesNotEqual(eaddress encryptedAddr1, eaddress encryptedAddr2)`: Check if encrypted addresses are not equal

### FHEMultisigVaultWithEAddress

#### Core Functions
- `encryptAddress(address plainAddress, externalEaddress encryptedAddress, bytes calldata inputProof)`: Encrypt an address
- `proposeEncryptedTransaction(eaddress encryptedTo, address tokenContract, externalEuint32 amount, bytes calldata inputProof)`: Propose encrypted transaction
- `confirmEncryptedTransaction(uint256 txId)`: Confirm encrypted transaction
- `executeEncryptedTransaction(uint256 txId)`: Execute encrypted transaction
- `depositEncryptedTokens(address tokenContract, externalEuint32 amount, bytes calldata inputProof)`: Deposit using encrypted addresses
- `emergencyEncryptedRecover(address tokenContract, eaddress encryptedTo, externalEuint32 amount, bytes calldata inputProof)`: Emergency recovery using encrypted addresses

#### View Functions
- `getEncryptedAddress(address plainAddress)`: Get encrypted address for a plain address
- `getEncryptedVaultBalance(address tokenContract)`: Get encrypted vault balance
- `getEncryptedTransaction(uint256 txId)`: Get encrypted transaction details
- `isEncryptedConfirmed(uint256 txId, address owner)`: Check if encrypted transaction is confirmed
- `getEncryptedTransactionCount()`: Get total encrypted transaction count
- `encryptedAddressesEqual(eaddress encryptedAddr1, eaddress encryptedAddr2)`: Check if encrypted addresses are equal
- `encryptedAddressesNotEqual(eaddress encryptedAddr1, eaddress encryptedAddr2)`: Check if encrypted addresses are not equal

## Usage Examples

### Deploy the Contracts

```bash
# Deploy to localhost
npx hardhat --network localhost deploy

# Deploy to Sepolia
npx hardhat --network sepolia deploy
```

### Encrypt Addresses

```bash
# Encrypt an address in ERC20 contract
npx hardhat --network sepolia task:encrypt-address --address 0x... --token 0x...

# Encrypt an address in Vault contract
npx hardhat --network sepolia task:encrypt-address --address 0x... --vault 0x...
```

### ERC20 Operations with Encrypted Addresses

```bash
# Check encrypted balance using encrypted address
npx hardhat --network sepolia task:erc20-encrypted-balance --token 0x... --encryptedAddress 0x...

# Transfer using encrypted addresses
npx hardhat --network sepolia task:erc20-encrypted-transfer --token 0x... --to 0x... --amount 100

# Approve using encrypted addresses
npx hardhat --network sepolia task:erc20-encrypted-approve --token 0x... --spender 0x... --amount 50

# Mint using encrypted addresses
npx hardhat --network sepolia task:erc20-encrypted-mint --token 0x... --to 0x... --amount 200
```

### Vault Operations with Encrypted Addresses

```bash
# Deposit using encrypted addresses
npx hardhat --network sepolia task:vault-encrypted-deposit --vault 0x... --token 0x... --amount 100

# Propose encrypted transaction
npx hardhat --network sepolia task:vault-encrypted-propose --vault 0x... --to 0x... --token 0x... --amount 50
```

### Address Comparison

```bash
# Check if two encrypted addresses are equal
npx hardhat --network sepolia task:address-equal --contract 0x... --addr1 0x... --addr2 0x...
```

## Testing

### Run Local Tests

```bash
npx hardhat test test/FHEEAddress.ts
```

### Run Sepolia Tests

```bash
npx hardhat test test/FHEEAddress.ts --network sepolia
```

## Technical Implementation

### EAddress Type
- **Type**: `eaddress` (alias for `Euint160`)
- **Bit Length**: 160 bits
- **Supported Operations**: `eq`, `ne`, `select`
- **FHE Operations**: All operations maintain encryption

### Key Features
1. **Address Encryption**: Convert plain addresses to encrypted addresses
2. **Encrypted Operations**: All operations use encrypted addresses
3. **Privacy-Preserving**: No addresses visible on-chain
4. **Comparison Operations**: Equality and inequality checks
5. **Event System**: Comprehensive event logging

### Security Considerations
- All encrypted operations require proper input proofs
- Uses Zama's FHEVM for secure encrypted computations
- Addresses are never exposed in plaintext
- All operations maintain cryptographic privacy

## Events

### FHEERC20WithEAddress Events
- `AddressEncrypted(address indexed plainAddress, eaddress indexed encryptedAddress)`
- `EncryptedTransfer(eaddress indexed from, eaddress indexed to, uint256 value)`
- `EncryptedApproval(eaddress indexed owner, eaddress indexed spender, uint256 value)`

### FHEMultisigVaultWithEAddress Events
- `AddressEncrypted(address indexed plainAddress, eaddress indexed encryptedAddress)`
- `EncryptedTransactionProposed(uint256 indexed txId, address indexed proposer, eaddress encryptedTo, address tokenContract)`
- `EncryptedTransactionConfirmed(uint256 indexed txId, address indexed owner)`
- `EncryptedTransactionExecuted(uint256 indexed txId)`
- `EncryptedDeposit(address indexed tokenContract, address indexed depositor, eaddress encryptedDepositor, uint256 amount)`
- `EncryptedWithdrawal(address indexed tokenContract, eaddress encryptedTo, uint256 amount)`

Note: The `value` parameter in events is always 0 since amounts are encrypted and not visible.

## Use Cases

### Privacy-Preserving DeFi
- **Private Token Transfers**: Completely private token operations
- **Anonymous Governance**: Private governance token operations
- **Confidential Trading**: Private trading operations

### Enterprise Applications
- **Private Corporate Operations**: Confidential corporate transactions
- **Anonymous Escrow**: Privacy-preserving escrow services
- **Confidential Investment**: Private investment operations

### Advanced Privacy Features
- **Address Obfuscation**: Hide recipient addresses
- **Transaction Privacy**: Private transaction details
- **Balance Privacy**: Encrypted balance information

## Limitations

- Requires FHEVM-compatible network
- Operations are more gas-intensive than standard operations
- Requires relayer service for encrypted input proofs
- Limited to 160-bit addresses (standard Ethereum addresses)
- Comparison operations reveal equality/inequality results

## Future Enhancements

- Support for larger address types
- Advanced address operations
- Cross-chain encrypted addresses
- Integration with more DeFi protocols
- Enhanced privacy features

## Dependencies

- `@fhevm/solidity`: FHE operations and types
- `@fhevm/hardhat-plugin`: Hardhat integration
- `@zama-fhe/relayer-sdk`: Relayer for encrypted operations

## Network Configuration

The contracts are configured for:
- **Localhost**: For development and testing
- **Sepolia**: For testnet deployment
- **Mainnet**: Ready for production deployment

## References

- [Zama FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/smart-contract/types)
- [FHEVM Solidity Guide](https://docs.zama.ai/protocol/solidity-guides)
- [Zama Protocol](https://docs.zama.ai/protocol)
