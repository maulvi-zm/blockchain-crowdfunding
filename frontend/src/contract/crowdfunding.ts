import { ethers } from "ethers";

export const CHAIN_ID = 31337;
export const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
export const CONTRACT_ADDRESS = import.meta.env.VITE_CROWDFUNDING_ADDRESS || "";

export const CROWDFUNDING_ABI = [
    "function createCampaign(uint256 _goalIdr, uint64 _deadlineTs, string _metadataCID) external returns (uint256)",
    "function campaignCount() view returns (uint256)",
    "function campaigns(uint256) view returns (address creator, uint256 goalIdr, uint64 deadlineTs, uint256 totalRaisedWei, uint8 status, string metadataCID, bool withdrawn)",
    "function contribute(uint256 _campaignId) external payable",
    "function finalizeCampaign(uint256 _campaignId) external",
    "function withdrawFunds(uint256 _campaignId) external",
    "function refund(uint256 _campaignId) external",
    "function requestOracleData(uint256 _campaignId, string _dataKey, string _param) external returns (bytes32)",
    "function latestEthIdrRateScaled() external view returns (uint256)",
    "function campaignEthIdrRateScaled(uint256) external view returns (uint256)",
    "event OracleDataRequested(uint256 indexed campaignId, bytes32 indexed requestId, string dataKey, string param)",
    "event OracleDataUpdated(uint256 indexed campaignId, bytes32 indexed requestId, string dataKey, uint256 value, uint64 updatedAt)",
];

export function getReadOnlyProvider() {
    return new ethers.JsonRpcProvider(RPC_URL);
}

export function getReadOnlyContract() {
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
        throw new Error("Invalid contract address");
    }
    return new ethers.Contract(
        CONTRACT_ADDRESS,
        CROWDFUNDING_ABI,
        getReadOnlyProvider(),
    );
}
