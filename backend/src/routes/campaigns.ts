import { Hono } from "hono";
import { query } from "../db/init";
import { getCachedMetadata, normalizeIpfsUrl } from "../services/ipfs";

export const campaignsRouter = new Hono();

// BE-API-01: List campaigns (search/filter/paginate)
campaignsRouter.get("/", async (c) => {
  try {
    const q = c.req.query("q") || "";
    const status = c.req.query("status") || "";
    const creator = c.req.query("creator") || "";
    const sort = c.req.query("sort") || "created";
    const order = c.req.query("order") || "desc";
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(c.req.query("limit") || "20"))
    );

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions: string[] = ["1=1"];
    const params: any[] = [];
    let paramCount = 0;

    // Status filter
    if (
      status &&
      ["ACTIVE", "SUCCESS", "FAILED"].includes(status.toUpperCase())
    ) {
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

    // Search filter
    if (q) {
      paramCount++;
      const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);

      whereConditions.push(`
            c.metadata_cid IN (
              SELECT cid FROM metadata_cache 
              WHERE to_tsvector('simple', title || ' ' || COALESCE(description, '')) 
                @@ to_tsquery('simple', $${paramCount})
            )
          `);

      if (words.length > 0) {
        const tsQuery = words.map((word) => `${word}:*`).join(" & ");
        params.push(tsQuery);
      } else {
        params.push(`${q}:*`);
      }
    }

    const whereClause = whereConditions.join(" AND ");

    // Sort mapping
    const sortMap: Record<string, string> = {
      deadline: "c.deadline_ts",
      raised: "c.total_raised_wei",
      created: "c.block_created",
      goal: "c.goal_idr",
      updated: "c.updated_at",
    };

    const sortColumn = sortMap[sort] || "c.block_created";
    const orderDir = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Get total count
    const countResult = await query(
      `
      SELECT COUNT(*) as total FROM campaigns c WHERE ${whereClause}
    `,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get campaigns
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const result = await query(
      `
      SELECT 
        c.campaign_id,
        c.creator_address,
        c.goal_idr,
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
    `,
      [...params, limit, offset]
    );

    // Attach metadata to each campaign
    const items = await Promise.all(
      result.rows.map(async (campaign) => {
        const metadata = await getCachedMetadata(campaign.metadata_cid);

        return {
          campaignId: campaign.campaign_id,
          creator: campaign.creator_address,
          goalIdr: campaign.goal_idr,
          deadlineTs: parseInt(campaign.deadline_ts),
          totalRaisedWei: campaign.total_raised_wei,
          status: campaign.status,
          withdrawn: campaign.withdrawn,
          metadata: metadata
            ? {
                cid: campaign.metadata_cid,
                title: metadata.name || "Untitled Campaign",
                description: metadata.description
                  ? metadata.description.length > 200
                    ? metadata.description.substring(0, 200) + "..."
                    : metadata.description
                  : "",
                image: metadata.image ? normalizeIpfsUrl(metadata.image) : null,
              }
            : {
                cid: campaign.metadata_cid,
                title: "Loading...",
                description: "",
                image: null,
              },
          created: {
            txHash: campaign.tx_create_hash,
            block: parseInt(campaign.block_created),
          },
          updatedAt: campaign.updated_at,
        };
      })
    );

    return c.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error: any) {
    console.error("Error in GET /campaigns:", error);
    return c.json(
      {
        error: "Failed to fetch campaigns",
        message: error.message,
      },
      500
    );
  }
});

// BE-API-05: Contributions by contributor address (paginated)
campaignsRouter.get("/contributions/by/:address", async (c) => {
  try {
    const address = c.req.param("address").toLowerCase();
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "20")));
    const offset = (page - 1) * limit;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ error: "Invalid address format" }, 400);
    }

    const countResult = await query(
      `
      SELECT COUNT(*) as total
      FROM contributions
      WHERE contributor_address = $1
    `,
      [address]
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `
      SELECT
        c.campaign_id,
        c.creator_address,
        c.goal_idr,
        c.deadline_ts,
        c.total_raised_wei,
        c.status,
        c.withdrawn,
        c.metadata_cid,
        c.tx_create_hash,
        c.block_created,
        c.updated_at,
        contrib.amount_wei,
        contrib.last_tx_hash,
        contrib.created_at as contribution_created_at,
        contrib.updated_at as contribution_updated_at
      FROM contributions contrib
      JOIN campaigns c ON c.campaign_id = contrib.campaign_id
      WHERE contrib.contributor_address = $1
      ORDER BY contrib.updated_at DESC
      LIMIT $2 OFFSET $3
    `,
      [address, limit, offset]
    );

    const items = await Promise.all(
      result.rows.map(async (row) => {
        const metadata = await getCachedMetadata(row.metadata_cid);

        return {
          campaignId: row.campaign_id,
          creator: row.creator_address,
          goalIdr: row.goal_idr,
          deadlineTs: parseInt(row.deadline_ts),
          totalRaisedWei: row.total_raised_wei,
          status: row.status,
          withdrawn: row.withdrawn,
          metadata: metadata
            ? {
                cid: row.metadata_cid,
                title: metadata.name || "Untitled Campaign",
                description: metadata.description
                  ? metadata.description.length > 200
                    ? metadata.description.substring(0, 200) + "..."
                    : metadata.description
                  : "",
                image: metadata.image ? normalizeIpfsUrl(metadata.image) : null,
              }
            : {
                cid: row.metadata_cid,
                title: "Loading...",
                description: "",
                image: null,
              },
          created: {
            txHash: row.tx_create_hash,
            block: parseInt(row.block_created),
          },
          updatedAt: row.updated_at,
          contribution: {
            amountWei: row.amount_wei,
            lastTxHash: row.last_tx_hash,
            createdAt: row.contribution_created_at,
            updatedAt: row.contribution_updated_at,
          },
        };
      })
    );

    return c.json({
      address,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error: any) {
    console.error("Error in GET /campaigns/contributions/by/:address:", error);
    return c.json(
      {
        error: "Failed to fetch contributions",
        message: error.message,
      },
      500
    );
  }
});

