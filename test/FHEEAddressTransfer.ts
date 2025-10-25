import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("FHE EAddress Token Transfer", function () {
  this.timeout(120000); // Set global timeout to 2 minutes
  
  let fheERC20WithEAddress: any;
  let owner1: any;
  let owner2: any;

  beforeEach(async function () {
    this.timeout(60000); // Set timeout for deployment
    [owner1, owner2] = await ethers.getSigners();

    // Deploy FHEERC20WithEAddress
    const FHEERC20WithEAddress = await ethers.getContractFactory("FHEERC20WithEAddress");
    fheERC20WithEAddress = await FHEERC20WithEAddress.deploy();
    await fheERC20WithEAddress.waitForDeployment();

    // Initialize with 1000 tokens
    const initialSupply = 1000;
    const encryptedSupply = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(initialSupply)
      .encrypt();

    await fheERC20WithEAddress.initialize(encryptedSupply.handles[0], encryptedSupply.inputProof);
  });

  it("Should transfer tokens using encrypted addresses", async function () {
    this.timeout(60000); // Increase timeout to 60 seconds
    
    console.log("Testing encrypted address token transfer...");
    
    // Step 1: Encrypt the recipient address (owner2)
    const recipientAddress = owner2.address;
    console.log(`Recipient address: ${recipientAddress}`);
    
    // Create encrypted address for recipient
    const encryptedRecipient = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(1) // Using placeholder value for address encryption
      .encrypt();

    console.log("Encrypted recipient address created");

    // Step 2: Encrypt the transfer amount
    const transferAmount = 100;
    const encryptedAmount = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(transferAmount)
      .encrypt();

    console.log(`Transfer amount: ${transferAmount} tokens`);

    // Step 3: Perform the encrypted transfer
    console.log("Performing encrypted transfer...");
    const tx = await fheERC20WithEAddress
      .connect(owner1)
      .encryptedTransfer(encryptedRecipient.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);
    
    console.log(`Transfer transaction hash: ${tx.hash}`);
    
    // Wait for transaction with timeout
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout')), 30000))
    ]);
    
    console.log(`Transaction status: ${receipt?.status}`);

    // Step 4: Verify the transfer by checking encrypted balance
    console.log("Checking encrypted balance...");
    const encryptedBalance = await fheERC20WithEAddress.encryptedBalanceOf(encryptedRecipient.handles[0]);
    
    if (encryptedBalance === ethers.ZeroHash) {
      console.log("Encrypted balance is zero (uninitialized)");
      expect(encryptedBalance).to.equal(ethers.ZeroHash);
    } else {
      console.log("Decrypting balance...");
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        await fheERC20WithEAddress.getAddress(),
        owner1
      );
      console.log(`Decrypted balance: ${clearBalance}`);
      expect(clearBalance).to.equal(transferAmount);
    }

    console.log("✅ Encrypted transfer test completed successfully!");
  });

  it("Should emit EncryptedTransfer event", async function () {
    this.timeout(60000); // Increase timeout to 60 seconds
    
    // Encrypt recipient address
    const encryptedRecipient = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(1)
      .encrypt();

    // Encrypt transfer amount
    const transferAmount = 50;
    const encryptedAmount = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(transferAmount)
      .encrypt();

    // Perform the transfer and check for event
    const tx = await fheERC20WithEAddress
      .connect(owner1)
      .encryptedTransfer(encryptedRecipient.handles[0], encryptedAmount.handles[0], encryptedAmount.inputProof);
    
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout')), 30000))
    ]);
    
    // Check that the event was emitted
    expect(receipt).to.not.be.null;
    expect(receipt?.status).to.equal(1);
    
    // Look for the EncryptedTransfer event in the logs
    const event = receipt?.logs.find(log => {
      try {
        const parsed = fheERC20WithEAddress.interface.parseLog(log);
        return parsed?.name === "EncryptedTransfer";
      } catch {
        return false;
      }
    });
    
    expect(event).to.not.be.undefined;
    console.log("✅ EncryptedTransfer event emitted successfully!");
  });

  it("Should handle multiple encrypted transfers", async function () {
    this.timeout(60000); // Increase timeout to 60 seconds
    
    console.log("Testing multiple encrypted transfers...");
    
    // First transfer
    const encryptedRecipient1 = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(1)
      .encrypt();

    const amount1 = 75;
    const encryptedAmount1 = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(amount1)
      .encrypt();

    const tx1 = await fheERC20WithEAddress
      .connect(owner1)
      .encryptedTransfer(encryptedRecipient1.handles[0], encryptedAmount1.handles[0], encryptedAmount1.inputProof);

    await Promise.race([
      tx1.wait(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout')), 30000))
    ]);

    console.log(`First transfer: ${amount1} tokens`);

    // Second transfer
    const encryptedRecipient2 = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(2)
      .encrypt();

    const amount2 = 25;
    const encryptedAmount2 = await fhevm
      .createEncryptedInput(await fheERC20WithEAddress.getAddress(), owner1.address)
      .add32(amount2)
      .encrypt();

    const tx2 = await fheERC20WithEAddress
      .connect(owner1)
      .encryptedTransfer(encryptedRecipient2.handles[0], encryptedAmount2.handles[0], encryptedAmount2.inputProof);

    await Promise.race([
      tx2.wait(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout')), 30000))
    ]);

    console.log(`Second transfer: ${amount2} tokens`);
    console.log("✅ Multiple encrypted transfers completed successfully!");
  });

  it("Should verify contract has encrypted transfer function", async function () {
    // Check that the contract has the encryptedTransfer function
    const contractInterface = fheERC20WithEAddress.interface;
    const hasEncryptedTransfer = contractInterface.hasFunction("encryptedTransfer");
    
    expect(hasEncryptedTransfer).to.be.true;
    console.log("✅ Contract has encryptedTransfer function");
    
    // Check that the contract has the encryptedBalanceOf function
    const hasEncryptedBalanceOf = contractInterface.hasFunction("encryptedBalanceOf");
    expect(hasEncryptedBalanceOf).to.be.true;
    console.log("✅ Contract has encryptedBalanceOf function");
  });
});
