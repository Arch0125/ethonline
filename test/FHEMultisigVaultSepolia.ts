import { expect } from "chai";
import { ethers } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { FhevmInstance } from "@fhevm/hardhat-plugin";

describe("FHEMultisigVault Sepolia", function () {
  let fhevm: FhevmInstance;
  let fheMultisigVault: any;
  let fheERC20: any;
  let owner1: any;
  let owner2: any;
  let owner3: any;
  let nonOwner: any;

  beforeEach(async function () {
    [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();
    fhevm = await (this as any).fhevm;

    // Deploy FHEERC20 first
    const FHEERC20 = await ethers.getContractFactory("FHEERC20");
    fheERC20 = await FHEERC20.deploy();
    await fheERC20.waitForDeployment();

    // Initialize FHEERC20 with 1000 tokens
    const initialSupply = 1000;
    const encryptedSupply = await fhevm
      .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
      .add32(initialSupply)
      .encrypt();

    await fheERC20.initialize(encryptedSupply.handles[0], encryptedSupply.inputProof);

    // Deploy FHEMultisigVault with 3 owners requiring 2 confirmations
    const owners = [owner1.address, owner2.address, owner3.address];
    const requiredConfirmations = 2;

    const FHEMultisigVault = await ethers.getContractFactory("FHEMultisigVault");
    fheMultisigVault = await FHEMultisigVault.deploy(owners, requiredConfirmations);
    await fheMultisigVault.waitForDeployment();
  });

  describe("Sepolia Network Deployment", function () {
    it("Should deploy successfully on Sepolia", async function () {
      const address = await fheMultisigVault.getAddress();
      expect(address).to.be.properAddress;
      console.log(`FHEMultisigVault deployed at: ${address}`);
    });

    it("Should have correct owners and configuration", async function () {
      const owners = await fheMultisigVault.getOwners();
      const ownerCount = await fheMultisigVault.getOwnerCount();
      const requiredConfirmations = await fheMultisigVault.getRequiredConfirmations();

      expect(owners).to.deep.equal([owner1.address, owner2.address, owner3.address]);
      expect(ownerCount).to.equal(3);
      expect(requiredConfirmations).to.equal(2);
    });
  });

  describe("Sepolia Network Operations", function () {
    it("Should perform encrypted token deposit on Sepolia", async function () {
      const depositAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      // First approve the vault to spend tokens
      const approveTx = await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);
      await approveTx.wait();

      // Then deposit tokens
      const depositTx = await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);
      
      const receipt = await depositTx.wait();
      expect(receipt?.status).to.equal(1);
      console.log(`Deposit transaction hash: ${depositTx.hash}`);

      // Check vault balance
      const encryptedVaultBalance = await fheMultisigVault.getVaultBalance(await fheERC20.getAddress());
      const clearVaultBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedVaultBalance,
        await fheMultisigVault.getAddress(),
        owner1
      );
      expect(clearVaultBalance).to.equal(100);
    });

    it("Should perform encrypted transaction proposal on Sepolia", async function () {
      // First deposit some tokens
      const depositAmount = 200;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      const approveTx = await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await approveTx.wait();

      const depositTx = await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await depositTx.wait();

      // Now propose a transaction
      const transferAmount = 50;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const proposeTx = await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );

      const receipt = await proposeTx.wait();
      expect(receipt?.status).to.equal(1);
      console.log(`Propose transaction hash: ${proposeTx.hash}`);

      // Check transaction count
      const transactionCount = await fheMultisigVault.getTransactionCount();
      expect(transactionCount).to.equal(1);
    });

    it("Should perform encrypted transaction confirmation on Sepolia", async function () {
      // First deposit tokens and propose transaction
      const depositAmount = 150;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      const approveTx = await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await approveTx.wait();

      const depositTx = await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await depositTx.wait();

      const transferAmount = 30;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const proposeTx = await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );
      await proposeTx.wait();

      // Now confirm the transaction
      const confirmTx = await fheMultisigVault.connect(owner2).confirmTransaction(0);
      const receipt = await confirmTx.wait();
      
      expect(receipt?.status).to.equal(1);
      console.log(`Confirm transaction hash: ${confirmTx.hash}`);

      // Check confirmation
      const isConfirmed = await fheMultisigVault.isConfirmed(0, owner2.address);
      expect(isConfirmed).to.be.true;

      const transaction = await fheMultisigVault.getTransaction(0);
      expect(transaction.confirmations).to.equal(2);
    });

    it("Should perform encrypted transaction execution on Sepolia", async function () {
      // First deposit tokens, propose and confirm transaction
      const depositAmount = 100;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      const approveTx = await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await approveTx.wait();

      const depositTx = await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await depositTx.wait();

      const transferAmount = 25;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const proposeTx = await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );
      await proposeTx.wait();

      const confirmTx = await fheMultisigVault.connect(owner2).confirmTransaction(0);
      await confirmTx.wait();

      // Now execute the transaction
      const executeTx = await fheMultisigVault.connect(owner1).executeTransaction(0);
      const receipt = await executeTx.wait();
      
      expect(receipt?.status).to.equal(1);
      console.log(`Execute transaction hash: ${executeTx.hash}`);

      const transaction = await fheMultisigVault.getTransaction(0);
      expect(transaction.executed).to.be.true;
    });

    it("Should perform emergency recovery on Sepolia", async function () {
      // First deposit tokens
      const depositAmount = 80;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      const approveTx = await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await approveTx.wait();

      const depositTx = await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await depositTx.wait();

      // Perform emergency recovery
      const recoveryAmount = 20;
      const encryptedRecoveryAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(recoveryAmount)
        .encrypt();

      const recoveryTx = await fheMultisigVault
        .connect(owner1)
        .emergencyRecover(
          await fheERC20.getAddress(),
          nonOwner.address,
          encryptedRecoveryAmount.handles[0],
          encryptedRecoveryAmount.inputProof
        );

      const receipt = await recoveryTx.wait();
      expect(receipt?.status).to.equal(1);
      console.log(`Emergency recovery transaction hash: ${recoveryTx.hash}`);

      // Check vault balance decreased
      const encryptedVaultBalance = await fheMultisigVault.getVaultBalance(await fheERC20.getAddress());
      const clearVaultBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedVaultBalance,
        await fheMultisigVault.getAddress(),
        owner1
      );
      expect(clearVaultBalance).to.equal(60);
    });
  });

  describe("Sepolia Network Integration", function () {
    it("Should handle complex multisig workflow on Sepolia", async function () {
      // Step 1: Deposit tokens
      const depositAmount = 300;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      const approveTx = await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await approveTx.wait();

      const depositTx = await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
      await depositTx.wait();

      // Step 2: Propose transaction
      const transferAmount = 100;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const proposeTx = await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );
      await proposeTx.wait();

      // Step 3: Confirm by second owner
      const confirmTx = await fheMultisigVault.connect(owner2).confirmTransaction(0);
      await confirmTx.wait();

      // Step 4: Execute transaction
      const executeTx = await fheMultisigVault.connect(owner1).executeTransaction(0);
      await executeTx.wait();

      // Verify execution
      const transaction = await fheMultisigVault.getTransaction(0);
      expect(transaction.executed).to.be.true;

      console.log("Complex multisig workflow completed successfully on Sepolia");
    });
  });
});
