import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { FhevmType } from "@fhevm/hardhat-plugin";

const deployFHEERC20WithEAddress: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, fhevm, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await fhevm.initializeCLIApi();

  console.log("Deploying FHEERC20WithEAddress...");

  const fheERC20WithEAddressDeployment = await deploy("FHEERC20WithEAddress", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log("FHEERC20WithEAddress deployed to:", fheERC20WithEAddressDeployment.address);

  // Initialize with encrypted supply (1000 tokens)
  const initialSupply = 1000;
  const encryptedSupply = await fhevm
    .createEncryptedInput(fheERC20WithEAddressDeployment.address, deployer)
    .add32(initialSupply)
    .encrypt();

  console.log("Initializing FHEERC20WithEAddress with supply:", initialSupply);

  const fheERC20WithEAddressContract = await ethers.getContractAt("FHEERC20WithEAddress", fheERC20WithEAddressDeployment.address);
  const initTx = await fheERC20WithEAddressContract.initialize(encryptedSupply.handles[0], encryptedSupply.inputProof);
  await initTx.wait();

  console.log("FHEERC20WithEAddress initialized successfully!");
};

export default deployFHEERC20WithEAddress;
deployFHEERC20WithEAddress.tags = ["FHEERC20WithEAddress"];
