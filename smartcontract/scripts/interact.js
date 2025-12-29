const hre = require("hardhat");

async function main() {
  const [owner, creator, backer] = await hre.ethers.getSigners();
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Alamat hasil deploy

  // Ambil instance contract yang sudah terdeploy
  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const contract = await Crowdfunding.attach(contractAddress);

  console.log("--- Mencoba Create Campaign ---");
  const goal = hre.ethers.utils.parseEther("5"); // 5 ETH
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 jam ke depan
  const cid = "ipfs://my-metadata-cid";

  // Memanggil fungsi createCampaign
  const tx1 = await contract.connect(creator).createCampaign(goal, deadline, cid);
  await tx1.wait(); // Tunggu transaksi masuk blok
  console.log("Campaign berhasil dibuat!");

  console.log("--- Mencoba Kontribusi ---");
  // Memanggil fungsi contribute sambil mengirimkan uang (value)
  const tx2 = await contract.connect(backer).contribute(1, { 
    value: hre.ethers.utils.parseEther("1") 
  });
  await tx2.wait();
  console.log("Berhasil kontribusi 1 ETH!");

  // Memanggil fungsi getter (read-only)
  const campaign = await contract.campaigns(1);
  console.log("Total Dana Terkumpul:", hre.ethers.utils.formatEther(campaign.totalRaisedWei), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
