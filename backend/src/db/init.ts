// src/db/init.ts
import { Pool, PoolClient } from 'pg';

// Database configuration from environment
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'crowdfunding',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_SIZE || '20'), // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
export const pool = new Pool(DB_CONFIG);

// Test connection on startup
pool.on('connect', () => {
  console.log('  ✓ Database connection established');
});

pool.on('error', (err) => {
  console.error('  ❌ Unexpected database error:', err);
  process.exit(1);
});

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (duration > 1000) {
    console.warn(`  ⚠️  Slow query (${duration}ms): ${text.substring(0, 100)}...`);
  }
  
  return res;
}

// Get a client from the pool for transactions
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

// Initialize database schema
export async function initDatabase() {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    console.log(`  Database: ${DB_CONFIG.database}@${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`  Pool size: ${DB_CONFIG.max} connections`);
    
    // Create campaigns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        campaign_id BIGINT PRIMARY KEY,
        creator_address VARCHAR(42) NOT NULL,
        goal_idr NUMERIC NOT NULL,
        deadline_ts BIGINT NOT NULL,
        total_raised_wei NUMERIC NOT NULL DEFAULT 0,
        status VARCHAR(10) NOT NULL CHECK(status IN ('ACTIVE', 'SUCCESS', 'FAILED')) DEFAULT 'ACTIVE',
        withdrawn BOOLEAN NOT NULL DEFAULT FALSE,
        metadata_cid TEXT NOT NULL,
        tx_create_hash VARCHAR(66) NOT NULL,
        block_created BIGINT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for campaigns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_campaigns_status_deadline 
      ON campaigns(status, deadline_ts);
      
      CREATE INDEX IF NOT EXISTS idx_campaigns_creator 
      ON campaigns(creator_address);
    `);

    // Create contributions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contributions (
        campaign_id BIGINT NOT NULL,
        contributor_address VARCHAR(42) NOT NULL,
        amount_wei NUMERIC NOT NULL DEFAULT 0,
        last_tx_hash VARCHAR(66) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (campaign_id, contributor_address),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE
      )
    `);

    // Create indexes for contributions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contributions_campaign 
      ON contributions(campaign_id);
      
      CREATE INDEX IF NOT EXISTS idx_contributions_contributor 
      ON contributions(contributor_address);
      
      CREATE INDEX IF NOT EXISTS idx_contributions_amount 
      ON contributions(amount_wei DESC);
    `);

    // Create sync_state table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_processed_block BIGINT NOT NULL DEFAULT 0,
        last_processed_log_index INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Insert initial sync state if not exists
    await client.query(`
      INSERT INTO sync_state (id, last_processed_block, last_processed_log_index)
      VALUES (1, 0, 0)
      ON CONFLICT (id) DO NOTHING
    `);

    // Create metadata cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS metadata_cache (
        cid TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        image TEXT,
        raw_json JSONB NOT NULL,
        fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_metadata_title 
      ON metadata_cache USING GIN (to_tsvector('simple', title));
      
      CREATE INDEX IF NOT EXISTS idx_metadata_description 
      ON metadata_cache USING GIN (to_tsvector('simple', description));
      
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add triggers for auto-updating updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
      CREATE TRIGGER update_campaigns_updated_at 
      BEFORE UPDATE ON campaigns 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_contributions_updated_at ON contributions;
      CREATE TRIGGER update_contributions_updated_at 
      BEFORE UPDATE ON contributions 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_sync_state_updated_at ON sync_state;
      CREATE TRIGGER update_sync_state_updated_at 
      BEFORE UPDATE ON sync_state 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    
    console.log('  ✓ Tables created');
    console.log('  ✓ Indexes created');
    console.log('  ✓ Triggers created');
    console.log('  ✓ Database ready');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  await pool.end();
  console.log('  ✓ Database connections closed');
}
