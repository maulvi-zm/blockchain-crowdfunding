import { Button } from '../components/ui/Button'

export function CreateCampaignPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Start a Fundraiser</h1>
        <p className="text-slate-500 text-lg">Tell your story and connect with donors who care.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 lg:p-12">
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm">
                1
              </span>
              Cause Details
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Campaign Title</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Help rebuild the community center"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Why are you raising funds?</label>
                <textarea
                  rows={4}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Tell your story clearly and honestly..."
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm">
                2
              </span>
              Goal & Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Fundraising Goal</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full pl-4 pr-12 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ETH</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Campaign Duration</label>
                <select className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white">
                  <option>30 Days</option>
                  <option>60 Days</option>
                  <option>90 Days</option>
                </select>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm">
                3
              </span>
              Photo
            </h3>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-colors">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4 text-teal-600">
                <span className="text-2xl">+</span>
              </div>
              <span className="font-semibold text-slate-700">Upload a cover photo</span>
              <span className="text-sm text-slate-400 mt-2">A high-quality image helps build trust.</span>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button primary className="w-full md:w-auto px-12 py-4 text-lg">
              Launch Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
