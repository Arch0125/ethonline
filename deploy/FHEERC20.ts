import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { FhevmType } from "@fhevm/hardhat-plugin";

const deployFHEERC20: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, fhevm, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await fhevm.initializeCLIApi();

  console.log("Deploying FHEERC20...");

  const fheERC20Deployment = await deploy("FHEERC20", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log("FHEERC20 deployed to:", fheERC20Deployment.address);

  // Initialize with encrypted supply (1000 tokens)
  const initialSupply = 1000;
  const encryptedSupply = await fhevm
    .createEncryptedInput(fheERC20Deployment.address, deployer)
    .add32(initialSupply)
    .encrypt();

  console.log("Initializing FHEERC20 with supply:", initialSupply);

  const fheERC20Contract = await ethers.getContractAt("FHEERC20", fheERC20Deployment.address);
  const initTx = await fheERC20Contract.initialize(encryptedSupply.handles[0], encryptedSupply.inputProof);
  await initTx.wait();

  console.log("FHEERC20 initialized successfully!");
};

export default deployFHEERC20;
deployFHEERC20.tags = ["FHEERC20"];
