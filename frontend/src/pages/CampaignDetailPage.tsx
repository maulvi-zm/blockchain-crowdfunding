import { Globe, Shield, User } from 'lucide-react'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'

export function CampaignDetailPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="w-full h-[400px] relative">
        <img src="https://picsum.photos/seed/detail99/1600/900" alt="Detail Hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 lg:p-12 text-white">
          <div className="max-w-7xl mx-auto">
            <Badge type="primary" className="mb-4 bg-teal-600 text-white border-none">
              Disaster Relief
            </Badge>
            <h1 className="text-3xl lg:text-5xl font-bold mb-4 shadow-sm">Emergency Housing for Flood Victims</h1>
            <div className="flex items-center gap-4 text-sm lg:text-base opacity-90">
              <span className="flex items-center gap-2">
                <User size={16} /> Organized by <strong>Global Relief Foundation</strong>
              </span>
              <span className="hidden lg:inline">•</span>
              <span className="flex items-center gap-2">
                <Globe size={16} /> Jakarta, Indonesia
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex gap-8 border-b border-slate-200 pb-1 overflow-x-auto">
            <button className="text-teal-700 font-bold border-b-2 border-teal-700 pb-3 px-1">Our Story</button>
            <button className="text-slate-500 font-medium pb-3 px-1 hover:text-slate-800">Updates (3)</button>
            <button className="text-slate-500 font-medium pb-3 px-1 hover:text-slate-800">Donors</button>
          </div>

          <div className="prose prose-lg text-slate-600 max-w-none">
            <h3 className="text-2xl font-bold text-slate-800 mb-4">Why this matters</h3>
            <p>
              Recent floods have displaced over 500 families in the region. While immediate aid has arrived, there is
              a critical lack of temporary shelter. This project aims to build 50 modular housing units that can be
              deployed within 48 hours.
            </p>
            <p>
              We are working directly with local contractors and using sustainable materials. Your donation goes
              directly to the procurement of materials and labor. Because we use blockchain technology, you can verify
              exactly when funds are released and how they are spent.
            </p>

            <div className="bg-teal-50 p-6 rounded-xl border border-teal-100 my-8 flex gap-4">
              <Shield className="text-teal-700 shrink-0" size={32} />
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Guaranteed Transparency</h4>
                <p className="text-sm text-slate-500">
                  Funds are held in a smart contract and only released in stages as construction milestones are verified
                  by independent auditors.
                </p>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-4">Budget Breakdown</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Materials (60%):</strong> Sustainable timber, insulation, and roofing.
              </li>
              <li>
                <strong>Labor (30%):</strong> Local employment for affected residents.
              </li>
              <li>
                <strong>Logistics (10%):</strong> Transport and assembly.
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-4xl font-bold text-slate-800">14.2 ETH</span>
                <span className="text-slate-500 font-medium mb-1">raised of 20.0 ETH</span>
              </div>
              <ProgressBar percent={71} />
              <div className="flex justify-between mt-3 text-sm text-slate-500">
                <span>248 Donations</span>
                <span className="text-teal-700 font-semibold">12 Days Left</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Enter donation amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.1"
                    className="w-full pl-4 pr-16 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg font-bold text-slate-800"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">ETH</span>
                </div>
              </div>

              <Button primary className="w-full text-lg shadow-lg shadow-teal-700/20">
                Donate Now
              </Button>

              <p className="text-xs text-center text-slate-400 leading-relaxed">
                Your donation is refundable if the campaign does not reach its minimum goal by the deadline.
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                  JD
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">John Doe</p>
                  <p className="text-xs text-slate-500">Donated 0.5 ETH • 2 mins ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
