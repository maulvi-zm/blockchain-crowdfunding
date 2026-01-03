import { useEffect, useState } from 'react'
import { Heart, Menu, X } from 'lucide-react'
import { Link, Outlet } from '@tanstack/react-router'

import { Button } from '../ui/Button'
import { WalletContext } from '../../contexts/wallet'

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  const formattedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : ''

  async function connectWallet() {
    if (!window.ethereum) {
      alert('MetaMask not found')
      return
    }
    const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
    setWalletAddress(accounts?.[0] ?? null)
  }

  const NavLink = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      className="text-sm font-medium transition-colors hover:text-teal-700 text-slate-600"
      activeProps={{ className: 'text-teal-700 font-bold' }}
      onClick={() => setMobileMenuOpen(false)}
    >
      {label}
    </Link>
  )

  useEffect(() => {
    if (!window.ethereum) return
    const handleAccountsChanged = (accounts: string[]) => {
      setWalletAddress(accounts?.[0] ?? null)
    }
    window.ethereum.request({ method: 'eth_accounts' }).then(handleAccountsChanged).catch(() => {})
    if (window.ethereum.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [])

  return (
    <WalletContext.Provider value={{ walletAddress, setWalletAddress }}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900 pb-20">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Heart fill="currentColor" size={20} />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              Kindred<span className="text-teal-700">.</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/campaigns" label="Browse Causes" />
            <NavLink to="/create" label="Start a Fundraiser" />
            <NavLink to="/activity" label="My Contributions" />
          </div>

          <div className="hidden md:flex items-center gap-4">
            {walletAddress ? (
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-700">{formattedAddress}</span>
              </div>
            ) : (
              <Button primary onClick={connectWallet} className="px-6 py-2 text-sm shadow-teal-200">
                Connect to Donate
              </Button>
            )}
          </div>

          <button className="md:hidden text-slate-600 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-white p-6 flex flex-col gap-6 md:hidden animate-in slide-in-from-right-10">
          <NavLink to="/campaigns" label="Browse Causes" />
          <NavLink to="/create" label="Start a Fundraiser" />
          <NavLink to="/activity" label="My Contributions" />
          <div className="h-px bg-slate-100 my-2" />
          {walletAddress ? (
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-700">{formattedAddress}</span>
            </div>
          ) : (
            <Button primary className="w-full" onClick={connectWallet}>
              Connect to Donate
            </Button>
          )}
        </div>
      )}

      <main className="pt-8 lg:pt-12">
        <Outlet />
      </main>
      </div>
    </WalletContext.Provider>
  )
}
