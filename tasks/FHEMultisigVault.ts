import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact with FHE Multisig Vault (--network localhost)
 * ===========================================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the FHEMultisigVault contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the FHEMultisigVault contract
 *
 *   npx hardhat --network localhost task:vault-info
 *   npx hardhat --network localhost task:vault-deposit --token 0x... --amount 100
 *   npx hardhat --network localhost task:vault-propose --to 0x... --token 0x... --amount 50
 *   npx hardhat --network localhost task:vault-confirm --txId 0
 *   npx hardhat --network localhost task:vault-execute --txId 0
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the FHEMultisigVault contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the FHEMultisigVault contract
 *
 *   npx hardhat --network sepolia task:vault-info
 *   npx hardhat --network sepolia task:vault-deposit --token 0x... --amount 100
 *   npx hardhat --network sepolia task:vault-propose --to 0x... --token 0x... --amount 50
 *   npx hardhat --network sepolia task:vault-confirm --txId 0
 *   npx hardhat --network sepolia task:vault-execute --txId 0
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-address
 *   - npx hardhat --network sepolia task:vault-address
 */
task("task:vault-address", "Prints the FHEMultisigVault address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const fheMultisigVault = await deployments.get("FHEMultisigVault");

  console.log("FHEMultisigVault address is " + fheMultisigVault.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-info
 *   - npx hardhat --network sepolia task:vault-info
 */
task("task:vault-info", "Gets vault information")
  .addOptionalParam("address", "Optionally specify the FHEMultisigVault contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const FHEMultisigVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEMultisigVault");
    console.log(`FHEMultisigVault: ${FHEMultisigVaultDeployment.address}`);

    const fheMultisigVaultContract = await ethers.getContractAt("FHEMultisigVault", FHEMultisigVaultDeployment.address);

    // Get vault information
    const owners = await fheMultisigVaultContract.getOwners();
    const ownerCount = await fheMultisigVaultContract.getOwnerCount();
    const requiredConfirmations = await fheMultisigVaultContract.getRequiredConfirmations();
    const transactionCount = await fheMultisigVaultContract.getTransactionCount();

    console.log("=== Vault Information ===");
    console.log(`Owners (${ownerCount}):`);
    owners.forEach((owner, index) => {
      console.log(`  ${index + 1}. ${owner}`);
    });
    console.log(`Required confirmations: ${requiredConfirmations}`);
    console.log(`Total transactions: ${transactionCount}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-balance --token 0x...
 *   - npx hardhat --network sepolia task:vault-balance --token 0x...
 */
task("task:vault-balance", "Gets the encrypted vault balance for a token")
  .addOptionalParam("address", "Optionally specify the FHEMultisigVault contract address")
  .addParam("token", "The token contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const FHEMultisigVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEMultisigVault");
    console.log(`FHEMultisigVault: ${FHEMultisigVaultDeployment.address}`);

    const signers = await ethers.getSigners();

    const fheMultisigVaultContract = await ethers.getContractAt("FHEMultisigVault", FHEMultisigVaultDeployment.address);

    const encryptedBalance = await fheMultisigVaultContract.getVaultBalance(taskArguments.token);
    if (encryptedBalance === ethers.ZeroHash) {
      console.log(`encrypted vault balance: ${encryptedBalance}`);
      console.log("clear vault balance    : 0");
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedBalance,
      FHEMultisigVaultDeployment.address,
      signers[0],
    );
    console.log(`Encrypted vault balance: ${encryptedBalance}`);
    console.log(`Clear vault balance    : ${clearBalance}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-deposit --token 0x... --amount 100
 *   - npx hardhat --network sepolia task:vault-deposit --token 0x... --amount 100
 */
task("task:vault-deposit", "Deposits encrypted tokens into the vault")
  .addOptionalParam("address", "Optionally specify the FHEMultisigVault contract address")
  .addParam("token", "The token contract address")
  .addParam("amount", "The amount to deposit")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEMultisigVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEMultisigVault");
    console.log(`FHEMultisigVault: ${FHEMultisigVaultDeployment.address}`);

    const signers = await ethers.getSigners();

    const fheMultisigVaultContract = await ethers.getContractAt("FHEMultisigVault", FHEMultisigVaultDeployment.address);

    // First approve the vault to spend tokens
    const tokenContract = await ethers.getContractAt("FHEERC20", taskArguments.token);
    
    // Encrypt the amount to approve
    const encryptedAmount = await fhevm
      .createEncryptedInput(taskArguments.token, signers[0].address)
      .add32(amount)
      .encrypt();

    console.log("Approving tokens for vault...");
    const approveTx = await tokenContract
      .connect(signers[0])
      .approve(FHEMultisigVaultDeployment.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
    await approveTx.wait();

    // Now deposit tokens into the vault
    console.log("Depositing tokens into vault...");
    const depositTx = await fheMultisigVaultContract
      .connect(signers[0])
      .depositTokens(taskArguments.token, encryptedAmount.handles[0], encryptedAmount.inputProof);
    console.log(`Wait for tx:${depositTx.hash}...`);

    const receipt = await depositTx.wait();
    console.log(`tx:${depositTx.hash} status=${receipt?.status}`);

    console.log(`FHEMultisigVault deposit(${amount} tokens) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-propose --to 0x... --token 0x... --amount 50
 *   - npx hardhat --network sepolia task:vault-propose --to 0x... --token 0x... --amount 50
 */
task("task:vault-propose", "Proposes a new transaction to send encrypted tokens")
  .addOptionalParam("address", "Optionally specify the FHEMultisigVault contract address")
  .addParam("to", "The recipient address")
  .addParam("token", "The token contract address")
  .addParam("amount", "The amount to send")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEMultisigVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEMultisigVault");
    console.log(`FHEMultisigVault: ${FHEMultisigVaultDeployment.address}`);

    const signers = await ethers.getSigners();

    const fheMultisigVaultContract = await ethers.getContractAt("FHEMultisigVault", FHEMultisigVaultDeployment.address);

    // Encrypt the amount to send
    const encryptedAmount = await fhevm
      .createEncryptedInput(FHEMultisigVaultDeployment.address, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await fheMultisigVaultContract
      .connect(signers[0])
      .proposeTransaction(
        taskArguments.to,
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
        const parsed = fheMultisigVaultContract.interface.parseLog(log);
        return parsed?.name === "TransactionProposed";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = fheMultisigVaultContract.interface.parseLog(event);
      const txId = parsed?.args[0];
      console.log(`Transaction proposed with ID: ${txId}`);
    }

    console.log(`FHEMultisigVault propose transaction succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-confirm --txId 0
 *   - npx hardhat --network sepolia task:vault-confirm --txId 0
 */
task("task:vault-confirm", "Confirms a transaction")
  .addOptionalParam("address", "Optionally specify the FHEMultisigVault contract address")
  .addParam("txId", "The transaction ID to confirm")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const txId = parseInt(taskArguments.txId);
    if (!Number.isInteger(txId)) {
      throw new Error(`Argument --txId is not an integer`);
    }

    const FHEMultisigVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEMultisigVault");
    console.log(`FHEMultisigVault: ${FHEMultisigVaultDeployment.address}`);

    const signers = await ethers.getSigners();

    const fheMultisigVaultContract = await ethers.getContractAt("FHEMultisigVault", FHEMultisigVaultDeployment.address);

    const tx = await fheMultisigVaultContract
      .connect(signers[0])
      .confirmTransaction(txId);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEMultisigVault confirm transaction ${txId} succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-execute --txId 0
 *   - npx hardhat --network sepolia task:vault-execute --txId 0
 */
task("task:vault-execute", "Executes a transaction")
  .addOptionalParam("address", "Optionally specify the FHEMultisigVault contract address")
  .addParam("txId", "The transaction ID to execute")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const txId = parseInt(taskArguments.txId);
    if (!Number.isInteger(txId)) {
      throw new Error(`Argument --txId is not an integer`);
    }

    const FHEMultisigVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEMultisigVault");
    console.log(`FHEMultisigVault: ${FHEMultisigVaultDeployment.address}`);

    const signers = await ethers.getSigners();

    const fheMultisigVaultContract = await ethers.getContractAt("FHEMultisigVault", FHEMultisigVaultDeployment.address);

    const tx = await fheMultisigVaultContract
      .connect(signers[0])
      .executeTransaction(txId);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEMultisigVault execute transaction ${txId} succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-transaction --txId 0
 *   - npx hardhat --network sepolia task:vault-transaction --txId 0
 */
task("task:vault-transaction", "Gets transaction details")
  .addOptionalParam("address", "Optionally specify the FHEMultisigVault contract address")
  .addParam("txId", "The transaction ID to get details for")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const txId = parseInt(taskArguments.txId);
    if (!Number.isInteger(txId)) {
      throw new Error(`Argument --txId is not an integer`);
    }

    const FHEMultisigVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEMultisigVault");
    console.log(`FHEMultisigVault: ${FHEMultisigVaultDeployment.address}`);

    const fheMultisigVaultContract = await ethers.getContractAt("FHEMultisigVault", FHEMultisigVaultDeployment.address);

    const transaction = await fheMultisigVaultContract.getTransaction(txId);
    
    console.log("=== Transaction Details ===");
    console.log(`Transaction ID: ${txId}`);
    console.log(`To: ${transaction.to}`);
    console.log(`Token Contract: ${transaction.tokenContract}`);
    console.log(`Executed: ${transaction.executed}`);
    console.log(`Confirmations: ${transaction.confirmations}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:vault-emergency --token 0x... --to 0x... --amount 25
 *   - npx hardhat --network sepolia task:vault-emergency --token 0x... --to 0x... --amount 25
 */
task("task:vault-emergency", "Emergency recovery of tokens")
  .addOptionalParam("address", "Optionally specify the FHEMultisigVault contract address")
  .addParam("token", "The token contract address")
  .addParam("to", "The recipient address")
  .addParam("amount", "The amount to recover")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEMultisigVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEMultisigVault");
    console.log(`FHEMultisigVault: ${FHEMultisigVaultDeployment.address}`);

    const signers = await ethers.getSigners();

    const fheMultisigVaultContract = await ethers.getContractAt("FHEMultisigVault", FHEMultisigVaultDeployment.address);

    // Encrypt the amount to recover
    const encryptedAmount = await fhevm
      .createEncryptedInput(FHEMultisigVaultDeployment.address, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await fheMultisigVaultContract
      .connect(signers[0])
      .emergencyRecover(
        taskArguments.token,
        taskArguments.to,
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEMultisigVault emergency recovery succeeded!`);
  });
