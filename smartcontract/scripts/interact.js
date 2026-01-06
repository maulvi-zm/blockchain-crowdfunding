const hre = require("hardhat");

async function main() {
  const [owner, creator, backer, oracle] = await hre.ethers.getSigners();
  const contractAddress =
    process.env.CONTRACT_ADDRESS ||
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Ambil instance contract yang sudah terdeploy
  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const contract = await Crowdfunding.attach(contractAddress);

  const currentOracle = await contract.oracleAddress();
  if (currentOracle.toLowerCase() !== oracle.address.toLowerCase()) {
    const txSet = await contract.connect(owner).setOracle(oracle.address);
    await txSet.wait();
    console.log(`Oracle updated to ${oracle.address}`);
  }

  console.log("--- Mencoba Create Campaign ---");
  const goalIdr = hre.ethers.BigNumber.from("1000000"); // 1,000,000 IDR
  const latestBlock = await hre.ethers.provider.getBlock("latest");
  const deadline = latestBlock.timestamp + 3600; // 1 jam ke depan
  const cid = "ipfs://my-metadata-cid";

  // Memanggil fungsi createCampaign
  const tx1 = await contract
    .connect(creator)
    .createCampaign(goalIdr, deadline, cid);
  await tx1.wait(); // Tunggu transaksi masuk blok
  const createdId = (await contract.campaignCount()).toNumber();
  console.log("Campaign berhasil dibuat!");

  console.log("--- Mencoba Kontribusi ---");
  // Memanggil fungsi contribute sambil mengirimkan uang (value)
  const tx2 = await contract.connect(backer).contribute(createdId, {
    value: hre.ethers.utils.parseEther("1"),
  });
  await tx2.wait();
  console.log("Berhasil kontribusi 1 ETH!");

  console.log("--- Mencoba Oracle Callback ---");
  const reqTx = await contract
    .connect(creator)
    .requestOracleData(createdId, "ETH_IDR", "");
  const reqReceipt = await reqTx.wait();
  let requestId = null;
  for (const log of reqReceipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "OracleDataRequested") {
        requestId = parsed.args.requestId;
        break;
      }
    } catch {}
  }
  if (!requestId) {
    throw new Error("Oracle request ID not found");
  }
  const rateScaled = hre.ethers.BigNumber.from("100000000"); // 1,000,000 IDR/ETH * 100
  const txOracle = await contract
    .connect(oracle)
    .oracleCallback(createdId, requestId, "ETH_IDR", rateScaled, 123456);
  await txOracle.wait();
  console.log("Oracle callback berhasil!");

  console.log("\n--- Mencoba Finalize Campaign ---");

  await hre.network.provider.send("evm_increaseTime", [3700]);
  await hre.network.provider.send("evm_mine");

  const tx3 = await contract
    .connect(owner) // siapa pun boleh finalize
    .finalizeCampaign(createdId);

  await tx3.wait();
  console.log("🏁 Campaign berhasil difinalize");

  // // Memanggil fungsi getter (read-only)
  // const campaign = await contract.campaigns(1);
  // console.log("Total Dana Terkumpul:", hre.ethers.utils.formatEther(campaign.totalRaisedWei), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
