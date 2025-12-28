// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Crowdfunding is ReentrancyGuard {
    enum CampaignStatus { ACTIVE, SUCCESS, FAILED }

    struct Campaign {
        address creator;
        uint256 goalWei;
        uint64 deadlineTs;
        uint256 totalRaisedWei;
        CampaignStatus status;
        string metadataCID; // IPFS CID
        bool withdrawn;
    }

    // State Variables
    uint256 public campaignCount;
    address public admin;
    address public oracleAddress;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributionsWei;
    mapping(uint256 => int256) public campaignOracleValue; // e.g., Rate ETH_IDR
    mapping(bytes32 => bool) public fulfilledRequests;

    // Events
    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goalWei, uint64 deadlineTs, string metadataCID);
    event ContributionReceived(uint256 indexed campaignId, address indexed contributor, uint256 amountWei, uint256 newTotalRaisedWei);
    event CampaignFinalized(uint256 indexed campaignId, CampaignStatus status, uint256 totalRaisedWei, uint256 goalWei);
    event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amountWei);
    event RefundIssued(uint256 indexed campaignId, address indexed contributor, uint256 amountWei);
    
    // Oracle Events
    event OracleDataRequested(uint256 indexed campaignId, bytes32 indexed requestId, string dataKey, string param);
    event OracleDataUpdated(uint256 indexed campaignId, bytes32 indexed requestId, string dataKey, int256 value, uint64 updatedAt);

    constructor(address _oracleAddress) {
        admin = msg.sender;
        oracleAddress = _oracleAddress;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "ONLY_ADMIN");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "ONLY_ORACLE");
        _;
    }

    // SC-FN-01: Create Campaign
    function createCampaign(uint256 _goalWei, uint64 _deadlineTs, string calldata _metadataCID) external returns (uint256) {
        require(_goalWei > 0, "GOAL_ZERO");
        require(_deadlineTs > block.timestamp, "INVALID_DEADLINE");
        require(bytes(_metadataCID).length > 0, "EMPTY_CID");

        uint256 campaignId = ++campaignCount;
        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            goalWei: _goalWei,
            deadlineTs: _deadlineTs,
            totalRaisedWei: 0,
            status: CampaignStatus.ACTIVE,
            metadataCID: _metadataCID,
            withdrawn: false
        });

        emit CampaignCreated(campaignId, msg.sender, _goalWei, _deadlineTs, _metadataCID);
        return campaignId;
    }

    // SC-FN-02: Contribute
    function contribute(uint256 _campaignId) external payable nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.ACTIVE, "NOT_ACTIVE");
        require(block.timestamp < c.deadlineTs, "DEADLINE_PASSED");
        require(msg.value > 0, "VALUE_ZERO");

        contributionsWei[_campaignId][msg.sender] += msg.value;
        c.totalRaisedWei += msg.value;

        emit ContributionReceived(_campaignId, msg.sender, msg.value, c.totalRaisedWei);
    }

    // SC-FN-06: Request Oracle Data (Internal/FE trigger)
    function requestOracleData(uint256 _campaignId, string calldata _dataKey, string calldata _param) external returns (bytes32) {
        require(campaigns[_campaignId].creator != address(0), "NOT_FOUND");
        
        bytes32 requestId = keccak256(abi.encodePacked(_campaignId, _dataKey, block.timestamp, msg.sender));
        emit OracleDataRequested(_campaignId, requestId, _dataKey, _param);
        return requestId;
    }

    // SC-FN-07: Oracle Callback (Hanya bisa dipanggil Oracle Service)
    function oracleCallback(uint256 _campaignId, bytes32 _requestId, string calldata _dataKey, int256 _value, uint64 _updatedAt) external onlyOracle {
        require(!fulfilledRequests[_requestId], "ALREADY_FULFILLED");
        
        fulfilledRequests[_requestId] = true;
        campaignOracleValue[_campaignId] = _value;

        emit OracleDataUpdated(_campaignId, _requestId, _dataKey, _value, _updatedAt);
    }

    // SC-FN-03: Finalize Campaign
    function finalizeCampaign(uint256 _campaignId) external {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.ACTIVE, "NOT_ACTIVE");
        require(block.timestamp >= c.deadlineTs, "DEADLINE_NOT_REACHED");

        if (c.totalRaisedWei >= c.goalWei) {
            c.status = CampaignStatus.SUCCESS;
        } else {
            c.status = CampaignStatus.FAILED;
        }

        emit CampaignFinalized(_campaignId, c.status, c.totalRaisedWei, c.goalWei);
    }

    // SC-FN-04: Withdraw Funds (Creator Only)
    function withdrawFunds(uint256 _campaignId) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.creator, "NOT_CREATOR");
        require(c.status == CampaignStatus.SUCCESS, "NOT_SUCCESS");
        require(!c.withdrawn, "ALREADY_WITHDRAWN");

        uint256 amount = c.totalRaisedWei;
        c.withdrawn = true;
        
        (bool sent, ) = payable(c.creator).call{value: amount}("");
        require(sent, "TRANSFER_FAILED");

        emit FundsWithdrawn(_campaignId, c.creator, amount);
    }

    // SC-FN-05: Refund (Backers Only)
    function refund(uint256 _campaignId) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.FAILED, "NOT_FAILED");
        
        uint256 amount = contributionsWei[_campaignId][msg.sender];
        require(amount > 0, "NO_CONTRIBUTION");

        contributionsWei[_campaignId][msg.sender] = 0;
        
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "TRANSFER_FAILED");

        emit RefundIssued(_campaignId, msg.sender, amount);
    }

    function setOracle(address _newOracle) external onlyAdmin {
        oracleAddress = _newOracle;
    }
}
