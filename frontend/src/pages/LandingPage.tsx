import { ArrowRight, Calendar, Heart } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'

import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { featuredCauses, valueProps } from '../data/landing'
import { COLORS } from '../theme/colors'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="animate-in fade-in duration-500">
      <section className="relative overflow-hidden bg-teal-50 rounded-3xl mx-4 lg:mx-0 mb-16 px-6 py-16 lg:py-24 text-center lg:text-left">
        <div className="lg:max-w-2xl mx-auto lg:mx-0 relative z-10">
          <Badge type="primary" className="mb-6 inline-block">
            Trusted by 10,000+ Donors
          </Badge>
          <h1 className={`text-4xl lg:text-6xl font-bold mb-6 ${COLORS.textMain} leading-tight`}>
            Fund causes that <br />
            <span className="text-teal-700">matter to you.</span>
          </h1>
          <p
            className={`text-lg lg:text-xl ${COLORS.textMuted} mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0`}
          >
            Join a global community of changemakers. Direct, transparent donations to projects building a better
            future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button primary onClick={() => navigate({ to: '/campaigns' })}>
              Browse Causes <Heart size={18} className="fill-white/20" />
            </Button>
            <Button outline>How it Works</Button>
          </div>
        </div>

        <div className="hidden lg:block absolute right-0 top-0 h-full w-1/2">
          <img
            src="https://picsum.photos/seed/charityhero/800/800"
            alt="Community helping"
            className="w-full h-full object-cover mask-image-gradient opacity-90 rounded-l-3xl"
            style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}
          />
        </div>
      </section>

      <section className="py-12 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Why donate with us?</h2>
          <p className="text-slate-500">We prioritize transparency and impact above all else.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {valueProps.map((item) => (
            <div
              key={item.title}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-700">
                <item.icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
              <p className="text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 bg-slate-50 rounded-3xl mx-4 lg:mx-0 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-800">Featured Causes</h2>
              <p className="text-slate-500 mt-2">Urgent projects needing your support.</p>
            </div>
            <button
              onClick={() => navigate({ to: '/campaigns' })}
              className="text-teal-700 font-semibold hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredCauses.map((cause) => {
              const percent = Math.round((cause.raisedEth / cause.goalEth) * 100)

              return (
                <Link
                  key={cause.id}
                  to="/campaigns/$campaignId"
                  params={{ campaignId: cause.id }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={`https://picsum.photos/seed/${cause.imageSeed}/800/600`}
                      alt={cause.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge type="primary">{cause.category}</Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-teal-700 transition-colors">
                      {cause.title}
                    </h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{cause.summary}</p>

                    <div className="mb-2 flex justify-between text-sm font-medium">
                      <span className="text-teal-700">Raised: {cause.raisedEth} ETH</span>
                      <span className="text-slate-400">Goal: {cause.goalEth} ETH</span>
                    </div>
                    <ProgressBar percent={percent} />

                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> {cause.daysLeft} Days left
                      </span>
                      <span>{cause.donors} Donors</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
