const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding Smart Contract", function () {
  let Crowdfunding;
  let crowdfunding;
  let owner;
  let creator;
  let backer1;
  let backer2;
  let oracle;
  let addrs;

  const GOAL = ethers.utils.parseEther("10"); // 10 ETH
  const METADATA = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

  beforeEach(async function () {
    // Ambil akun-akun dari Hardhat
    [owner, creator, backer1, backer2, oracle, ...addrs] = await ethers.getSigners();

    // Deploy contract
    Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    crowdfunding = await Crowdfunding.deploy(oracle.address);
    await crowdfunding.deployed();
  });

  describe("Deployment", function () {
    it("Harus mengatur admin dan oracle dengan benar", async function () {
      expect(await crowdfunding.admin()).to.equal(owner.address);
      expect(await crowdfunding.oracleAddress()).to.equal(oracle.address);
    });
  });

  describe("Campaign Creation", function () {
    it("Harus bisa membuat campaign baru", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 jam dari sekarang
      
      await expect(crowdfunding.connect(creator).createCampaign(GOAL, deadline, METADATA))
        .to.emit(crowdfunding, "CampaignCreated")
        .withArgs(1, creator.address, GOAL, deadline, METADATA);

      const campaign = await crowdfunding.campaigns(1);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.goalWei).to.equal(GOAL);
      expect(campaign.status).to.equal(0); // 0 = ACTIVE
    });

    it("Harus gagal jika goal adalah 0", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await expect(crowdfunding.createCampaign(0, deadline, METADATA)).to.be.revertedWith("GOAL_ZERO");
    });
  });

  describe("Contributions", function () {
    let deadline;
    beforeEach(async function () {
      deadline = Math.floor(Date.now() / 1000) + 3600;
      await crowdfunding.connect(creator).createCampaign(GOAL, deadline, METADATA);
    });

    it("Harus menerima kontribusi", async function () {
      const amount = ethers.utils.parseEther("1");
      await expect(crowdfunding.connect(backer1).contribute(1, { value: amount }))
        .to.emit(crowdfunding, "ContributionReceived")
        .withArgs(1, backer1.address, amount, amount);

      const campaign = await crowdfunding.campaigns(1);
      expect(campaign.totalRaisedWei).to.equal(amount);
    });

    it("Harus gagal jika kontribusi 0 ETH", async function () {
      await expect(crowdfunding.connect(backer1).contribute(1, { value: 0 })).to.be.revertedWith("VALUE_ZERO");
    });
  });

  describe("Oracle Integration", function () {
    it("Harus bisa merequest data oracle", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await crowdfunding.connect(creator).createCampaign(GOAL, deadline, METADATA);

      await expect(crowdfunding.requestOracleData(1, "ETH_IDR", ""))
        .to.emit(crowdfunding, "OracleDataRequested");
    });

    it("Hanya oracle yang bisa memberikan callback", async function () {
      const requestId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
      await expect(
        crowdfunding.connect(backer1).oracleCallback(1, requestId, "ETH_IDR", 5000000000, 123456)
      ).to.be.revertedWith("ONLY_ORACLE");
    });
  });

  describe("Finalization & Withdrawals", function () {
    it("Harus sukses jika goal tercapai setelah deadline", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;
      await crowdfunding.connect(creator).createCampaign(GOAL, deadline, METADATA);

      // Backer kontribusi sampai goal tercapai
      await crowdfunding.connect(backer1).contribute(1, { value: GOAL });

      // Lompat waktu ke setelah deadline
      await ethers.provider.send("evm_increaseTime", [1001]);
      await ethers.provider.send("evm_mine");

      await expect(crowdfunding.finalizeCampaign(1))
        .to.emit(crowdfunding, "CampaignFinalized")
        .withArgs(1, 1, GOAL, GOAL); // 1 = SUCCESS status

      // Creator menarik dana
      const initialBalance = await creator.getBalance();
      await crowdfunding.connect(creator).withdrawFunds(1);
      const finalBalance = await creator.getBalance();

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Harus gagal (FAILED) jika goal tidak tercapai", async function () {
        const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;
        await crowdfunding.connect(creator).createCampaign(GOAL, deadline, METADATA);
  
        await crowdfunding.connect(backer1).contribute(1, { value: ethers.utils.parseEther("1") });
  
        await ethers.provider.send("evm_increaseTime", [1001]);
        await ethers.provider.send("evm_mine");
  
        await crowdfunding.finalizeCampaign(1);
        const campaign = await crowdfunding.campaigns(1);
        expect(campaign.status).to.equal(2); // 2 = FAILED
    });
  });

  describe("Refunds", function () {
    it("Backer harus bisa mengambil kembali uang jika campaign gagal", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;
      await crowdfunding.connect(creator).createCampaign(GOAL, deadline, METADATA);

      const contribution = ethers.utils.parseEther("2");
      await crowdfunding.connect(backer1).contribute(1, { value: contribution });

      await ethers.provider.send("evm_increaseTime", [1001]);
      await ethers.provider.send("evm_mine");
      await crowdfunding.finalizeCampaign(1); // Status FAILED

      const initialBalance = await backer1.getBalance();
      await crowdfunding.connect(backer1).refund(1);
      const finalBalance = await backer1.getBalance();

      expect(finalBalance).to.be.gt(initialBalance);
      
      const userContribution = await crowdfunding.contributionsWei(1, backer1.address);
      expect(userContribution).to.equal(0);
    });
  });
});
