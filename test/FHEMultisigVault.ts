import { expect } from "chai";
import { ethers } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { FhevmInstance } from "@fhevm/hardhat-plugin";

describe("FHEMultisigVault", function () {
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

  describe("Deployment", function () {
    it("Should set the correct owners", async function () {
      const owners = await fheMultisigVault.getOwners();
      expect(owners).to.deep.equal([owner1.address, owner2.address, owner3.address]);
    });

    it("Should set the correct required confirmations", async function () {
      const requiredConfirmations = await fheMultisigVault.getRequiredConfirmations();
      expect(requiredConfirmations).to.equal(2);
    });

    it("Should set the correct owner count", async function () {
      const ownerCount = await fheMultisigVault.getOwnerCount();
      expect(ownerCount).to.equal(3);
    });

    it("Should identify owners correctly", async function () {
      expect(await fheMultisigVault.isOwner(owner1.address)).to.be.true;
      expect(await fheMultisigVault.isOwner(owner2.address)).to.be.true;
      expect(await fheMultisigVault.isOwner(owner3.address)).to.be.true;
      expect(await fheMultisigVault.isOwner(nonOwner.address)).to.be.false;
    });
  });

  describe("Token Deposits", function () {
    it("Should allow owners to deposit tokens", async function () {
      const depositAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      // First approve the vault to spend tokens
      await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Then deposit tokens
      await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

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

    it("Should allow non-owners to deposit tokens", async function () {
      const depositAmount = 50;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), nonOwner.address)
        .add32(depositAmount)
        .encrypt();

      // First approve the vault to spend tokens
      await fheERC20
        .connect(nonOwner)
        .approve(await fheMultisigVault.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Then deposit tokens
      await fheMultisigVault
        .connect(nonOwner)
        .depositTokens(await fheERC20.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check vault balance
      const encryptedVaultBalance = await fheMultisigVault.getVaultBalance(await fheERC20.getAddress());
      const clearVaultBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedVaultBalance,
        await fheMultisigVault.getAddress(),
        owner1
      );
      expect(clearVaultBalance).to.equal(50);
    });
  });

  describe("Transaction Proposals", function () {
    beforeEach(async function () {
      // Deposit some tokens first
      const depositAmount = 200;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);
    });

    it("Should allow owners to propose transactions", async function () {
      const transferAmount = 50;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const tx = await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check transaction count
      const transactionCount = await fheMultisigVault.getTransactionCount();
      expect(transactionCount).to.equal(1);
    });

    it("Should auto-confirm by the proposer", async function () {
      const transferAmount = 30;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        );

      // Check that the transaction is confirmed by owner1
      const isConfirmed = await fheMultisigVault.isConfirmed(0, owner1.address);
      expect(isConfirmed).to.be.true;

      // Check confirmation count
      const transaction = await fheMultisigVault.getTransaction(0);
      expect(transaction.confirmations).to.equal(1);
    });

    it("Should not allow non-owners to propose transactions", async function () {
      const transferAmount = 25;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), nonOwner.address)
        .add32(transferAmount)
        .encrypt();

      await expect(
        fheMultisigVault
          .connect(nonOwner)
          .proposeTransaction(
            owner1.address,
            await fheERC20.getAddress(),
            encryptedAmount.handles[0],
            encryptedAmount.inputProof
          )
      ).to.be.revertedWith("Not an owner");
    });
  });

  describe("Transaction Confirmations", function () {
    beforeEach(async function () {
      // Deposit tokens and propose a transaction
      const depositAmount = 200;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      const transferAmount = 50;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );
    });

    it("Should allow owners to confirm transactions", async function () {
      await fheMultisigVault.connect(owner2).confirmTransaction(0);

      const isConfirmed = await fheMultisigVault.isConfirmed(0, owner2.address);
      expect(isConfirmed).to.be.true;

      const transaction = await fheMultisigVault.getTransaction(0);
      expect(transaction.confirmations).to.equal(2);
    });

    it("Should not allow non-owners to confirm transactions", async function () {
      await expect(
        fheMultisigVault.connect(nonOwner).confirmTransaction(0)
      ).to.be.revertedWith("Not an owner");
    });

    it("Should not allow double confirmation", async function () {
      await fheMultisigVault.connect(owner2).confirmTransaction(0);

      await expect(
        fheMultisigVault.connect(owner2).confirmTransaction(0)
      ).to.be.revertedWith("Transaction already confirmed by this owner");
    });
  });

  describe("Transaction Execution", function () {
    beforeEach(async function () {
      // Deposit tokens and propose a transaction
      const depositAmount = 200;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      const transferAmount = 50;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );

      // Confirm by second owner
      await fheMultisigVault.connect(owner2).confirmTransaction(0);
    });

    it("Should execute transaction with enough confirmations", async function () {
      await fheMultisigVault.connect(owner1).executeTransaction(0);

      const transaction = await fheMultisigVault.getTransaction(0);
      expect(transaction.executed).to.be.true;
    });

    it("Should not execute transaction without enough confirmations", async function () {
      // Create a new transaction with only one confirmation
      const transferAmount = 25;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );

      await expect(
        fheMultisigVault.connect(owner1).executeTransaction(1)
      ).to.be.revertedWith("Not enough confirmations");
    });

    it("Should not allow execution of already executed transactions", async function () {
      await fheMultisigVault.connect(owner1).executeTransaction(0);

      await expect(
        fheMultisigVault.connect(owner1).executeTransaction(0)
      ).to.be.revertedWith("Transaction already executed");
    });
  });

  describe("Emergency Recovery", function () {
    beforeEach(async function () {
      // Deposit tokens
      const depositAmount = 100;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      await fheERC20
        .connect(owner1)
        .approve(await fheMultisigVault.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      await fheMultisigVault
        .connect(owner1)
        .depositTokens(await fheERC20.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);
    });

    it("Should allow owners to perform emergency recovery", async function () {
      const recoveryAmount = 25;
      const encryptedRecoveryAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(recoveryAmount)
        .encrypt();

      await fheMultisigVault
        .connect(owner1)
        .emergencyRecover(
          await fheERC20.getAddress(),
          nonOwner.address,
          encryptedRecoveryAmount.handles[0],
          encryptedRecoveryAmount.inputProof
        );

      // Check that vault balance decreased
      const encryptedVaultBalance = await fheMultisigVault.getVaultBalance(await fheERC20.getAddress());
      const clearVaultBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedVaultBalance,
        await fheMultisigVault.getAddress(),
        owner1
      );
      expect(clearVaultBalance).to.equal(75);
    });

    it("Should not allow non-owners to perform emergency recovery", async function () {
      const recoveryAmount = 10;
      const encryptedRecoveryAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), nonOwner.address)
        .add32(recoveryAmount)
        .encrypt();

      await expect(
        fheMultisigVault
          .connect(nonOwner)
          .emergencyRecover(
            await fheERC20.getAddress(),
            nonOwner.address,
            encryptedRecoveryAmount.handles[0],
            encryptedRecoveryAmount.inputProof
          )
      ).to.be.revertedWith("Not an owner");
    });
  });

  describe("Events", function () {
    it("Should emit TransactionProposed event", async function () {
      const transferAmount = 30;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      await expect(
        fheMultisigVault
          .connect(owner1)
          .proposeTransaction(
            nonOwner.address,
            await fheERC20.getAddress(),
            encryptedAmount.handles[0],
            encryptedAmount.inputProof
          )
      ).to.emit(fheMultisigVault, "TransactionProposed");
    });

    it("Should emit TransactionConfirmed event", async function () {
      const transferAmount = 20;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheMultisigVault.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      await fheMultisigVault
        .connect(owner1)
        .proposeTransaction(
          nonOwner.address,
          await fheERC20.getAddress(),
          encryptedAmount.handles[0],
          encryptedAmount.inputProof
        );

      await expect(
        fheMultisigVault.connect(owner2).confirmTransaction(0)
      ).to.emit(fheMultisigVault, "TransactionConfirmed");
    });
  });
});