// BE-API-02: Campaign detail
campaignsRouter.get("/:campaignId", async (c) => {
  try {
    const campaignId = c.req.param("campaignId");

    if (!/^\d+$/.test(campaignId)) {
      return c.json({ error: "Invalid campaign ID" }, 400);
    }

    const result = await query(
      `
      SELECT 
        campaign_id,
        creator_address,
        goal_idr,
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
    `,
      [campaignId]
    );

    if (result.rows.length === 0) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    const campaign = result.rows[0];

    // Get contributors count
    const countResult = await query(
      `
      SELECT COUNT(*) as count 
      FROM contributions 
      WHERE campaign_id = $1 AND amount_wei > 0
    `,
      [campaignId]
    );

    // Get oracle data/ Jujur oracle masih blm nangkep bgt
    // const oracleResult = await query(`
    //   SELECT data_key, value, updated_at_chain, created_at
    //   FROM oracle_updates
    //   WHERE campaign_id = $1
    //   ORDER BY created_at DESC
    //   LIMIT 5
    // `, [campaignId]);

    const metadata = await getCachedMetadata(campaign.metadata_cid);

    return c.json({
      campaignId: campaign.campaign_id,
      creator: campaign.creator_address,
      goalIdr: campaign.goal_idr,
      deadlineTs: parseInt(campaign.deadline_ts),
      totalRaisedWei: campaign.total_raised_wei,
      status: campaign.status,
      withdrawn: campaign.withdrawn,
      metadata: metadata
        ? {
            cid: campaign.metadata_cid,
            title: metadata.name || "Untitled Campaign",
            description: metadata.description
              ? metadata.description.length > 200
                ? metadata.description.substring(0, 200) + "..."
                : metadata.description
              : "",
            image: metadata.image ? normalizeIpfsUrl(metadata.image) : null,
          }
        : {
            cid: campaign.metadata_cid,
            title: "Loading...",
            description: "",
            image: null,
          },
      stats: {
        contributors: parseInt(countResult.rows[0].count),
      },
      // oracle: oracleResult.rows.map(o => ({
      //   dataKey: o.data_key,
      //   value: o.value,
      //   updatedAt: parseInt(o.updated_at_chain),
      //   recordedAt: o.created_at
      // })),
      blockchain: {
        txHash: campaign.tx_create_hash,
        blockNumber: parseInt(campaign.block_created),
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /campaigns/:id:", error);
    return c.json(
      {
        error: "Failed to fetch campaign",
        message: error.message,
      },
      500
    );
  }
});

// BE-API-03: Contribution for specific user
campaignsRouter.get("/:campaignId/contributions/:address", async (c) => {
  try {
    const campaignId = c.req.param("campaignId");
    const address = c.req.param("address").toLowerCase();

    if (!/^\d+$/.test(campaignId)) {
      return c.json({ error: "Invalid campaign ID" }, 400);
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ error: "Invalid address format" }, 400);
    }

    // Check if campaign exists
    const campaignResult = await query(
      "SELECT 1 FROM campaigns WHERE campaign_id = $1",
      [campaignId]
    );
    if (campaignResult.rows.length === 0) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    const result = await query(
      `
      SELECT amount_wei, last_tx_hash, updated_at
      FROM contributions
      WHERE campaign_id = $1 AND contributor_address = $2
    `,
      [campaignId, address]
    );

    const contribution = result.rows[0];

    return c.json({
      campaignId,
      address,
      amountWei: contribution?.amount_wei || "0",
      lastTxHash: contribution?.last_tx_hash || null,
      updatedAt: contribution?.updated_at || null,
    });
  } catch (error: any) {
    console.error("Error in GET /campaigns/:id/contributions/:address:", error);
    return c.json(
      {
        error: "Failed to fetch contribution",
        message: error.message,
      },
      500
    );
  }
});

// Additional endpoint: Get all contributors for a campaign
campaignsRouter.get("/:campaignId/contributions", async (c) => {
  try {
    const campaignId = c.req.param("campaignId");
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(c.req.query("limit") || "20"))
    );
    const offset = (page - 1) * limit;

    if (!/^\d+$/.test(campaignId)) {
      return c.json({ error: "Invalid campaign ID" }, 400);
    }

    // Get total count
    const countResult = await query(
      `
      SELECT COUNT(*) as total 
      FROM contributions 
      WHERE campaign_id = $1 AND amount_wei > 0
    `,
      [campaignId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get contributions
    const result = await query(
      `
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
    `,
      [campaignId, limit, offset]
    );

    return c.json({
      campaignId,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      contributions: result.rows.map((c) => ({
        address: c.contributor_address,
        amountWei: c.amount_wei,
        lastTxHash: c.last_tx_hash,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("Error in GET /campaigns/:id/contributions:", error);
    return c.json(
      {
        error: "Failed to fetch contributions",
        message: error.message,
      },
      500
    );
  }
});
