import { expect } from "chai";
import { ethers } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { FhevmInstance } from "@fhevm/hardhat-plugin";

describe("FHEERC20", function () {
  let fhevm: FhevmInstance;
  let fheERC20: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    fhevm = await (this as any).fhevm;

    // Deploy FHEERC20 with initial supply of 1000 tokens
    const initialSupply = 1000;
    const encryptedSupply = await fhevm
      .createEncryptedInput(owner.address, owner.address)
      .add32(initialSupply)
      .encrypt();

    const FHEERC20 = await ethers.getContractFactory("FHEERC20");
    fheERC20 = await FHEERC20.deploy(encryptedSupply.handles[0], encryptedSupply.inputProof);
    await fheERC20.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await fheERC20.name()).to.equal("FHE Privacy Token");
      expect(await fheERC20.symbol()).to.equal("FHE");
      expect(await fheERC20.decimals()).to.equal(18);
    });

    it("Should mint initial supply to owner", async function () {
      const encryptedBalance = await fheERC20.balanceOf(owner.address);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearBalance).to.equal(1000);
    });

    it("Should set the correct total supply", async function () {
      const encryptedTotalSupply = await fheERC20.totalSupply();
      const clearTotalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedTotalSupply,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearTotalSupply).to.equal(1000);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(transferAmount)
        .encrypt();

      await fheERC20.transfer(addr1.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check recipient's balance
      const encryptedBalance = await fheERC20.balanceOf(addr1.address);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearBalance).to.equal(100);
    });

    it("Should update balances after transfer", async function () {
      const transferAmount = 200;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(transferAmount)
        .encrypt();

      await fheERC20.transfer(addr1.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check sender's balance
      const encryptedSenderBalance = await fheERC20.balanceOf(owner.address);
      const clearSenderBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedSenderBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearSenderBalance).to.equal(800);

      // Check recipient's balance
      const encryptedRecipientBalance = await fheERC20.balanceOf(addr1.address);
      const clearRecipientBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedRecipientBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearRecipientBalance).to.equal(200);
    });
  });

  describe("Allowances", function () {
    it("Should approve tokens for spending", async function () {
      const approveAmount = 150;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(approveAmount)
        .encrypt();

      await fheERC20.approve(addr1.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

      const encryptedAllowance = await fheERC20.allowance(owner.address, addr1.address);
      const clearAllowance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedAllowance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearAllowance).to.equal(150);
    });

    it("Should allow transferFrom with sufficient allowance", async function () {
      const approveAmount = 100;
      const transferAmount = 50;
      
      // First approve
      const encryptedApproveAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(approveAmount)
        .encrypt();
      await fheERC20.approve(addr1.address, encryptedApproveAmount.handles[0], encryptedApproveAmount.inputProof);

      // Then transferFrom
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), addr1.address)
        .add32(transferAmount)
        .encrypt();
      await fheERC20.connect(addr1).transferFrom(owner.address, addr2.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);

      // Check balances
      const encryptedRecipientBalance = await fheERC20.balanceOf(addr2.address);
      const clearRecipientBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedRecipientBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearRecipientBalance).to.equal(50);
    });
  });

  describe("Minting", function () {
    it("Should mint new tokens", async function () {
      const mintAmount = 200;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(mintAmount)
        .encrypt();

      await fheERC20.mint(addr1.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check recipient's balance
      const encryptedBalance = await fheERC20.balanceOf(addr1.address);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearBalance).to.equal(200);

      // Check total supply
      const encryptedTotalSupply = await fheERC20.totalSupply();
      const clearTotalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedTotalSupply,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearTotalSupply).to.equal(1200);
    });
  });

  describe("Burning", function () {
    it("Should burn tokens", async function () {
      const burnAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(burnAmount)
        .encrypt();

      await fheERC20.burn(owner.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Check owner's balance
      const encryptedBalance = await fheERC20.balanceOf(owner.address);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearBalance).to.equal(900);

      // Check total supply
      const encryptedTotalSupply = await fheERC20.totalSupply();
      const clearTotalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedTotalSupply,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearTotalSupply).to.equal(900);
    });
  });

  describe("Events", function () {
    it("Should emit Transfer event on transfer", async function () {
      const transferAmount = 50;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(transferAmount)
        .encrypt();

      await expect(fheERC20.transfer(addr1.address, encryptedAmount.handles[0], encryptedAmount.inputProof))
        .to.emit(fheERC20, "Transfer")
        .withArgs(owner.address, addr1.address, 0); // Value is 0 since it's encrypted
    });

    it("Should emit Approval event on approve", async function () {
      const approveAmount = 75;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(approveAmount)
        .encrypt();

      await expect(fheERC20.approve(addr1.address, encryptedAmount.handles[0], encryptedAmount.inputProof))
        .to.emit(fheERC20, "Approval")
        .withArgs(owner.address, addr1.address, 0); // Value is 0 since it's encrypted
    });
  });
});
