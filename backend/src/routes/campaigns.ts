// src/routes/campaigns.ts
import { Hono } from 'hono';
import { query } from '../db/init';
import { getCachedMetadata, normalizeIpfsUrl, searchMetadata } from '../services/ipfs';

export const campaignsRouter = new Hono();

// BE-API-01: List campaigns (search/filter/paginate)
campaignsRouter.get('/', async (c) => {
  try {
    const q = c.req.query('q') || '';
    const status = c.req.query('status') || '';
    const creator = c.req.query('creator') || '';
    const sort = c.req.query('sort') || 'created';
    const order = c.req.query('order') || 'desc';
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramCount = 0;

    // Status filter
    if (status && ['ACTIVE', 'SUCCESS', 'FAILED'].includes(status.toUpperCase())) {
      paramCount++;
      whereConditions.push(`c.status = $${paramCount}`);
      params.push(status.toUpperCase());
    }

    // Creator filter
    if (creator) {
      paramCount++;
      whereConditions.push(`c.creator_address = $${paramCount}`);
      params.push(creator.toLowerCase());
    }

    // Search filter using PostgreSQL full-text search
    if (q) {
      paramCount++;
      whereConditions.push(`
        c.metadata_cid IN (
          SELECT cid FROM metadata_cache 
          WHERE to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '')) 
            @@ plainto_tsquery('english', $${paramCount})
        )
      `);
      params.push(q);
    }

    const whereClause = whereConditions.join(' AND ');

    // Sort mapping
    const sortMap: Record<string, string> = {
      'deadline': 'c.deadline_ts',
      'raised': 'c.total_raised_wei',
      'created': 'c.block_created',
      'goal': 'c.goal_wei',
      'updated': 'c.updated_at'
    };

    const sortColumn = sortMap[sort] || 'c.block_created';
    const orderDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM campaigns c WHERE ${whereClause}
    `, params);
    const total = parseInt(countResult.rows[0].total);

    // Get campaigns
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    
    const result = await query(`
      SELECT 
        c.campaign_id,
        c.creator_address,
        c.goal_wei,
        c.deadline_ts,
        c.total_raised_wei,
        c.status,
        c.withdrawn,
        c.metadata_cid,
        c.tx_create_hash,
        c.block_created,
        c.updated_at
      FROM campaigns c
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${orderDir}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, [...params, limit, offset]);

    // Attach metadata to each campaign
    const items = await Promise.all(result.rows.map(async (campaign) => {
      const metadata = await getCachedMetadata(campaign.metadata_cid);
      
      return {
        campaignId: campaign.campaign_id,
        creator: campaign.creator_address,
        goalWei: campaign.goal_wei,
        deadlineTs: parseInt(campaign.deadline_ts),
        totalRaisedWei: campaign.total_raised_wei,
        status: campaign.status,
        withdrawn: campaign.withdrawn,
        metadata: metadata ? {
          cid: campaign.metadata_cid,
          title: metadata.title || 'Untitled Campaign',
          description: metadata.description ? 
            (metadata.description.length > 200 ? 
              metadata.description.substring(0, 200) + '...' : 
              metadata.description) : 
            '',
          category: metadata.category || null,
          image: metadata.image ? normalizeIpfsUrl(metadata.image) : null
        } : {
          cid: campaign.metadata_cid,
          title: 'Loading...',
          description: '',
          category: null,
          image: null
        },
        created: {
          txHash: campaign.tx_create_hash,
          block: parseInt(campaign.block_created)
        },
        updatedAt: campaign.updated_at
      };
    }));

    return c.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items
    });
  } catch (error: any) {
    console.error('Error in GET /campaigns:', error);
    return c.json({
      error: 'Failed to fetch campaigns',
      message: error.message
    }, 500);
  }
});

