import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployFHEMultisigVault: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get additional signers for multisig owners
  const signers = await ethers.getSigners();
  
  // Create owners array (first 3 signers)
  const owners = [
    signers[0].address, // deployer
    signers[1].address, // second owner
    signers[2].address  // third owner
  ];
  
  // Require 2 out of 3 confirmations
  const requiredConfirmations = 2;

  console.log("Deploying FHEMultisigVault with owners:", owners);
  console.log("Required confirmations:", requiredConfirmations);

  const fheMultisigVaultDeployment = await deploy("FHEMultisigVault", {
    from: deployer,
    args: [owners, requiredConfirmations],
    log: true,
    waitConfirmations: 1,
  });

  console.log("FHEMultisigVault deployed to:", fheMultisigVaultDeployment.address);
  console.log("Owners:", owners);
  console.log("Required confirmations:", requiredConfirmations);
};

export default deployFHEMultisigVault;
deployFHEMultisigVault.tags = ["FHEMultisigVault"];
