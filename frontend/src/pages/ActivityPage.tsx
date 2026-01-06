import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { ethers } from 'ethers'
import { Link } from '@tanstack/react-router'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { CHAIN_ID, CONTRACT_ADDRESS, CROWDFUNDING_ABI } from '../contract/crowdfunding'
import { useWallet } from '../contexts/wallet'

type ContributionItem = {
  campaignId: string
  creator: string
  goalIdr: string
  deadlineTs: number
  totalRaisedWei: string
  status: string
  withdrawn: boolean
  metadata?: {
    cid?: string
    title?: string
    description?: string
    image?: string | null
  } | null
  contribution: {
    amountWei: string
    lastTxHash: string | null
    createdAt: string | null
    updatedAt: string | null
  }
}

const statusMap: Record<string, { label: string; badge: 'primary' | 'success' | 'error' | 'warning' }> = {
  ACTIVE: { label: 'Active', badge: 'primary' },
  SUCCESS: { label: 'Goal Reached', badge: 'success' },
  FAILED: { label: 'Ended', badge: 'error' },
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function ActivityPage() {
  const { walletAddress, setWalletAddress } = useWallet()
  const [items, setItems] = useState<ContributionItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [rate, setRate] = useState<number | null>(null)

  const loadContributions = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!walletAddress) return
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/v1/campaigns/contributions/by/${walletAddress}?page=${pageToLoad}&limit=5`
        )
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || 'Failed to load contributions')
        }
        const data = await resp.json()
        const nextItems = data.items || []
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems))
        setPage(Number(data.page || pageToLoad))
        setTotalPages(Number(data.totalPages || 1))
      } catch (err: any) {
        setError(err?.message || 'Failed to load contributions')
        if (!append) setItems([])
      } finally {
        setLoading(false)
      }
    },
    [walletAddress]
  )

  useEffect(() => {
    if (!walletAddress) {
      setItems([])
      return
    }
    loadContributions(1, false)
  }, [loadContributions, walletAddress])

  useEffect(() => {
    let active = true

    async function loadRate() {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/oracle/rate?pair=ETH_IDR`)
        if (!resp.ok) return
        const data = await resp.json()
        if (active && data?.available && data?.rate) {
          setRate(Number(data.rate))
        }
      } catch {}
    }

    loadRate()

    return () => {
      active = false
    }
  }, [])

  async function handleRefund(campaignId: string) {
    if (!window.ethereum) {
      alert('MetaMask not found')
      return
    }
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      alert('Invalid contract address')
      return
    }

    setRefundingId(campaignId)
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
      const tx = await contract.refund(Number(campaignId))
      await tx.wait()
      await loadContributions(1, false)
      alert('Refund successful')
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Refund failed')
    } finally {
      setRefundingId(null)
    }
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">My Contributions</h1>
      <p className="text-slate-500 mb-12">Track the impact of your donations and manage refunds.</p>

      {!walletAddress && <div className="text-slate-500">Connect your wallet to see your contributions.</div>}

      {walletAddress && (
        <>
          {loading && <div className="text-slate-500">Loading contributions...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && !error && items.length === 0 && (
            <div className="text-slate-500">No contributions found.</div>
          )}

          <div className="space-y-6">
            {items.map((item) => {
              const statusInfo = statusMap[item.status] || statusMap.ACTIVE
              const amountEth = Number(ethers.formatEther(item.contribution.amountWei || '0'))
              const amountIdr = rate ? amountEth * rate : null
              const donatedAt = item.contribution.updatedAt || item.contribution.createdAt
              const dateLabel = donatedAt ? new Date(donatedAt).toLocaleDateString() : 'Unknown date'
              const imageUrl =
                item.metadata?.image || `https://picsum.photos/seed/contrib${item.campaignId}/400/300`
              const canRefund = item.status === 'FAILED' && amountEth > 0

              return (
                <Link
                  key={`${item.campaignId}-${item.contribution.lastTxHash || 'tx'}`}
                  to="/campaigns/$campaignId"
                  params={{ campaignId: String(item.campaignId) }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow"
                >
                  <div className="w-full md:w-48 h-32 md:h-auto bg-slate-100 shrink-0">
                    <img src={imageUrl} className="w-full h-full object-cover" alt={item.metadata?.title || 'Campaign'} />
                  </div>

                  <div className="p-6 flex-grow flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-slate-800">
                        {item.metadata?.title || `Campaign #${item.campaignId}`}
                      </h3>
                      <Badge type={statusInfo.badge}>{statusInfo.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">Donated on {dateLabel}</p>

                    <div className="flex items-center gap-6">
                      <div>
                        <span className="block text-xs uppercase tracking-wide text-slate-400 font-bold">Amount</span>
                        <span className="block font-bold text-slate-800">
                          {amountIdr !== null ? `${amountIdr.toLocaleString()} IDR` : `${amountEth.toLocaleString()} ETH`}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-slate-100"></div>
                      {item.status === 'FAILED' ? (
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-amber-500" />
                          <span className="text-sm text-slate-600">Goal not met.</span>
                          {canRefund && (
                            <button
                              className="text-teal-700 font-bold text-sm underline hover:no-underline ml-2"
                              onClick={(event) => {
                                event.preventDefault()
                                handleRefund(item.campaignId)
                              }}
                              disabled={refundingId === item.campaignId}
                            >
                              {refundingId === item.campaignId ? 'Refunding...' : 'Get Refund'}
                            </button>
                          )}
                          {!canRefund && <span className="text-sm text-slate-500 ml-2">Refunded</span>}
                        </div>
                      ) : (
                        <div>
                          <span className="block text-xs uppercase tracking-wide text-slate-400 font-bold">Status</span>
                          <span className="block font-medium text-teal-700">Funds released to project</span>
                        </div>
                      )}
                    </div>
                  </div>

                </Link>
              )
            })}
          </div>

          {page < totalPages && (
            <div className="mt-6">
              <Button outline className="w-full" onClick={() => loadContributions(page + 1, true)} disabled={loading}>
                {loading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
