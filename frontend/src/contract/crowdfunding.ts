import { ethers } from 'ethers'

export const CHAIN_ID = 31337
export const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'
export const CONTRACT_ADDRESS = import.meta.env.VITE_CROWDFUNDING_ADDRESS || ''

export const CROWDFUNDING_ABI = [
  'function createCampaign(uint256 _goalIDR, uint64 _deadlineTs, string _metadataCID) external returns (uint256)',
  // 'function campaignCount() view returns (uint256)',
  // 'function contribute(uint256 _campaignId) external payable',
  // 'function finalizeCampaign(uint256 _campaignId) external',
  // 'function withdrawFunds(uint256 _campaignId) external',
  // 'function refund(uint256 _campaignId) external',
]

export function getReadOnlyProvider() {
  return new ethers.JsonRpcProvider(RPC_URL)
}

export function getReadOnlyContract() {
  if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    throw new Error('Invalid contract address')
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CROWDFUNDING_ABI, getReadOnlyProvider())
}

  // 'function campaigns(uint256) view returns (address creator, uint256 goalWei, uint64 deadlineTs, uint256 totalRaisedWei, uint8 status, string metadataCID, bool withdrawn)',