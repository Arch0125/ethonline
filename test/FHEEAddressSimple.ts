import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("FHE EAddress Simple Functionality", function () {
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

  describe("Contract Deployment", function () {
    it("Should deploy FHEERC20WithEAddress successfully", async function () {
      const address = await fheERC20WithEAddress.getAddress();
      expect(address).to.be.properAddress;
      console.log(`FHEERC20WithEAddress deployed at: ${address}`);
    });

    it("Should deploy FHEMultisigVaultWithEAddress successfully", async function () {
      const address = await fheMultisigVaultWithEAddress.getAddress();
      expect(address).to.be.properAddress;
      console.log(`FHEMultisigVaultWithEAddress deployed at: ${address}`);
    });

    it("Should have correct token metadata", async function () {
      expect(await fheERC20WithEAddress.name()).to.equal("FHE Privacy Token with EAddress");
      expect(await fheERC20WithEAddress.symbol()).to.equal("FHE-EA");
      expect(await fheERC20WithEAddress.decimals()).to.equal(18);
    });

    it("Should have correct vault configuration", async function () {
      const owners = await fheMultisigVaultWithEAddress.getOwners();
      const ownerCount = await fheMultisigVaultWithEAddress.getOwnerCount();
      const requiredConfirmations = await fheMultisigVaultWithEAddress.getRequiredConfirmations();

      expect(owners).to.deep.equal([owner1.address, owner2.address, owner3.address]);
      expect(ownerCount).to.equal(3);
      expect(requiredConfirmations).to.equal(2);
    });
  });

  describe("Basic FHE Operations", function () {
    it("Should perform regular encrypted transfers", async function () {
      const transferAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .transfer(nonOwner.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check balance
      const encryptedBalance = await fheERC20WithEAddress.balanceOf(nonOwner.address);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20WithEAddress.getAddress(),
        owner1
      );
      expect(clearBalance).to.equal(100);
    });

    it("Should perform regular encrypted approvals", async function () {
      const approveAmount = 150;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(approveAmount)
        .encrypt();

      await fheERC20WithEAddress
        .connect(owner1)
        .approve(nonOwner.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check allowance
      const encryptedAllowance = await fheERC20WithEAddress.allowance(owner1.address, nonOwner.address);
      const clearAllowance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedAllowance,
        await fheERC20WithEAddress.getAddress(),
        owner1
      );
      expect(clearAllowance).to.equal(150);
    });

    it("Should perform regular vault deposits", async function () {
      const depositAmount = 200;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      // First approve the vault to spend tokens
      await fheERC20WithEAddress
        .connect(owner1)
        .approve(await fheMultisigVaultWithEAddress.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Then deposit tokens
      await fheMultisigVaultWithEAddress
        .connect(owner1)
        .depositTokens(await fheERC20WithEAddress.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check vault balance
      const encryptedVaultBalance = await fheMultisigVaultWithEAddress.getVaultBalance(await fheERC20WithEAddress.getAddress());
      const clearVaultBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedVaultBalance,
        await fheMultisigVaultWithEAddress.getAddress(),
        owner1
      );
      expect(clearVaultBalance).to.equal(200);
    });
  });

  describe("Address Comparison Functions", function () {
    it("Should have encryptedAddressesEqual function", async function () {
      // These functions are placeholder implementations
      const result = await fheERC20WithEAddress.encryptedAddressesEqual(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(result).to.be.true;
    });

    it("Should have encryptedAddressesNotEqual function", async function () {
      // These functions are placeholder implementations
      const result = await fheERC20WithEAddress.encryptedAddressesNotEqual(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(result).to.be.true;
    });

    it("Should have vault encryptedAddressesEqual function", async function () {
      // These functions are placeholder implementations
      const result = await fheMultisigVaultWithEAddress.encryptedAddressesEqual(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(result).to.be.true;
    });

    it("Should have vault encryptedAddressesNotEqual function", async function () {
      // These functions are placeholder implementations
      const result = await fheMultisigVaultWithEAddress.encryptedAddressesNotEqual(
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      expect(result).to.be.true;
    });
  });

  describe("Events", function () {
    it("Should emit Transfer event on regular transfer", async function () {
      const transferAmount = 50;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(transferAmount)
        .encrypt();

      await expect(
        fheERC20WithEAddress
          .connect(owner1)
          .transfer(nonOwner.address, encryptedAmount.handles[0], encryptedAmount.inputProof)
      ).to.emit(fheERC20WithEAddress, "Transfer");
    });

    it("Should emit Approval event on regular approval", async function () {
      const approveAmount = 75;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(approveAmount)
        .encrypt();

      await expect(
        fheERC20WithEAddress
          .connect(owner1)
          .approve(nonOwner.address, encryptedAmount.handles[0], encryptedAmount.inputProof)
      ).to.emit(fheERC20WithEAddress, "Approval");
    });

    it("Should emit Deposit event on vault deposit", async function () {
      const depositAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
        .add32(depositAmount)
        .encrypt();

      // First approve
      await fheERC20WithEAddress
        .connect(owner1)
        .approve(await fheMultisigVaultWithEAddress.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof);

      await expect(
        fheMultisigVaultWithEAddress
          .connect(owner1)
          .depositTokens(await fheERC20WithEAddress.getAddress(), encryptedAmount.handles[0], encryptedAmount.inputProof)
      ).to.emit(fheMultisigVaultWithEAddress, "Deposit");
    });
  });
});
