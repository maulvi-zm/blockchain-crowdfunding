// src/routes/health.ts
import { Hono } from 'hono';
import { query, pool } from '../db/init';

export const healthRouter = new Hono();

// BE-API-04: Health / Sync status
healthRouter.get('/health', async (c) => {
  try {
    // Get sync state
    const syncResult = await query('SELECT last_processed_block, last_processed_log_index, updated_at FROM sync_state WHERE id = 1');
    const syncState = syncResult.rows[0];

    // Get database stats
    const statsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM campaigns) as total_campaigns,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'ACTIVE') as active_campaigns,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'SUCCESS') as successful_campaigns,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'FAILED') as failed_campaigns,
        (SELECT COUNT(*) FROM contributions) as total_contributions,
        (SELECT COUNT(DISTINCT contributor_address) FROM contributions) as unique_contributors,
        (SELECT COUNT(*) FROM metadata_cache) as cached_metadata,
        (SELECT SUM(amount_wei::numeric) FROM contributions) as total_volume
    `);
    const stats = statsResult.rows[0];

    // Get pool stats
    const poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };

    return c.json({
      ok: true,
      timestamp: new Date().toISOString(),
      sync: {
        lastProcessedBlock: parseInt(syncState.last_processed_block),
        lastProcessedLogIndex: parseInt(syncState.last_processed_log_index),
        lastUpdated: syncState.updated_at
      },
      stats: {
        campaigns: {
          total: parseInt(stats.total_campaigns),
          active: parseInt(stats.active_campaigns),
          successful: parseInt(stats.successful_campaigns),
          failed: parseInt(stats.failed_campaigns)
        },
        contributions: {
          total: parseInt(stats.total_contributions),
          uniqueContributors: parseInt(stats.unique_contributors),
          totalVolume: stats.total_volume || '0'
        },
        metadata: {
          cached: parseInt(stats.cached_metadata)
        }
      },
      blockchain: {
        rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
        contractAddress: process.env.CONTRACT_ADDRESS || 'not configured'
      }
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return c.json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    }, 500);
  }
});
