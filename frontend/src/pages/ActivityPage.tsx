import { AlertCircle } from 'lucide-react'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { contributions } from '../data/activities'

const statusMap = {
  active: { label: 'Active', badge: 'primary' },
  success: { label: 'Goal Reached', badge: 'success' },
  ended: { label: 'Ended', badge: 'error' },
} as const

export function ActivityPage() {
  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">My Contributions</h1>
      <p className="text-slate-500 mb-12">Track the impact of your donations and manage refunds.</p>

      <div className="space-y-6">
        {contributions.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row"
          >
            <div className="w-full md:w-48 h-32 md:h-auto bg-slate-100 shrink-0">
              <img
                src={`https://picsum.photos/seed/${item.imageSeed}/400/300`}
                className="w-full h-full object-cover"
                alt={item.title}
              />
            </div>

            <div className="p-6 flex-grow flex flex-col justify-center">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                <Badge type={statusMap[item.status].badge}>{statusMap[item.status].label}</Badge>
              </div>
              <p className="text-sm text-slate-500 mb-4">Donated on {item.date}</p>

              <div className="flex items-center gap-6">
                <div>
                  <span className="block text-xs uppercase tracking-wide text-slate-400 font-bold">Amount</span>
                  <span className="block font-bold text-slate-800">{item.amountEth} ETH</span>
                </div>
                <div className="h-8 w-px bg-slate-100"></div>
                {item.status === 'ended' ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500" />
                    <span className="text-sm text-slate-600">Goal not met.</span>
                    <button className="text-teal-700 font-bold text-sm underline hover:no-underline ml-2">
                      Get Refund
                    </button>
                  </div>
                ) : (
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-slate-400 font-bold">Status</span>
                    <span className="block font-medium text-teal-700">Funds released to project</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t md:border-t-0 md:border-l border-slate-100 flex items-center justify-center bg-slate-50 md:bg-white md:w-40">
              <Button outline className="w-full text-xs">
                View Receipt
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
