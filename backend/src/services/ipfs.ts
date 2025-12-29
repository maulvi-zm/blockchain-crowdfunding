import { query } from '../db/init';

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
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

/**
 * Fetch metadata from IPFS with caching in PostgreSQL
 */
export async function fetchMetadata(cid: string): Promise<Metadata | null> {
  // Check cache first
  const cached = await query('SELECT raw_json FROM metadata_cache WHERE cid = $1', [cid]);
  
  if (cached.rows.length > 0) {
    try {
      return cached.rows[0].raw_json;
    } catch (error) {
      console.error(`Failed to parse cached metadata for CID ${cid}:`, error);
    }
  }

  // Fetch from IPFS
  try {
    const url = `${IPFS_GATEWAY}${cid}`;
    
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
    if (!metadata.title || !metadata.description) {
      console.warn(`Metadata for CID ${cid} is missing required fields`);
    }

    // Cache it in PostgreSQL with JSONB
    await query(`
      INSERT INTO metadata_cache 
      (cid, title, description, category, image, raw_json)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (cid) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        image = EXCLUDED.image,
        raw_json = EXCLUDED.raw_json,
        fetched_at = NOW()
    `, [
      cid,
      metadata.title || '',
      metadata.description || '',
      metadata.category || null,
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

/**
 * Get metadata with automatic fallback to fetch
 */
export async function getMetadata(cid: string): Promise<Metadata | null> {
  const cached = await getCachedMetadata(cid);
  if (cached) {
    return cached;
  }
  
  return await fetchMetadata(cid);
}

/**
 * Search metadata using PostgreSQL full-text search
 */
export async function searchMetadata(searchTerm: string, limit: number = 20): Promise<string[]> {
  try {
    const result = await query(`
      SELECT cid 
      FROM metadata_cache 
      WHERE 
        to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '')), plainto_tsquery('english', $1)) DESC
      LIMIT $2
    `, [searchTerm, limit]);
    
    return result.rows.map(row => row.cid);
  } catch (error) {
    console.error('Error searching metadata:', error);
    return [];
  }
}

/**
 * Normalize IPFS URI to HTTP gateway URL
 */
export function normalizeIpfsUrl(uri: string): string {
  if (!uri) return '';
  
  if (uri.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY}${uri.slice(7)}`;
  }
  
  if (uri.startsWith('/ipfs/')) {
    return `${IPFS_GATEWAY}${uri.slice(6)}`;
  }
  
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  
  return `${IPFS_GATEWAY}${uri}`;
}