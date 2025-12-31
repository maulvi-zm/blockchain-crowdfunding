import { query } from '../db/init';

const IPFS_GATEWAY = process.env.IPFS_GATEWAY ;
const IPFS_TIMEOUT = parseInt(process.env.IPFS_TIMEOUT || '10000');

export interface Metadata {
  title: string;
  description: string;
  category?: string;
  image?: string;
  goalAmount?: string;
  creatorName?: string;
  creatorBio?: string;
  tags?: string[];
  [key: string]: any;
}


export async function fetchMetadata(cid: string): Promise<Metadata | null> {
  // Check cache first
  const cached = await getCachedMetadata(cid);
  
  if (!cached) {
    console.log(`  No cached metadata for CID ${cid}, fetching from IPFS...`);
  }

  // Fetch from IPFS
  try {
    const url = `${IPFS_GATEWAY}${cid}`;
    console.log(`  Fetching metadata from IPFS: ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IPFS_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const metadata = await response.json();

    // Validate metadata structure
    if (!metadata.name || !metadata.description) {
      console.warn(`Metadata for CID ${cid} is missing required fields`);
    }

    // Cache it in PostgreSQL with JSONB
    await query(`
      INSERT INTO metadata_cache 
      (cid, title, description, image, raw_json)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cid) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        raw_json = EXCLUDED.raw_json,
        fetched_at = NOW()
    `, [
      cid,
      metadata.name || '',
      metadata.description || '',
      metadata.image || null,
      JSON.stringify(metadata)
    ]);

    return metadata;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`Timeout fetching metadata for CID ${cid}`);
    } else {
      console.error(`Failed to fetch metadata for CID ${cid}:`, error.message);
    }
    return null;
  }
}

/**
 * Get cached metadata without fetching
 */
export async function getCachedMetadata(cid: string): Promise<Metadata | null> {
  try {
    const result = await query('SELECT raw_json FROM metadata_cache WHERE cid = $1', [cid]);
    
    if (result.rows.length > 0) {
      return result.rows[0].raw_json;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get cached metadata for CID ${cid}:`, error);
    return null;
  }
}


export function normalizeIpfsUrl(uri: string): string {
  return `${IPFS_GATEWAY}${uri.slice(7)}`;
}