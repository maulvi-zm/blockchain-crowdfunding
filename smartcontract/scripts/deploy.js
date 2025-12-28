const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const oracleAddress = deployer.address; 

  console.log("Deploying contract with account:", deployer.address);

  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const contract = await Crowdfunding.deploy(oracleAddress);

  await contract.deployed();

  console.log("Crowdfunding deployed to:", contract.address);
  console.log("Oracle Address set to:", oracleAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
