export const contractABI = [
  // EVENTS
  "event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goalIDR, uint64 deadlineTs, string metadataCID)",
  "event ContributionReceived(uint256 indexed campaignId, address indexed contributor, uint256 amountWei, uint256 newTotalRaisedWei)",
  "event CampaignFinalized(uint256 indexed campaignId, uint8 status, uint256 totalRaisedWei, uint256 totalRaisedIDR, uint256 goalIDR)",
  "event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amountWei)",
  "event RefundIssued(uint256 indexed campaignId, address indexed contributor, uint256 amountWei)",
  "event OracleDataRequested(uint256 indexed campaignId, bytes32 indexed requestId, string dataKey, string param)",
  "event OracleDataUpdated(uint256 indexed campaignId, bytes32 indexed requestId, string dataKey, int256 value, uint64 updatedAt)",

  // FUNCTIONS
  "function createCampaign(uint256 goalIDR, uint64 deadlineTs, string metadataCID) external returns (uint256)",
  "function contribute(uint256 campaignId) external payable",
  "function requestOracleData(uint256 campaignId, string dataKey, string param) external returns (bytes32)",
  "function finalizeCampaign(uint256 campaignId) external",
  "function withdrawFunds(uint256 campaignId) external",
  "function refund(uint256 campaignId) external",

  // VIEWS
  "function campaignCount() external view returns (uint256)",
  "function oracleAddress() external view returns (address)",
  "function admin() external view returns (address)",
  "function ORACLE_STALENESS_THRESHOLD() external view returns (uint256)",

  "function campaigns(uint256 campaignId) external view returns (address creator, uint256 goalIDR, uint64 deadlineTs, uint256 totalRaisedWei, uint8 status, string metadataCID, bool withdrawn)",
  "function contributionsWei(uint256 campaignId, address contributor) external view returns (uint256)",
  "function campaignOracleData(uint256 campaignId) external view returns (int256 ethToIdrRate, uint64 updatedAt, bool fulfilled)",
  "function fulfilledRequests(bytes32 requestId) external view returns (bool)"
];
