# FHE ERC20 Token Contract

This is an encrypted ERC20 token implementation using Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) for privacy-preserving token transfers and operations.

## Features

- **Encrypted Balances**: All token balances are stored in encrypted form using FHE
- **Encrypted Transfers**: Token transfers are performed on encrypted data
- **Encrypted Allowances**: Approval system works with encrypted amounts
- **Minting & Burning**: Encrypted minting and burning operations
- **Privacy-Preserving**: All operations maintain privacy of amounts and balances

## Contract Structure

### Core Functions

- `transfer(address to, externalEuint32 amount, bytes calldata inputProof)`: Transfer encrypted tokens
- `approve(address spender, externalEuint32 amount, bytes calldata inputProof)`: Approve encrypted allowance
- `transferFrom(address from, address to, externalEuint32 amount, bytes calldata inputProof)`: Transfer using allowance
- `mint(address to, externalEuint32 amount, bytes calldata inputProof)`: Mint new encrypted tokens
- `burn(address from, externalEuint32 amount, bytes calldata inputProof)`: Burn encrypted tokens

### View Functions

- `balanceOf(address account)`: Get encrypted balance
- `totalSupply()`: Get encrypted total supply
- `allowance(address owner, address spender)`: Get encrypted allowance

## Usage Examples

### Deploy the Contract

```bash
# Deploy to localhost
npx hardhat --network localhost deploy

# Deploy to Sepolia
npx hardhat --network sepolia deploy
```

### Interact with the Contract

```bash
# Check contract address
npx hardhat --network sepolia task:erc20-address

# Check your encrypted balance
npx hardhat --network sepolia task:erc20-balance

# Check total supply
npx hardhat --network sepolia task:erc20-total-supply

# Transfer tokens (encrypted)
npx hardhat --network sepolia task:erc20-transfer --to 0x... --amount 100

# Approve tokens (encrypted)
npx hardhat --network sepolia task:erc20-approve --spender 0x... --amount 50

# Check allowance (encrypted)
npx hardhat --network sepolia task:erc20-allowance --owner 0x... --spender 0x...

# Mint new tokens (encrypted)
npx hardhat --network sepolia task:erc20-mint --to 0x... --amount 200

# Burn tokens (encrypted)
npx hardhat --network sepolia task:erc20-burn --from 0x... --amount 25
```

## Testing

### Run Local Tests

```bash
npx hardhat test test/FHEERC20.ts
```

### Run Sepolia Tests

```bash
npx hardhat test test/FHEERC20Sepolia.ts --network sepolia
```

## Key Differences from Standard ERC20

1. **Encrypted Data**: All amounts are encrypted using FHE
2. **Input Proofs**: All operations require input proofs for encrypted values
3. **Privacy**: Balances and amounts are not visible on-chain
4. **FHE Operations**: Uses FHE arithmetic for all calculations

## Security Considerations

- All encrypted operations require proper input proofs
- The contract uses Zama's FHEVM for secure encrypted computations
- Balances and amounts are never exposed in plaintext
- All operations maintain cryptographic privacy

## Dependencies

- `@fhevm/solidity`: FHE operations and types
- `@fhevm/hardhat-plugin`: Hardhat integration
- `@zama-fhe/relayer-sdk`: Relayer for encrypted operations

## Network Configuration

The contract is configured for:
- **Localhost**: For development and testing
- **Sepolia**: For testnet deployment
- **Mainnet**: Ready for production deployment

## Events

The contract emits standard ERC20 events:
- `Transfer(address indexed from, address indexed to, uint256 value)`
- `Approval(address indexed owner, address indexed spender, uint256 value)`

Note: The `value` parameter in events is always 0 since amounts are encrypted and not visible.

## Limitations

- Requires FHEVM-compatible network
- Operations are more gas-intensive than standard ERC20
- Requires relayer service for encrypted input proofs
- Limited to euint32 range for amounts

## Future Enhancements

- Support for larger integer types (euint64)
- Batch operations for efficiency
- Advanced privacy features
- Integration with DeFi protocols
