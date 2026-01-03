import { useCallback, useEffect, useState } from 'react'
import { Globe, Shield, User } from 'lucide-react'
import { useParams } from '@tanstack/react-router'
import { ethers } from 'ethers'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { CHAIN_ID, CONTRACT_ADDRESS, CROWDFUNDING_ABI } from '../contract/crowdfunding'
import { useWallet } from '../contexts/wallet'

type CampaignApiData = {
  campaignId: string
  creator: string
  goalWei: string
  deadlineTs: number
  totalRaisedWei: string
  status: string
  metadata?: {
    cid?: string
    title?: string
    description?: string
    image?: string | null
  } | null
  withdrawn: boolean
}

type UserContribution = {
  amountWei: string
  lastTxHash: string | null
  updatedAt: string | null
}

type ContributionItem = {
  address: string
  amountWei: string
  lastTxHash: string | null
  createdAt: string | null
  updatedAt: string | null
}

const statusLabel: Record<string, string> = {
  ACTIVE: 'Active',
  SUCCESS: 'Funded',
  FAILED: 'Failed',
}

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'primary'> = {
  ACTIVE: 'primary',
  SUCCESS: 'success',
  FAILED: 'error',
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function formatAddress(address: string) {
  if (!address) return 'Unknown'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function CampaignDetailPage() {
  const { campaignId } = useParams({ from: '/campaigns/$campaignId' })
  const { walletAddress, setWalletAddress } = useWallet()
  const [campaign, setCampaign] = useState<CampaignApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [donationAmount, setDonationAmount] = useState('')
  const [donating, setDonating] = useState(false)
  const [actionLoading, setActionLoading] = useState<'finalize' | 'withdraw' | 'refund' | null>(null)
  const [activeTab, setActiveTab] = useState<'story' | 'donors'>('story')
  const [userContribution, setUserContribution] = useState<UserContribution>({
    amountWei: '0',
    lastTxHash: null,
    updatedAt: null,
  })
  const [contributors, setContributors] = useState<ContributionItem[]>([])
  const [contributorsPage, setContributorsPage] = useState(1)
  const [contributorsTotalPages, setContributorsTotalPages] = useState(1)
  const [contributorsLoading, setContributorsLoading] = useState(false)

  const loadUserContribution = useCallback(
    async (address: string | null) => {
      const id = Number(campaignId)
      if (!Number.isFinite(id) || id <= 0) return

      if (!address) {
        setUserContribution({ amountWei: '0', lastTxHash: null, updatedAt: null })
        return
      }

      try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/campaigns/${id}/contributions/${address}`)
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || 'Failed to load contribution')
        }
        const data = await resp.json()
        setUserContribution({
          amountWei: data.amountWei || '0',
          lastTxHash: data.lastTxHash || null,
          updatedAt: data.updatedAt || null,
        })
      } catch {
        setUserContribution({ amountWei: '0', lastTxHash: null, updatedAt: null })
      }
    },
    [campaignId]
  )

  const loadCampaign = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      setError(null)
      try {
        const id = Number(campaignId)
        if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid campaign id')
        const resp = await fetch(`${API_BASE_URL}/api/v1/campaigns/${id}`)
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || 'Failed to load campaign')
        }
        const data = await resp.json()
        setCampaign(data)
      } catch (err: any) {
        setError(err?.message || 'Failed to load campaign')
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [campaignId]
  )

  useEffect(() => {
    loadCampaign(true)
  }, [loadCampaign])

  useEffect(() => {
    loadUserContribution(walletAddress || null)
  }, [campaignId, loadUserContribution, walletAddress])

  const loadContributors = useCallback(
    async (pageToLoad: number, append: boolean) => {
      const id = Number(campaignId)
      if (!Number.isFinite(id) || id <= 0) return

      setContributorsLoading(true)
      try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/campaigns/${id}/contributions?page=${pageToLoad}&limit=5`)
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || 'Failed to load contributions')
        }
        const data = await resp.json()
        const nextItems = (data.contributions || []).map((c: any) => ({
          address: c.address,
          amountWei: c.amountWei,
          lastTxHash: c.lastTxHash || null,
          createdAt: c.createdAt || null,
          updatedAt: c.updatedAt || null,
        }))

        setContributors((prev) => (append ? [...prev, ...nextItems] : nextItems))
        setContributorsPage(Number(data.page || pageToLoad))
        setContributorsTotalPages(Number(data.totalPages || 1))
      } catch {
        if (!append) setContributors([])
      } finally {
        setContributorsLoading(false)
      }
    },
    [campaignId]
  )

  useEffect(() => {
    loadContributors(1, false)
  }, [loadContributors])

  async function handleDonate() {
    if (!window.ethereum) {
      alert('MetaMask not found')
      return
    }
    const amount = Number(donationAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      alert('Invalid contract address')
      return
    }

    setDonating(true)
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      const connectedAddress = accounts?.[0] ?? null
      setWalletAddress(connectedAddress)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()

      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7A69' }],
          })
        } catch (err) {
          alert('Please add & select Hardhat network in MetaMask')
          return
        }
      }

      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CROWDFUNDING_ABI, signer)
      const tx = await contract.contribute(Number(campaignId), {
        value: ethers.parseEther(donationAmount),
      })
      await tx.wait()
      await loadCampaign(false)
      await loadContributors(1, false)
      await loadUserContribution(connectedAddress)
      setDonationAmount('')
      alert('Donation successful')
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Transaction failed')
    } finally {
      setDonating(false)
    }
  }

  async function handleFinalize() {
    if (!window.ethereum) {
      alert('MetaMask not found')
      return
    }
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      alert('Invalid contract address')
      return
    }

    setActionLoading('finalize')
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      setWalletAddress(accounts?.[0] ?? null)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()

      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7A69' }],
          })
        } catch (err) {
          alert('Please add & select Hardhat network in MetaMask')
          return
        }
      }

      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CROWDFUNDING_ABI, signer)
      const tx = await contract.finalizeCampaign(Number(campaignId))
      await tx.wait()
      await loadCampaign(false)
      alert('Campaign finalized')
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Transaction failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleWithdraw() {
    if (!window.ethereum) {
      alert('MetaMask not found')
      return
    }
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      alert('Invalid contract address')
      return
    }

    setActionLoading('withdraw')
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      setWalletAddress(accounts?.[0] ?? null)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()

      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7A69' }],
          })
        } catch (err) {
          alert('Please add & select Hardhat network in MetaMask')
          return
        }
      }

      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CROWDFUNDING_ABI, signer)
      const tx = await contract.withdrawFunds(Number(campaignId))
      await tx.wait()
      await loadCampaign(false)
      alert('Funds withdrawn')
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Transaction failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRefund() {
    if (!window.ethereum) {
      alert('MetaMask not found')
      return
    }
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      alert('Invalid contract address')
      return
    }

    setActionLoading('refund')
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      setWalletAddress(accounts?.[0] ?? null)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()

      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7A69' }],
          })
        } catch (err) {
          alert('Please add & select Hardhat network in MetaMask')
          return
        }
      }

      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CROWDFUNDING_ABI, signer)
      const tx = await contract.refund(Number(campaignId))
      await tx.wait()
      await loadCampaign(false)
      alert('Refund processed')
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Transaction failed')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-500 py-12">Loading campaign...</div>
  }

  if (error || !campaign) {
    return <div className="text-center text-red-600 py-12">{error || 'Campaign not found'}</div>
  }

  const goalEth = Number(ethers.formatEther(campaign.goalWei))
  const raisedEth = Number(ethers.formatEther(campaign.totalRaisedWei))
  const percent = goalEth > 0 ? Math.min(100, Math.round((raisedEth / goalEth) * 100)) : 0
  const now = Math.floor(Date.now() / 1000)
  const daysLeft = Math.max(0, Math.ceil((Number(campaign.deadlineTs) - now) / 86400))
  const deadlineLabel = new Date(Number(campaign.deadlineTs) * 1000).toLocaleString()
  const imageUrl = campaign.metadata?.image || 'https://picsum.photos/seed/detail99/1600/900'
  const title = campaign.metadata?.title || `Campaign #${campaignId}`
  const description = campaign.metadata?.description || 'No description provided.'
  const userContributionEth = Number(ethers.formatEther(userContribution.amountWei || '0'))

  const walletConnected = Boolean(walletAddress)
  const deadlinePassed = Number(campaign.deadlineTs) <= now
  const isCreator =
    walletConnected && campaign.creator.toLowerCase() === (walletAddress || '').toLowerCase()
  const canFinalize = campaign.status === 'ACTIVE' && deadlinePassed
  const canWithdraw = campaign.status === 'SUCCESS' && isCreator && !campaign.withdrawn
  const hasContribution = BigInt(userContribution.amountWei || '0') > 0n
  const canRefund = campaign.status === 'FAILED' && hasContribution
  const canDonate = walletConnected && campaign.status === 'ACTIVE' && !deadlinePassed

  return (
    <div className="animate-in fade-in duration-500">
      <div className="w-full h-[400px] relative">
        <img src={imageUrl} alt="Detail Hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 lg:p-12 text-white">
          <div className="max-w-7xl mx-auto">
            <Badge type={statusBadge[campaign.status] || 'primary'} className="mb-4 bg-teal-600 text-white border-none">
              {statusLabel[campaign.status] || 'Active'}
            </Badge>
            <h1 className="text-3xl lg:text-5xl font-bold mb-4 shadow-sm">{title}</h1>
            <div className="flex items-center gap-4 text-sm lg:text-base opacity-90">
              <span className="flex items-center gap-2">
                <User size={16} /> Organized by <strong>{formatAddress(campaign.creator)}</strong>
              </span>
              <span className="hidden lg:inline">•</span>
              <span className="flex items-center gap-2">
                <Globe size={16} /> On-chain campaign
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex gap-8 border-b border-slate-200 pb-1 overflow-x-auto">
            <button
              className={
                activeTab === 'story'
                  ? 'text-teal-700 font-bold border-b-2 border-teal-700 pb-3 px-1'
                  : 'text-slate-500 font-medium pb-3 px-1 hover:text-slate-800'
              }
              onClick={() => setActiveTab('story')}
            >
              Our Story
            </button>
            <button
              className={
                activeTab === 'donors'
                  ? 'text-teal-700 font-bold border-b-2 border-teal-700 pb-3 px-1'
                  : 'text-slate-500 font-medium pb-3 px-1 hover:text-slate-800'
              }
              onClick={() => setActiveTab('donors')}
            >
              Donors
            </button>
          </div>

          {activeTab === 'story' ? (
            <div className="prose prose-lg text-slate-600 max-w-none">
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Why this matters</h3>
              <p>{description}</p>

              <div className="bg-teal-50 p-6 rounded-xl border border-teal-100 my-8 flex gap-4">
                <Shield className="text-teal-700 shrink-0" size={32} />
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Guaranteed Transparency</h4>
                  <p className="text-sm text-slate-500">
                    Funds are held in a smart contract and only released when campaign goals are met.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-lg font-bold text-slate-800">Recent donations</div>
              {contributors.length === 0 && !contributorsLoading ? (
                <div className="text-sm text-slate-500">No donations yet.</div>
              ) : (
                <div className="space-y-3">
                  {contributors.map((c, idx) => {
                    const amountEth = Number(ethers.formatEther(c.amountWei || '0'))
                    return (
                      <div key={`${c.address}-${idx}`} className="flex justify-between text-sm text-slate-600">
                        <span>{formatAddress(c.address)}</span>
                        <span className="font-semibold text-slate-800">{amountEth.toLocaleString()} ETH</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {contributorsPage < contributorsTotalPages && (
                <Button
                  outline
                  className="w-full mt-2 text-xs"
                  onClick={() => loadContributors(contributorsPage + 1, true)}
                  disabled={contributorsLoading}
                >
                  {contributorsLoading ? 'Loading...' : 'Load more'}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-4xl font-bold text-slate-800">{raisedEth.toLocaleString()} ETH</span>
                <span className="text-slate-500 font-medium mb-1">raised of {goalEth.toLocaleString()} ETH</span>
              </div>
              <ProgressBar percent={percent} />
              <div className="flex justify-between mt-3 text-sm text-slate-500">
                <span>— Donations</span>
                <span className="text-teal-700 font-semibold">{daysLeft} Days Left</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Donation ends: {deadlineLabel}
              </div>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-sm font-semibold text-slate-600 mb-2">Your contribution</div>
              <div className="text-2xl font-bold text-slate-800">{userContributionEth.toLocaleString()} ETH</div>
              {walletConnected ? (
                <div className="text-xs text-slate-500 mt-1">
                  {userContributionEth > 0 ? 'Thanks for supporting this campaign.' : 'You have not contributed yet.'}
                </div>
              ) : (
                <div className="text-xs text-slate-500 mt-1">Connect your wallet to track your contribution.</div>
              )}
            </div>

            <div className="space-y-4">
              {walletConnected && canDonate && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Enter donation amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.1"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      className="w-full pl-4 pr-16 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg font-bold text-slate-800"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">ETH</span>
                  </div>
                </div>
              )}

              {walletConnected ? (
                canDonate ? (
                  <Button primary className="w-full text-lg shadow-lg shadow-teal-700/20" onClick={handleDonate} disabled={donating}>
                    Donate Now
                  </Button>
                ) : (
                  <div className="text-center text-sm text-slate-500">Donations are closed for this campaign.</div>
                )
              ) : (
                <div className="text-center text-sm text-slate-500">Connect your wallet to donate.</div>
              )}

              <p className="text-xs text-center text-slate-400 leading-relaxed">
                Your donation is refundable if the campaign does not reach its minimum goal by the deadline.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="text-sm font-semibold text-slate-600 mb-3">Campaign actions</div>
              {walletConnected ? (
                <div className="flex flex-col gap-3">
                  {canFinalize && (
                    <Button outline onClick={handleFinalize} disabled={actionLoading === 'finalize'}>
                      Finalize Campaign
                    </Button>
                  )}
                  {canWithdraw && (
                    <Button outline onClick={handleWithdraw} disabled={actionLoading === 'withdraw'}>
                      Withdraw Funds
                    </Button>
                  )}
                  {canRefund && (
                    <Button outline onClick={handleRefund} disabled={actionLoading === 'refund'}>
                      Request Refund
                    </Button>
                  )}
                  {campaign.status === 'SUCCESS' && campaign.withdrawn && (
                    <div className="text-xs text-slate-400 text-center">Funds already withdrawn</div>
                  )}
                  {!canFinalize && !canWithdraw && !canRefund && !(campaign.status === 'SUCCESS' && campaign.withdrawn) && (
                    <div className="text-xs text-slate-400 text-center">No actions available.</div>
                  )}
                </div>
              ) : (
                <div className="text-center text-sm text-slate-500">Connect your wallet to manage this campaign.</div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
