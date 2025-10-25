import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("FHE EAddress Functionality", function () {
  let fheERC20WithEAddress: any;
  let fheMultisigVaultWithEAddress: any;
  let owner1: any;
  let owner2: any;
  let owner3: any;
  let nonOwner: any;

  beforeEach(async function () {
    [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();

    // Deploy FHEERC20WithEAddress
    const FHEERC20WithEAddress = await ethers.getContractFactory("FHEERC20WithEAddress");
    fheERC20WithEAddress = await FHEERC20WithEAddress.deploy();
    await fheERC20WithEAddress.waitForDeployment();

    // Initialize FHEERC20WithEAddress with 1000 tokens
    const initialSupply = 1000;
    const encryptedSupply = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(initialSupply)
      .encrypt();

    await fheERC20WithEAddress.initialize(encryptedSupply.handles[0], encryptedSupply.inputProof);

    // Deploy FHEMultisigVaultWithEAddress
    const owners = [owner1.address, owner2.address, owner3.address];
    const requiredConfirmations = 2;

    const FHEMultisigVaultWithEAddress = await ethers.getContractFactory("FHEMultisigVaultWithEAddress");
    fheMultisigVaultWithEAddress = await FHEMultisigVaultWithEAddress.deploy(owners, requiredConfirmations);
    await fheMultisigVaultWithEAddress.waitForDeployment();
  });

  describe("Address Encryption", function () {
    it("Should encrypt addresses in ERC20 contract", async function () {
      const addressToEncrypt = owner1.address;
      const encryptedAddress = await fhevm
        .createEncryptedInput(addressToEncrypt, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .encryptAddress(addressToEncrypt, encryptedAddress.handles[0], encryptedAddress.inputProof);

      const storedEncryptedAddress = await fheERC20WithEAddress.getEncryptedAddress(addressToEncrypt);
      expect(storedEncryptedAddress).to.not.equal(ethers.ZeroHash);
    });

    it("Should encrypt addresses in MultisigVault contract", async function () {
      const addressToEncrypt = owner1.address;
      const encryptedAddress = await fhevm
        .createEncryptedInput(addressToEncrypt, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .encryptAddress(addressToEncrypt, encryptedAddress.handles[0], encryptedAddress.inputProof);

      const storedEncryptedAddress = await fheMultisigVaultWithEAddress.getEncryptedAddress(addressToEncrypt);
      expect(storedEncryptedAddress).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("FHEERC20WithEAddress Operations", function () {
    beforeEach(async function () {
      // Encrypt addresses for testing
      const encryptedOwner1 = await fhevm
        .createEncryptedInput(owner1.address, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .encryptAddress(owner1.address, encryptedOwner1.handles[0], encryptedOwner1.inputProof);

      await fheERC20WithEAddress
        .connect(owner1)
        .encryptAddress(nonOwner.address, encryptedNonOwner.handles[0], encryptedNonOwner.inputProof);
    });

    it("Should perform encrypted transfers", async function () {
      const transferAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .encryptedTransfer(encryptedNonOwner.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check encrypted balance
      const encryptedBalance = await fheERC20WithEAddress.encryptedBalanceOf(encryptedNonOwner.handles[0]);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20WithEAddress.getAddress(),
        owner1
      );
      expect(clearBalance).to.equal(100);
    });

    it("Should perform encrypted approvals", async function () {
      const approveAmount = 150;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(approveAmount)
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .encryptedApprove(encryptedNonOwner.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check encrypted allowance
      const encryptedOwner1 = await fhevm
        .createEncryptedInput(owner1.address, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      const encryptedAllowance = await fheERC20WithEAddress.encryptedAllowance(encryptedOwner1.handles[0], encryptedNonOwner.handles[0]);
      const clearAllowance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedAllowance,
        await fheERC20WithEAddress.getAddress(),
        owner1
      );
      expect(clearAllowance).to.equal(150);
    });

    it("Should perform encrypted minting", async function () {
      const mintAmount = 200;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(mintAmount)
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .encryptedMint(encryptedNonOwner.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check encrypted balance
      const encryptedBalance = await fheERC20WithEAddress.encryptedBalanceOf(encryptedNonOwner.handles[0]);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20WithEAddress.getAddress(),
        owner1
      );
      expect(clearBalance).to.equal(200);
    });

    it("Should perform encrypted burning", async function () {
      const burnAmount = 50;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(burnAmount)
        .encrypt();

      const encryptedOwner1 = await fhevm
        .createEncryptedInput(owner1.address, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .encryptedBurn(encryptedOwner1.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check encrypted balance
      const encryptedBalance = await fheERC20WithEAddress.encryptedBalanceOf(encryptedOwner1.handles[0]);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20WithEAddress.getAddress(),
        owner1
      );
      expect(clearBalance).to.equal(950);
    });
  });

  describe("FHEMultisigVaultWithEAddress Operations", function () {
    beforeEach(async function () {
      // Encrypt addresses for testing
      const encryptedOwner1 = await fhevm
        .createEncryptedInput(owner1.address, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .encryptAddress(owner1.address, encryptedOwner1.handles[0], encryptedOwner1.inputProof);

      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .encryptAddress(nonOwner.address, encryptedNonOwner.handles[0], encryptedNonOwner.inputProof);
    });

    it("Should perform encrypted deposits", async function () {
      const depositAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      // First approve the vault to spend tokens
      await fheERC20WithEAddress
        .connect(owner1)
        .approve(await fheMultisigVaultWithEAddress.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Then deposit tokens using encrypted deposit
      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .depositEncryptedTokens(await fheERC20WithEAddress.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check encrypted vault balance
      const encryptedVaultBalance = await fheMultisigVaultWithEAddress.getEncryptedVaultBalance(await fheERC20WithEAddress.getAddress());
      const clearVaultBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedVaultBalance,
        await fheMultisigVaultWithEAddress.getAddress(),
        owner1
      );
      expect(clearVaultBalance).to.equal(100);
    });

    it("Should propose encrypted transactions", async function () {
      // First deposit some tokens
      const depositAmount = 200;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .approve(await fheMultisigVaultWithEAddress.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .depositEncryptedTokens(await fheERC20WithEAddress.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      // Now propose an encrypted transaction
      const transferAmount = 50;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVaultWithEAddress.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .proposeEncryptedTransaction(
          encryptedNonOwner.handles[0],
          await fheERC20WithEAddress.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );

      // Check encrypted transaction count
      const encryptedTransactionCount = await fheMultisigVaultWithEAddress.getEncryptedTransactionCount();
      expect(encryptedTransactionCount).to.equal(1);
    });

    it("Should confirm encrypted transactions", async function () {
      // First deposit tokens and propose transaction
      const depositAmount = 150;
      const encryptedDepositAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .approve(await fheMultisigVaultWithEAddress.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .depositEncryptedTokens(await fheERC20WithEAddress.getAddress(), encryptedDepositAmount.handles[0], encryptedDepositAmount.inputProof);

      const transferAmount = 30;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheMultisigVaultWithEAddress.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .proposeEncryptedTransaction(
          encryptedNonOwner.handles[0],
          await fheERC20WithEAddress.getAddress(),
          encryptedTransferAmount.handles[0],
          encryptedTransferAmount.inputProof
        );

      // Now confirm the encrypted transaction
      await fheMultisigVaultWithEAddress.connect(owner2).confirmEncryptedTransaction(0);

      const isConfirmed = await fheMultisigVaultWithEAddress.isEncryptedConfirmed(0, owner2.address);
      expect(isConfirmed).to.be.true;

      const encryptedTransaction = await fheMultisigVaultWithEAddress.getEncryptedTransaction(0);
      expect(encryptedTransaction.confirmations).to.equal(2);
    });
  });

  describe("Address Comparison Operations", function () {
    it("Should compare encrypted addresses for equality", async function () {
      const address1 = owner1.address;
      const address2 = owner1.address; // Same address
      const address3 = owner2.address; // Different address

      const encryptedAddr1 = await fhevm
        .createEncryptedInput(address1, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      const encryptedAddr2 = await fhevm
        .createEncryptedInput(address2, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      const encryptedAddr3 = await fhevm
        .createEncryptedInput(address3, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      // Test equality
      const isEqual = await fheERC20WithEAddress.encryptedAddressesEqual(encryptedAddr1.handles[0], encryptedAddr2.handles[0]);
      expect(isEqual).to.be.true;

      // Test inequality
      const isNotEqual = await fheERC20WithEAddress.encryptedAddressesNotEqual(encryptedAddr1.handles[0], encryptedAddr3.handles[0]);
      expect(isNotEqual).to.be.true;
    });

    it("Should compare encrypted addresses in vault", async function () {
      const address1 = owner1.address;
      const address2 = owner1.address; // Same address
      const address3 = owner2.address; // Different address

      const encryptedAddr1 = await fhevm
        .createEncryptedInput(address1, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      const encryptedAddr2 = await fhevm
        .createEncryptedInput(address2, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      const encryptedAddr3 = await fhevm
        .createEncryptedInput(address3, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      // Test equality
      const isEqual = await fheMultisigVaultWithEAddress.encryptedAddressesEqual(encryptedAddr1.handles[0], encryptedAddr2.handles[0]);
      expect(isEqual).to.be.true;

      // Test inequality
      const isNotEqual = await fheMultisigVaultWithEAddress.encryptedAddressesNotEqual(encryptedAddr1.handles[0], encryptedAddr3.handles[0]);
      expect(isNotEqual).to.be.true;
    });
  });

  describe("Events", function () {
    it("Should emit AddressEncrypted event", async function () {
      const addressToEncrypt = owner1.address;
      const encryptedAddress = await fhevm
        .createEncryptedInput(addressToEncrypt, owner1.address)
        .add32(1) // Using placeholder for address encryption
        .encrypt();

      await expect(
        fheERC20WithEAddress
          .connect(owner1)
          .encryptAddress(addressToEncrypt, encryptedAddress.handles[0], encryptedAddress.inputProof)
      ).to.emit(fheERC20WithEAddress, "AddressEncrypted");
    });

    it("Should emit EncryptedTransfer event", async function () {
      const transferAmount = 75;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await expect(
        fheERC20WithEAddress
          .connect(owner1)
          .encryptedTransfer(encryptedNonOwner.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof)
      ).to.emit(fheERC20WithEAddress, "EncryptedTransfer");
    });

    it("Should emit EncryptedApproval event", async function () {
      const approveAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(approveAmount)
        .encrypt();

      const encryptedNonOwner = await fhevm
        .createEncryptedInput(nonOwner.address, owner1.address)
        .add32(2) // Using placeholder for address encryption
        .encrypt();

      await expect(
        fheERC20WithEAddress
          .connect(owner1)
          .encryptedApprove(encryptedNonOwner.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof)
      ).to.emit(fheERC20WithEAddress, "EncryptedApproval");
    });
  });
});