// BE-API-02: Campaign detail
campaignsRouter.get('/:campaignId', async (c) => {
  try {
    const campaignId = c.req.param('campaignId');

    if (!/^\d+$/.test(campaignId)) {
      return c.json({ error: 'Invalid campaign ID' }, 400);
    }

    const result = await query(`
      SELECT 
        campaign_id,
        creator_address,
        goal_wei,
        deadline_ts,
        total_raised_wei,
        status,
        withdrawn,
        metadata_cid,
        tx_create_hash,
        block_created,
        created_at,
        updated_at
      FROM campaigns
      WHERE campaign_id = $1
    `, [campaignId]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Campaign not found' }, 404);
    }

    const campaign = result.rows[0];

    // Get contributors count
    const countResult = await query(`
      SELECT COUNT(*) as count 
      FROM contributions 
      WHERE campaign_id = $1 AND amount_wei > 0
    `, [campaignId]);

    // Get oracle data
    const oracleResult = await query(`
      SELECT data_key, value, updated_at_chain, created_at
      FROM oracle_updates
      WHERE campaign_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [campaignId]);

    const metadata = await getCachedMetadata(campaign.metadata_cid);

    return c.json({
      campaignId: campaign.campaign_id,
      creator: campaign.creator_address,
      goalWei: campaign.goal_wei,
      deadlineTs: parseInt(campaign.deadline_ts),
      totalRaisedWei: campaign.total_raised_wei,
      status: campaign.status,
      withdrawn: campaign.withdrawn,
      metadata: metadata || { 
        cid: campaign.metadata_cid,
        title: 'Loading...',
        description: 'Metadata is being fetched...'
      },
      stats: {
        contributors: parseInt(countResult.rows[0].count)
      },
      oracle: oracleResult.rows.map(o => ({
        dataKey: o.data_key,
        value: o.value,
        updatedAt: parseInt(o.updated_at_chain),
        recordedAt: o.created_at
      })),
      blockchain: {
        txHash: campaign.tx_create_hash,
        blockNumber: parseInt(campaign.block_created),
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at
      }
    });
  } catch (error: any) {
    console.error('Error in GET /campaigns/:id:', error);
    return c.json({
      error: 'Failed to fetch campaign',
      message: error.message
    }, 500);
  }
});

// BE-API-03: Contribution for specific user
campaignsRouter.get('/:campaignId/contributions/:address', async (c) => {
  try {
    const campaignId = c.req.param('campaignId');
    const address = c.req.param('address').toLowerCase();

    if (!/^\d+$/.test(campaignId)) {
      return c.json({ error: 'Invalid campaign ID' }, 400);
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ error: 'Invalid address format' }, 400);
    }

    // Check if campaign exists
    const campaignResult = await query('SELECT 1 FROM campaigns WHERE campaign_id = $1', [campaignId]);
    if (campaignResult.rows.length === 0) {
      return c.json({ error: 'Campaign not found' }, 404);
    }

    const result = await query(`
      SELECT amount_wei, last_tx_hash, updated_at
      FROM contributions
      WHERE campaign_id = $1 AND contributor_address = $2
    `, [campaignId, address]);

    const contribution = result.rows[0];

    return c.json({
      campaignId,
      address,
      amountWei: contribution?.amount_wei || '0',
      lastTxHash: contribution?.last_tx_hash || null,
      updatedAt: contribution?.updated_at || null
    });
  } catch (error: any) {
    console.error('Error in GET /campaigns/:id/contributions/:address:', error);
    return c.json({
      error: 'Failed to fetch contribution',
      message: error.message
    }, 500);
  }
});

// Additional endpoint: Get all contributors for a campaign
campaignsRouter.get('/:campaignId/contributions', async (c) => {
  try {
    const campaignId = c.req.param('campaignId');
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
    const offset = (page - 1) * limit;

    if (!/^\d+$/.test(campaignId)) {
      return c.json({ error: 'Invalid campaign ID' }, 400);
    }

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM contributions 
      WHERE campaign_id = $1 AND amount_wei > 0
    `, [campaignId]);
    const total = parseInt(countResult.rows[0].total);

    // Get contributions
    const result = await query(`
      SELECT 
        contributor_address,
        amount_wei,
        last_tx_hash,
        created_at,
        updated_at
      FROM contributions
      WHERE campaign_id = $1 AND amount_wei > 0
      ORDER BY amount_wei DESC
      LIMIT $2 OFFSET $3
    `, [campaignId, limit, offset]);

    return c.json({
      campaignId,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      contributions: result.rows.map(c => ({
        address: c.contributor_address,
        amountWei: c.amount_wei,
        lastTxHash: c.last_tx_hash,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))
    });
  } catch (error: any) {
    console.error('Error in GET /campaigns/:id/contributions:', error);
    return c.json({
      error: 'Failed to fetch contributions',
      message: error.message
    }, 500);
  }
});

// Additional endpoint: Get campaigns by creator
campaignsRouter.get('/creator/:address', async (c) => {
  try {
    const address = c.req.param('address').toLowerCase();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ error: 'Invalid address format' }, 400);
    }

    const result = await query(`
      SELECT 
        campaign_id,
        goal_wei,
        deadline_ts,
        total_raised_wei,
        status,
        withdrawn,
        metadata_cid,
        block_created,
        created_at
      FROM campaigns
      WHERE creator_address = $1
      ORDER BY block_created DESC
    `, [address]);

    const campaigns = await Promise.all(result.rows.map(async (campaign) => {
      const metadata = await getCachedMetadata(campaign.metadata_cid);
      return {
        campaignId: campaign.campaign_id,
        goalWei: campaign.goal_wei,
        deadlineTs: parseInt(campaign.deadline_ts),
        totalRaisedWei: campaign.total_raised_wei,
        status: campaign.status,
        withdrawn: campaign.withdrawn,
        metadata: metadata ? {
          cid: campaign.metadata_cid,
          title: metadata.title || 'Untitled',
          category: metadata.category || null
        } : {
          cid: campaign.metadata_cid,
          title: 'Loading...'
        },
        blockCreated: parseInt(campaign.block_created),
        createdAt: campaign.created_at
      };
    }));

    return c.json({
      creator: address,
      totalCampaigns: campaigns.length,
      campaigns
    });
  } catch (error: any) {
    console.error('Error in GET /campaigns/creator/:address:', error);
    return c.json({
      error: 'Failed to fetch creator campaigns',
      message: error.message
    }, 500);
  }
});