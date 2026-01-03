import { useEffect, useState } from 'react'
import { Heart, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { ethers } from 'ethers'

type CampaignListItem = {
  id: string
  title: string
  description: string
  raisedEth: number
  goalEth: number
  daysLeft: number
  badgeType: 'success' | 'warning' | 'error' | 'primary'
  badgeLabel: string
  imageUrl: string
  organizer: string
}

const statusMap: Record<string, { badgeType: CampaignListItem['badgeType']; badgeLabel: string }> = {
  ACTIVE: { badgeType: 'primary', badgeLabel: 'Active' },
  SUCCESS: { badgeType: 'success', badgeLabel: 'Funded' },
  FAILED: { badgeType: 'error', badgeLabel: 'Failed' },
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function formatAddress(address: string) {
  if (!address) return 'Unknown'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function CampaignListingPage() {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUCCESS' | 'FAILED'>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 9

  useEffect(() => {
    let active = true

    async function loadCampaigns() {
      setLoading(true)
      setError(null)
      try {
        const now = Math.floor(Date.now() / 1000)
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(limit))
        if (searchQuery.trim()) params.set('q', searchQuery.trim())
        if (statusFilter !== 'ALL') params.set('status', statusFilter)

        const resp = await fetch(`${API_BASE_URL}/api/v1/campaigns?${params.toString()}`)
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || 'Failed to load campaigns')
        }

        const data = await resp.json()
        const items: CampaignListItem[] = (data.items || []).map((c: any) => {
          const statusInfo = statusMap[c.status] || statusMap.ACTIVE
          const goalEth = Number(ethers.formatEther(c.goalWei))
          const raisedEth = Number(ethers.formatEther(c.totalRaisedWei))
          const daysLeft = Math.max(0, Math.ceil((Number(c.deadlineTs) - now) / 86400))
          const imageUrl = c.metadata?.image || `https://picsum.photos/seed/cause${c.campaignId}/800/600`

          return {
            id: String(c.campaignId),
            title: c.metadata?.title || `Campaign #${c.campaignId}`,
            description: c.metadata?.description || 'No description provided.',
            raisedEth,
            goalEth,
            daysLeft,
            badgeType: statusInfo.badgeType,
            badgeLabel: statusInfo.badgeLabel,
            imageUrl,
            organizer: formatAddress(c.creator),
          }
        })

        if (active) {
          setCampaigns(items)
          setTotalPages(Number(data.totalPages || 1))
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to load campaigns')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCampaigns()

    return () => {
      active = false
    }
  }, [page, searchQuery, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter])

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Explore Causes</h1>
        <p className="text-slate-500 text-lg">Find a project that resonates with you and make a direct impact today.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-12 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search for causes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button
            className={`px-4 py-2 rounded-lg font-medium shadow-sm whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-teal-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Causes
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium shadow-sm whitespace-nowrap ${
              statusFilter === 'ACTIVE'
                ? 'bg-teal-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Active
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium shadow-sm whitespace-nowrap ${
              statusFilter === 'SUCCESS'
                ? 'bg-teal-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => setStatusFilter('SUCCESS')}
          >
            Funded
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium shadow-sm whitespace-nowrap ${
              statusFilter === 'FAILED'
                ? 'bg-teal-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            onClick={() => setStatusFilter('FAILED')}
          >
            Failed
          </button>
        </div>
      </div>

      {loading && <div className="text-center text-slate-500">Loading campaigns...</div>}
      {error && <div className="text-center text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {campaigns.map((campaign) => {
              const percent = campaign.goalEth > 0 ? Math.min(100, Math.round((campaign.raisedEth / campaign.goalEth) * 100)) : 0

              return (
                <Link
                  key={campaign.id}
                  to="/campaigns/$campaignId"
                  params={{ campaignId: campaign.id }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
                >
                  <div className="h-56 overflow-hidden relative">
                    <img
                      src={campaign.imageUrl}
                      alt={campaign.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {percent >= 70 && (
                      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-teal-800 shadow-sm flex items-center gap-1">
                        <Heart size={12} className="fill-teal-700 text-teal-700" /> Trending
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge type={campaign.badgeType}>{campaign.badgeLabel}</Badge>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight group-hover:text-teal-700 transition-colors">
                      {campaign.title}
                    </h3>

                    <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">{campaign.description}</p>

                    <div className="mt-auto">
                      <div className="flex justify-between text-sm font-semibold mb-2">
                        <span className="text-slate-800">Raised {campaign.raisedEth.toLocaleString()} ETH</span>
                        <span className="text-slate-400">of {campaign.goalEth.toLocaleString()} ETH</span>
                      </div>
                      <ProgressBar percent={percent} />
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                            <img src={`https://picsum.photos/seed/avatar${campaign.id}/100/100`} alt="Avatar" />
                          </div>
                          <span className="text-xs text-slate-500">
                            by <strong>{campaign.organizer}</strong>
                          </span>
                        </div>
                        <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                          {campaign.daysLeft} Days left
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pb-12">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                <button
                  key={p}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    p === page ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
