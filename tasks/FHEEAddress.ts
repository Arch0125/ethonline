import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact with FHE Contracts with Encrypted Addresses (--network localhost)
 * ============================================================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the FHE contracts with encrypted address support
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the FHE contracts
 *
 *   npx hardhat --network localhost task:encrypt-address --address 0x...
 *   npx hardhat --network localhost task:erc20-encrypted-balance --token 0x... --encryptedAddress 0x...
 *   npx hardhat --network localhost task:erc20-encrypted-transfer --to 0x... --amount 100
 *   npx hardhat --network localhost task:vault-encrypted-deposit --token 0x... --amount 50
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the FHE contracts with encrypted address support
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the FHE contracts
 *
 *   npx hardhat --network sepolia task:encrypt-address --address 0x...
 *   npx hardhat --network sepolia task:erc20-encrypted-balance --token 0x... --encryptedAddress 0x...
 *   npx hardhat --network sepolia task:erc20-encrypted-transfer --to 0x... --amount 100
 *   npx hardhat --network sepolia task:vault-encrypted-deposit --token 0x... --amount 50
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:encrypt-address --address 0x...
 *   - npx hardhat --network sepolia task:encrypt-address --address 0x...
 */
task("task:encrypt-address", "Encrypts an address for privacy-preserving operations")
  .addParam("address", "The address to encrypt")
  .addOptionalParam("token", "The token contract address (for ERC20)")
  .addOptionalParam("vault", "The vault contract address (for MultisigVault)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();
    const addressToEncrypt = taskArguments.address;

    // Create encrypted address
    const encryptedAddress = await fhevm
      .createEncryptedInput(addressToEncrypt, signers[0].address)
      .add160(addressToEncrypt)
      .encrypt();

    console.log(`Encrypting address: ${addressToEncrypt}`);
    console.log(`Encrypted address handle: ${encryptedAddress.handles[0]}`);

    // If token contract is specified, encrypt the address in the token contract
    if (taskArguments.token) {
      const tokenContract = await ethers.getContractAt("FHEERC20WithEAddress", taskArguments.token);
      
      const tx = await tokenContract
        .connect(signers[0])
        .encryptAddress(addressToEncrypt, encryptedAddress.handles[0], encryptedAddress.inputProof);
      
      console.log(`Wait for tx:${tx.hash}...`);
      const receipt = await tx.wait();
      console.log(`tx:${tx.hash} status=${receipt?.status}`);
      console.log(`Address encrypted in token contract: ${taskArguments.token}`);
    }

    // If vault contract is specified, encrypt the address in the vault contract
    if (taskArguments.vault) {
      const vaultContract = await ethers.getContractAt("FHEMultisigVaultWithEAddress", taskArguments.vault);
      
      const tx = await vaultContract
        .connect(signers[0])
        .encryptAddress(addressToEncrypt, encryptedAddress.handles[0], encryptedAddress.inputProof);
      
      console.log(`Wait for tx:${tx.hash}...`);
      const receipt = await tx.wait();
      console.log(`tx:${tx.hash} status=${receipt?.status}`);
      console.log(`Address encrypted in vault contract: ${taskArguments.vault}`);
    }

    console.log(`Address ${addressToEncrypt} encrypted successfully!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-encrypted-balance --token 0x... --encryptedAddress 0x...
 *   - npx hardhat --network sepolia task:erc20-encrypted-balance --token 0x... --encryptedAddress 0x...
 */
task("task:erc20-encrypted-balance", "Gets the encrypted balance using encrypted address")
  .addParam("token", "The token contract address")
  .addParam("encryptedAddress", "The encrypted address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();

    const tokenContract = await ethers.getContractAt("FHEERC20WithEAddress", taskArguments.token);

    // Create encrypted address for query
    const encryptedAddress = await fhevm
      .createEncryptedInput(taskArguments.encryptedAddress, signers[0].address)
      .add160(taskArguments.encryptedAddress)
      .encrypt();

    const encryptedBalance = await tokenContract.encryptedBalanceOf(encryptedAddress.handles[0]);
    
    if (encryptedBalance === ethers.ZeroHash) {
      console.log(`encrypted balance: ${encryptedBalance}`);
      console.log("clear balance    : 0");
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedBalance,
      taskArguments.token,
      signers[0],
    );
    console.log(`Encrypted balance: ${encryptedBalance}`);
    console.log(`Clear balance    : ${clearBalance}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-encrypted-transfer --to 0x... --amount 100
 *   - npx hardhat --network sepolia task:erc20-encrypted-transfer --to 0x... --amount 100
 */
task("task:erc20-encrypted-transfer", "Transfers encrypted tokens using encrypted addresses")
  .addParam("token", "The token contract address")
  .addParam("to", "The recipient address")
  .addParam("amount", "The amount to transfer")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();

    const tokenContract = await ethers.getContractAt("FHEERC20WithEAddress", taskArguments.token);

    // Create encrypted recipient address
    const encryptedTo = await fhevm
      .createEncryptedInput(taskArguments.to, signers[0].address)
      .add160(taskArguments.to)
      .encrypt();

    // Encrypt the amount to transfer
    const encryptedAmount = await fhevm
      .createEncryptedInput(taskArguments.token, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await tokenContract
      .connect(signers[0])
      .encryptedTransfer(encryptedTo.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);
    
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEERC20 encrypted transfer(${amount} tokens to ${taskArguments.to}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-encrypted-approve --spender 0x... --amount 50
 *   - npx hardhat --network sepolia task:erc20-encrypted-approve --spender 0x... --amount 50
 */
task("task:erc20-encrypted-approve", "Approves encrypted allowance using encrypted addresses")
  .addParam("token", "The token contract address")
  .addParam("spender", "The spender address")
  .addParam("amount", "The allowance amount")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();

    const tokenContract = await ethers.getContractAt("FHEERC20WithEAddress", taskArguments.token);

    // Create encrypted spender address
    const encryptedSpender = await fhevm
      .createEncryptedInput(taskArguments.spender, signers[0].address)
      .add160(taskArguments.spender)
      .encrypt();

    // Encrypt the allowance amount
    const encryptedAmount = await fhevm
      .createEncryptedInput(taskArguments.token, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await tokenContract
      .connect(signers[0])
      .encryptedApprove(encryptedSpender.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);
    
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEERC20 encrypted approve(${amount} tokens for ${taskArguments.spender}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-encrypted-mint --to 0x... --amount 100
 *   - npx hardhat --network sepolia task:erc20-encrypted-mint --to 0x... --amount 100
 */
task("task:erc20-encrypted-mint", "Mints new encrypted tokens using encrypted address")
  .addParam("token", "The token contract address")
  .addParam("to", "The address to mint tokens to")
  .addParam("amount", "The amount to mint")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();

    const tokenContract = await ethers.getContractAt("FHEERC20WithEAddress", taskArguments.token);

    // Create encrypted recipient address
    const encryptedTo = await fhevm
      .createEncryptedInput(taskArguments.to, signers[0].address)
      .add160(taskArguments.to)
      .encrypt();

    // Encrypt the amount to mint
    const encryptedAmount = await fhevm
      .createEncryptedInput(taskArguments.token, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await tokenContract
      .connect(signers[0])
      .encryptedMint(encryptedTo.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);
    
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEERC20 encrypted mint(${amount} tokens to ${taskArguments.to}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-encrypted-deposit --token 0x... --amount 50
 *   - npx hardhat --network sepolia task:vault-encrypted-deposit --token 0x... --amount 50
 */
task("task:vault-encrypted-deposit", "Deposits encrypted tokens using encrypted addresses")
  .addParam("vault", "The vault contract address")
  .addParam("token", "The token contract address")
  .addParam("amount", "The amount to deposit")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();

    const vaultContract = await ethers.getContractAt("FHEMultisigVaultWithEAddress", taskArguments.vault);

    // First approve the vault to spend tokens
    const tokenContract = await ethers.getContractAt("FHEERC20WithEAddress", taskArguments.token);
    
    // Encrypt the amount to approve
    const encryptedAmount = await fhevm
      .createEncryptedInput(taskArguments.token, signers[0].address)
      .add32(amount)
      .encrypt();

    console.log("Approving tokens for vault...");
    const approveTx = await tokenContract
      .connect(signers[0])
      .approve(taskArguments.vault, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await approveTx.wait();

    // Now deposit tokens into the vault using encrypted deposit
    console.log("Depositing encrypted tokens into vault...");
    const depositTx = await vaultContract
      .connect(signers[0])
      .depositEncryptedTokens(taskArguments.token, encryptedAmount.handles[0], encryptedAmount.inputProof);
    
    console.log(`Wait for tx:${depositTx.hash}...`);
    const receipt = await depositTx.wait();
    console.log(`tx:${depositTx.hash} status=${receipt?.status}`);

    console.log(`FHEMultisigVault encrypted deposit(${amount} tokens) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-encrypted-propose --to 0x... --token 0x... --amount 25
 *   - npx hardhat --network sepolia task:vault-encrypted-propose --to 0x... --token 0x... --amount 25
 */
task("task:vault-encrypted-propose", "Proposes a new encrypted transaction")
  .addParam("vault", "The vault contract address")
  .addParam("to", "The recipient address")
  .addParam("token", "The token contract address")
  .addParam("amount", "The amount to send")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();

    const vaultContract = await ethers.getContractAt("FHEMultisigVaultWithEAddress", taskArguments.vault);

    // Create encrypted recipient address
    const encryptedTo = await fhevm
      .createEncryptedInput(taskArguments.to, signers[0].address)
      .add160(taskArguments.to)
      .encrypt();

    // Encrypt the amount to send
    const encryptedAmount = await fhevm
      .createEncryptedInput(taskArguments.vault, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await vaultContract
      .connect(signers[0])
      .proposeEncryptedTransaction(
        encryptedTo.handles[0],
        taskArguments.token,
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
    
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    // Get the transaction ID from the event
    const event = receipt?.logs.find(log => {
      try {
        const parsed = vaultContract.interface.parseLog(log);
        return parsed?.name === "EncryptedTransactionProposed";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = vaultContract.interface.parseLog(event);
      const txId = parsed?.args[0];
      console.log(`Encrypted transaction proposed with ID: ${txId}`);
    }

    console.log(`FHEMultisigVault encrypted propose transaction succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:address-equal --addr1 0x... --addr2 0x...
 *   - npx hardhat --network sepolia task:address-equal --addr1 0x... --addr2 0x...
 */
task("task:address-equal", "Checks if two encrypted addresses are equal")
  .addParam("contract", "The contract address")
  .addParam("addr1", "First encrypted address")
  .addParam("addr2", "Second encrypted address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();

    // Create encrypted addresses
    const encryptedAddr1 = await fhevm
      .createEncryptedInput(taskArguments.addr1, signers[0].address)
      .add160(taskArguments.addr1)
      .encrypt();

    const encryptedAddr2 = await fhevm
      .createEncryptedInput(taskArguments.addr2, signers[0].address)
      .add160(taskArguments.addr2)
      .encrypt();

    // Try to determine contract type and call appropriate function
    try {
      const contract = await ethers.getContractAt("FHEERC20WithEAddress", taskArguments.contract);
      const isEqual = await contract.encryptedAddressesEqual(encryptedAddr1.handles[0], encryptedAddr2.handles[0]);
      console.log(`Addresses are equal: ${isEqual}`);
    } catch {
      try {
        const contract = await ethers.getContractAt("FHEMultisigVaultWithEAddress", taskArguments.contract);
        const isEqual = await contract.encryptedAddressesEqual(encryptedAddr1.handles[0], encryptedAddr2.handles[0]);
        console.log(`Addresses are equal: ${isEqual}`);
      } catch (error) {
        console.error("Could not determine contract type or call function:", error);
      }
    }
  });
