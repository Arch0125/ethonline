import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact with FHE ERC20 (--network localhost)
 * ================================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the FHEERC20 contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the FHEERC20 contract
 *
 *   npx hardhat --network localhost task:erc20-balance
 *   npx hardhat --network localhost task:erc20-transfer --to 0x... --amount 100
 *   npx hardhat --network localhost task:erc20-approve --spender 0x... --amount 50
 *   npx hardhat --network localhost task:erc20-allowance --owner 0x... --spender 0x...
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the FHEERC20 contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the FHEERC20 contract
 *
 *   npx hardhat --network sepolia task:erc20-balance
 *   npx hardhat --network sepolia task:erc20-transfer --to 0x... --amount 100
 *   npx hardhat --network sepolia task:erc20-approve --spender 0x... --amount 50
 *   npx hardhat --network sepolia task:erc20-allowance --owner 0x... --spender 0x...
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-address
 *   - npx hardhat --network sepolia task:erc20-address
 */
task("task:erc20-address", "Prints the FHEERC20 address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const fheERC20 = await deployments.get("FHEERC20");

  console.log("FHEERC20 address is " + fheERC20.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-balance
 *   - npx hardhat --network sepolia task:erc20-balance
 */
task("task:erc20-balance", "Gets the encrypted balance of the caller")
  .addOptionalParam("address", "Optionally specify the FHEERC20 contract address")
  .addOptionalParam("account", "Optionally specify the account to check balance for")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const FHEERC20Deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEERC20");
    console.log(`FHEERC20: ${FHEERC20Deployment.address}`);

    const signers = await ethers.getSigners();
    const account = taskArguments.account ? taskArguments.account : signers[0].address;

    const fheERC20Contract = await ethers.getContractAt("FHEERC20", FHEERC20Deployment.address);

    const encryptedBalance = await fheERC20Contract.balanceOf(account);
    if (encryptedBalance === ethers.ZeroHash) {
      console.log(`encrypted balance: ${encryptedBalance}`);
      console.log("clear balance    : 0");
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedBalance,
      FHEERC20Deployment.address,
      signers[0],
    );
    console.log(`Encrypted balance: ${encryptedBalance}`);
    console.log(`Clear balance    : ${clearBalance}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-total-supply
 *   - npx hardhat --network sepolia task:erc20-total-supply
 */
task("task:erc20-total-supply", "Gets the encrypted total supply")
  .addOptionalParam("address", "Optionally specify the FHEERC20 contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const FHEERC20Deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEERC20");
    console.log(`FHEERC20: ${FHEERC20Deployment.address}`);

    const signers = await ethers.getSigners();

    const fheERC20Contract = await ethers.getContractAt("FHEERC20", FHEERC20Deployment.address);

    const encryptedTotalSupply = await fheERC20Contract.totalSupply();
    if (encryptedTotalSupply === ethers.ZeroHash) {
      console.log(`encrypted total supply: ${encryptedTotalSupply}`);
      console.log("clear total supply    : 0");
      return;
    }

    const clearTotalSupply = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedTotalSupply,
      FHEERC20Deployment.address,
      signers[0],
    );
    console.log(`Encrypted total supply: ${encryptedTotalSupply}`);
    console.log(`Clear total supply    : ${clearTotalSupply}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-transfer --to 0x... --amount 100
 *   - npx hardhat --network sepolia task:erc20-transfer --to 0x... --amount 100
 */
task("task:erc20-transfer", "Transfers encrypted tokens to another address")
  .addOptionalParam("address", "Optionally specify the FHEERC20 contract address")
  .addParam("to", "The recipient address")
  .addParam("amount", "The amount to transfer")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEERC20Deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEERC20");
    console.log(`FHEERC20: ${FHEERC20Deployment.address}`);

    const signers = await ethers.getSigners();

    const fheERC20Contract = await ethers.getContractAt("FHEERC20", FHEERC20Deployment.address);

    // Encrypt the amount to transfer
    const encryptedAmount = await fhevm
      .createEncryptedInput(FHEERC20Deployment.address, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await fheERC20Contract
      .connect(signers[0])
      .transfer(taskArguments.to, encryptedAmount.handles[0], encryptedAmount.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEERC20 transfer(${amount} tokens to ${taskArguments.to}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-approve --spender 0x... --amount 50
 *   - npx hardhat --network sepolia task:erc20-approve --spender 0x... --amount 50
 */
task("task:erc20-approve", "Approves encrypted allowance for a spender")
  .addOptionalParam("address", "Optionally specify the FHEERC20 contract address")
  .addParam("spender", "The spender address")
  .addParam("amount", "The allowance amount")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEERC20Deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEERC20");
    console.log(`FHEERC20: ${FHEERC20Deployment.address}`);

    const signers = await ethers.getSigners();

    const fheERC20Contract = await ethers.getContractAt("FHEERC20", FHEERC20Deployment.address);

    // Encrypt the allowance amount
    const encryptedAmount = await fhevm
      .createEncryptedInput(FHEERC20Deployment.address, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await fheERC20Contract
      .connect(signers[0])
      .approve(taskArguments.spender, encryptedAmount.handles[0], encryptedAmount.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEERC20 approve(${amount} tokens for ${taskArguments.spender}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-allowance --owner 0x... --spender 0x...
 *   - npx hardhat --network sepolia task:erc20-allowance --owner 0x... --spender 0x...
 */
task("task:erc20-allowance", "Gets the encrypted allowance between owner and spender")
  .addOptionalParam("address", "Optionally specify the FHEERC20 contract address")
  .addParam("owner", "The owner address")
  .addParam("spender", "The spender address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const FHEERC20Deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEERC20");
    console.log(`FHEERC20: ${FHEERC20Deployment.address}`);

    const signers = await ethers.getSigners();

    const fheERC20Contract = await ethers.getContractAt("FHEERC20", FHEERC20Deployment.address);

    const encryptedAllowance = await fheERC20Contract.allowance(taskArguments.owner, taskArguments.spender);
    if (encryptedAllowance === ethers.ZeroHash) {
      console.log(`encrypted allowance: ${encryptedAllowance}`);
      console.log("clear allowance    : 0");
      return;
    }

    const clearAllowance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedAllowance,
      FHEERC20Deployment.address,
      signers[0],
    );
    console.log(`Encrypted allowance: ${encryptedAllowance}`);
    console.log(`Clear allowance    : ${clearAllowance}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-mint --to 0x... --amount 100
 *   - npx hardhat --network sepolia task:erc20-mint --to 0x... --amount 100
 */
task("task:erc20-mint", "Mints new encrypted tokens to an address")
  .addOptionalParam("address", "Optionally specify the FHEERC20 contract address")
  .addParam("to", "The address to mint tokens to")
  .addParam("amount", "The amount to mint")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEERC20Deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEERC20");
    console.log(`FHEERC20: ${FHEERC20Deployment.address}`);

    const signers = await ethers.getSigners();

    const fheERC20Contract = await ethers.getContractAt("FHEERC20", FHEERC20Deployment.address);

    // Encrypt the amount to mint
    const encryptedAmount = await fhevm
      .createEncryptedInput(FHEERC20Deployment.address, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await fheERC20Contract
      .connect(signers[0])
      .mint(taskArguments.to, encryptedAmount.handles[0], encryptedAmount.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEERC20 mint(${amount} tokens to ${taskArguments.to}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:erc20-burn --from 0x... --amount 50
 *   - npx hardhat --network sepolia task:erc20-burn --from 0x... --amount 50
 */
task("task:erc20-burn", "Burns encrypted tokens from an address")
  .addOptionalParam("address", "Optionally specify the FHEERC20 contract address")
  .addParam("from", "The address to burn tokens from")
  .addParam("amount", "The amount to burn")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEERC20Deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEERC20");
    console.log(`FHEERC20: ${FHEERC20Deployment.address}`);

    const signers = await ethers.getSigners();

    const fheERC20Contract = await ethers.getContractAt("FHEERC20", FHEERC20Deployment.address);

    // Encrypt the amount to burn
    const encryptedAmount = await fhevm
      .createEncryptedInput(FHEERC20Deployment.address, signers[0].address)
      .add32(amount)
      .encrypt();

    const tx = await fheERC20Contract
      .connect(signers[0])
      .burn(taskArguments.from, encryptedAmount.handles[0], encryptedAmount.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`FHEERC20 burn(${amount} tokens from ${taskArguments.from}) succeeded!`);
  });
