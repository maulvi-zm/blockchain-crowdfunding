import { createContext, useContext } from 'react'

type WalletContextValue = {
  walletAddress: string | null
  setWalletAddress: (address: string | null) => void
}

export const WalletContext = createContext<WalletContextValue | null>(null)

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletContext.Provider')
  return ctx
}
