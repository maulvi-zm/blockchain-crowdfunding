const hre = require("hardhat");

async function main() {
  const [admin, creator, backer, oracle] = await hre.ethers.getSigners();

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const contract = Crowdfunding.attach(contractAddress);

  console.log("=== CREATE CAMPAIGN ===");
  const goalIDR = hre.ethers.BigNumber.from("30000000"); // 30 juta IDR
  const deadline = Math.floor(Date.now() / 1000) + 60; // 1 menit
  const cid = "ipfs://my-metadata-cid";

  const tx1 = await contract.connect(creator).createCampaign(
    goalIDR,
    deadline,
    cid
  );
  await tx1.wait();
  console.log("✅ Campaign created");

  // console.log("=== CONTRIBUTE ===");
  // const tx2 = await contract.connect(backer).contribute(1, {
  //   value: hre.ethers.utils.parseEther("0.02"),
  // });
  // await tx2.wait();
  // console.log("✅ Contribution sent");

  // console.log("=== ORACLE CALLBACK ===");
  // const rate = hre.ethers.BigNumber.from("25000000000000000"); 
  // // contoh: 1 ETH = 25 juta IDR (scaled 1e18)

  // const now = Math.floor(Date.now() / 1000);

  // await contract.connect(admin).setOracle(oracle.address);

  // const tx3 = await contract.connect(oracle).oracleCallback(
  //   1,
  //   hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("req1")),
  //   "ETH_IDR",
  //   rate,
  //   now
  // );
  // await tx3.wait();
  // console.log("✅ Oracle data submitted");

  // console.log("=== TIME TRAVEL ===");
  // await hre.network.provider.send("evm_increaseTime", [70]);
  // await hre.network.provider.send("evm_mine");

  // console.log("=== FINALIZE ===");
  // const tx4 = await contract.finalizeCampaign(1);
  // await tx4.wait();
  // console.log("🏁 Campaign finalized");

  // const campaign = await contract.campaigns(1);
  // console.log("Status:", campaign.status.toString());
}

main().catch(console.error);
