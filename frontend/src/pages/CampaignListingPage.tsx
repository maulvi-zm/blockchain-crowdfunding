import { Heart, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { campaigns } from '../data/campaigns'

export function CampaignListingPage() {
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
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button className="px-4 py-2 bg-teal-700 text-white rounded-lg font-medium shadow-sm whitespace-nowrap">
            All Causes
          </button>
          <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 whitespace-nowrap">
            Education
          </button>
          <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 whitespace-nowrap">
            Environment
          </button>
          <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 whitespace-nowrap">
            Medical
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {campaigns.map((campaign) => {
          const percent = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100))

          return (
            <Link
              key={campaign.id}
              to="/campaigns/$campaignId"
              params={{ campaignId: campaign.id }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="h-56 overflow-hidden relative">
                <img
                  src={`https://picsum.photos/seed/${campaign.imageSeed}/800/600`}
                  alt={campaign.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {campaign.isTrending && (
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
                    <span className="text-slate-800">Raised ${campaign.raised.toLocaleString()}</span>
                    <span className="text-slate-400">of ${campaign.goal.toLocaleString()}</span>
                  </div>
                  <ProgressBar percent={percent} />
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                        <img src={`https://picsum.photos/seed/${campaign.avatarSeed}/100/100`} alt="Avatar" />
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
    </div>
  )
}
