import { Hono } from 'hono'
import { ethers } from 'ethers'
import { contractABI } from '../config/abi'

export const oracleRouter = new Hono()

oracleRouter.get('/rate', async (c) => {
  try {
    const pair = (c.req.query('pair') || 'ETH_IDR').toString()

    if (pair !== 'ETH_IDR') {
      return c.json({ error: 'Unsupported pair' }, 400)
    }

    const RPC_URL = process.env.RPC_URL || 'http://localhost:8545'
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || ''
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      return c.json({ error: 'Invalid contract address' }, 500)
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider)
    const rateScaled: bigint = await contract.latestEthIdrRateScaled()

    if (!rateScaled || rateScaled === 0n) {
      return c.json({ pair, available: false })
    }

    const rate = Number(rateScaled) / 100

    return c.json({ pair, available: true, rate })
  } catch (error: any) {
    console.error('Error in GET /oracle/rate:', error)
    return c.json({ error: 'Failed to fetch rate', message: error.message }, 500)
  }
})
