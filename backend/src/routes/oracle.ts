// src/routes/oracle.ts
import { Hono } from 'hono'
import { query } from '../db/init'

export const oracleRouter = new Hono()

// GET /api/v1/oracle/rate?pair=ETH_IDR
oracleRouter.get('/rate', async (c) => {
  // try {
  //   const pair = (c.req.query('pair') || 'ETH_IDR').toString()

  //   // Only support ETH_IDR for now
  //   if (pair !== 'ETH_IDR') {
  //     return c.json({ error: 'Unsupported pair' }, 400)
  //   }

  //   const res = await query(`
  //     SELECT value, updated_at_chain, created_at
  //     FROM oracle_updates
  //     WHERE data_key = $1
  //     ORDER BY created_at DESC
  //     LIMIT 1
  //   `, [pair])

  //   if (res.rows.length === 0) {
  //     return c.json({ pair, available: false })
  //   }

  //   const row = res.rows[0]
  //   // value stored by oracle is scaled by 100 (see oracle/index.ts)
  //   const raw = Number(row.value)
  //   const rate = raw / 100 // IDR per ETH as float

  //   return c.json({ pair, available: true, rate, updatedAt: row.updated_at_chain, recordedAt: row.created_at })
  // } catch (error: any) {
  //   console.error('Error in GET /oracle/rate:', error)
  //   return c.json({ error: 'Failed to fetch rate', message: error.message }, 500)
  // }
})
