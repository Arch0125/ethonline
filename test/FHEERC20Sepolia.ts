import { expect } from "chai";
import { ethers } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { FhevmInstance } from "@fhevm/hardhat-plugin";

describe("FHEERC20 Sepolia", function () {
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

  describe("Sepolia Network Deployment", function () {
    it("Should deploy successfully on Sepolia", async function () {
      const address = await fheERC20.getAddress();
      expect(address).to.be.properAddress;
      console.log(`FHEERC20 deployed at: ${address}`);
    });

    it("Should have correct token metadata", async function () {
      expect(await fheERC20.name()).to.equal("FHE Privacy Token");
      expect(await fheERC20.symbol()).to.equal("FHE");
      expect(await fheERC20.decimals()).to.equal(18);
    });

    it("Should initialize with correct supply", async function () {
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

  describe("Sepolia Network Operations", function () {
    it("Should perform encrypted transfer on Sepolia", async function () {
      const transferAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(transferAmount)
        .encrypt();

      const tx = await fheERC20.transfer(addr1.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
      const receipt = await tx.wait();
      
      expect(receipt?.status).to.equal(1);
      console.log(`Transfer transaction hash: ${tx.hash}`);

      // Verify balance
      const encryptedBalance = await fheERC20.balanceOf(addr1.address);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearBalance).to.equal(100);
    });

    it("Should perform encrypted approval on Sepolia", async function () {
      const approveAmount = 200;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(approveAmount)
        .encrypt();

      const tx = await fheERC20.approve(addr1.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
      const receipt = await tx.wait();
      
      expect(receipt?.status).to.equal(1);
      console.log(`Approval transaction hash: ${tx.hash}`);

      // Verify allowance
      const encryptedAllowance = await fheERC20.allowance(owner.address, addr1.address);
      const clearAllowance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedAllowance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearAllowance).to.equal(200);
    });

    it("Should perform encrypted minting on Sepolia", async function () {
      const mintAmount = 300;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(mintAmount)
        .encrypt();

      const tx = await fheERC20.mint(addr2.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
      const receipt = await tx.wait();
      
      expect(receipt?.status).to.equal(1);
      console.log(`Mint transaction hash: ${tx.hash}`);

      // Verify balance
      const encryptedBalance = await fheERC20.balanceOf(addr2.address);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearBalance).to.equal(300);

      // Verify total supply
      const encryptedTotalSupply = await fheERC20.totalSupply();
      const clearTotalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedTotalSupply,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearTotalSupply).to.equal(1300);
    });

    it("Should perform encrypted burning on Sepolia", async function () {
      const burnAmount = 50;
      const encryptedAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(burnAmount)
        .encrypt();

      const tx = await fheERC20.burn(owner.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
      const receipt = await tx.wait();
      
      expect(receipt?.status).to.equal(1);
      console.log(`Burn transaction hash: ${tx.hash}`);

      // Verify balance
      const encryptedBalance = await fheERC20.balanceOf(owner.address);
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearBalance).to.equal(950);

      // Verify total supply
      const encryptedTotalSupply = await fheERC20.totalSupply();
      const clearTotalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedTotalSupply,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearTotalSupply).to.equal(950);
    });
  });

  describe("Sepolia Network Integration", function () {
    it("Should handle complex multi-step operations", async function () {
      // Step 1: Transfer tokens
      const transferAmount = 150;
      const encryptedTransferAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(transferAmount)
        .encrypt();
      
      const transferTx = await fheERC20.transfer(addr1.address, encryptedTransferAmount.handles[0], encryptedTransferAmount.inputProof);
      await transferTx.wait();

      // Step 2: Approve tokens for addr1
      const approveAmount = 100;
      const encryptedApproveAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), owner.address)
        .add32(approveAmount)
        .encrypt();
      
      const approveTx = await fheERC20.approve(addr1.address, encryptedApproveAmount.handles[0], encryptedApproveAmount.inputProof);
      await approveTx.wait();

      // Step 3: addr1 transfers from owner to addr2
      const transferFromAmount = 75;
      const encryptedTransferFromAmount = await fhevm
        .createEncryptedInput(await fheERC20.getAddress(), addr1.address)
        .add32(transferFromAmount)
        .encrypt();
      
      const transferFromTx = await fheERC20.connect(addr1).transferFrom(owner.address, addr2.address, encryptedTransferFromAmount.handles[0], encryptedTransferFromAmount.inputProof);
      await transferFromTx.wait();

      // Verify final balances
      const encryptedAddr2Balance = await fheERC20.balanceOf(addr2.address);
      const clearAddr2Balance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedAddr2Balance,
        await fheERC20.getAddress(),
        owner
      );
      expect(clearAddr2Balance).to.equal(75);

      console.log("Complex multi-step operations completed successfully on Sepolia");
    });
  });
});
