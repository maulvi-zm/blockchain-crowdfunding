export const contractABI = [
  // Events
  "event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goalIDR, uint64 deadlineTs, string metadataCID)",
  "event ContributionReceived(uint256 indexed campaignId, address indexed contributor, uint256 amountWei, uint256 newTotalRaisedWei)",
  "event CampaignFinalized(uint256 indexed campaignId, uint8 status, uint256 totalRaisedWei, uint256 goalWei)",
  "event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amountWei)",
  "event RefundIssued(uint256 indexed campaignId, address indexed contributor, uint256 amountWei)",
  "event OracleDataRequested(uint256 indexed campaignId, bytes32 indexed requestId, string dataKey, string param)",
  "event OracleDataUpdated(uint256 indexed campaignId, bytes32 indexed requestId, string dataKey, int256 value, uint64 updatedAt)",
  
  // Read functions
  "function getCampaign(uint256 campaignId) external view returns (address creator, uint256 goalWei, uint64 deadlineTs, uint256 totalRaisedWei, uint8 status, string memory metadataCID, bool withdrawn)",
  "function getContribution(uint256 campaignId, address contributor) external view returns (uint256 amountWei)",
  "function campaignCount() external view returns (uint256)",
  "function oracleAddress() external view returns (address)"
];