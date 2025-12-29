import { ethers } from 'ethers';
import { query, getClient } from '../db/init';
import { contractABI } from '../config/abi';
import { fetchMetadata } from './ipfs';

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000');
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100');

if (!CONTRACT_ADDRESS) {
  throw new Error('CONTRACT_ADDRESS is required in environment variables');
}

let isProcessing = false;

export function startEventListener() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

  console.log(`  Contract: ${CONTRACT_ADDRESS}`);
  console.log(`  RPC: ${RPC_URL}`);
  console.log(`  Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`  Batch size: ${BATCH_SIZE} blocks\n`);

  async function processEvents() {
    if (isProcessing) {
      return;
    }

    isProcessing = true;

    try {
      const result = await query('SELECT last_processed_block, last_processed_log_index FROM sync_state WHERE id = 1');
      const syncState = result.rows[0];
      
      const currentBlock = await provider.getBlockNumber();
      
      if (currentBlock <= syncState.last_processed_block) {
        isProcessing = false;
        return;
      }

      const fromBlock = syncState.last_processed_block + 1;
      const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, currentBlock);

      console.log(`📦 Processing blocks ${fromBlock} to ${toBlock} (current: ${currentBlock})`);

      const filter = {
        address: CONTRACT_ADDRESS,
        fromBlock,
        toBlock
      };

      const logs = await provider.getLogs(filter);
      
      if (logs.length === 0) {
        await query(
          'UPDATE sync_state SET last_processed_block = $1, last_processed_log_index = 0 WHERE id = 1',
          [toBlock]
        );
        console.log(`  ✓ No events found, synced to block ${toBlock}`);
        isProcessing = false;
        return;
      }

      console.log(`  Found ${logs.length} events`);

      // Process events in transaction
      const client = await getClient();
      
      try {
        await client.query('BEGIN');

        for (const log of logs) {
          try {
            const parsedLog = contract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });

            if (parsedLog) {
              await handleEvent({
                ...parsedLog,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                logIndex: log.index
              }, client);
            }
          } catch (parseError) {
            console.error('  ⚠️  Failed to parse log:', parseError);
          }
        }

        // Update sync state
        const lastLog = logs[logs.length - 1];
        await client.query(
          'UPDATE sync_state SET last_processed_block = $1, last_processed_log_index = $2 WHERE id = 1',
          [toBlock, lastLog.index]
        );

        await client.query('COMMIT');
        console.log(`  ✅ Synced to block ${toBlock}\n`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error processing events:', error);
    } finally {
      isProcessing = false;
    }
  }

  setInterval(processEvents, POLL_INTERVAL);
  processEvents();
}

interface ParsedEvent {
  fragment: { name: string };
  args: any[];
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

async function handleEvent(event: ParsedEvent, client: any) {
  const eventName = event.fragment?.name;
  
  if (!eventName) return;

  console.log(`  📝 ${eventName} (tx: ${event.transactionHash.slice(0, 10)}...)`);

  try {
    switch (eventName) {
      case 'CampaignCreated':
        await handleCampaignCreated(event, client);
        break;
      case 'ContributionReceived':
        await handleContributionReceived(event, client);
        break;
      case 'CampaignFinalized':
        await handleCampaignFinalized(event, client);
        break;
      case 'FundsWithdrawn':
        await handleFundsWithdrawn(event, client);
        break;
      case 'RefundIssued':
        await handleRefundIssued(event, client);
        break;
      case 'OracleDataRequested':
        await handleOracleDataRequested(event, client);
        break;
      case 'OracleDataUpdated':
        await handleOracleDataUpdated(event, client);
        break;
      default:
        console.log(`     ⚠️  Unknown event type: ${eventName}`);
    }
  } catch (error) {
    console.error(`     ❌ Error handling ${eventName}:`, error);
    throw error;
  }
}

async function handleCampaignCreated(event: ParsedEvent, client: any) {
  const [campaignId, creator, goalWei, deadlineTs, metadataCID] = event.args;
  
  await client.query(`
    INSERT INTO campaigns 
    (campaign_id, creator_address, goal_wei, deadline_ts, total_raised_wei, 
     status, withdrawn, metadata_cid, tx_create_hash, block_created)
    VALUES ($1, $2, $3, $4, 0, 'ACTIVE', FALSE, $5, $6, $7)
    ON CONFLICT (campaign_id) DO UPDATE SET
      creator_address = EXCLUDED.creator_address,
      goal_wei = EXCLUDED.goal_wei,
      deadline_ts = EXCLUDED.deadline_ts,
      metadata_cid = EXCLUDED.metadata_cid
  `, [
    campaignId.toString(),
    creator.toLowerCase(),
    goalWei.toString(),
    deadlineTs.toString(),
    metadataCID,
    event.transactionHash,
    event.blockNumber
  ]);

  console.log(`     Campaign ${campaignId} created by ${creator.slice(0, 8)}...`);

  // Fetch metadata asynchronously
  fetchMetadata(metadataCID).catch(err => {
    console.error(`     ⚠️  Failed to fetch metadata for CID ${metadataCID}:`, err.message);
  });
}

async function handleContributionReceived(event: ParsedEvent, client: any) {
  const [campaignId, contributor, amountWei, newTotalRaisedWei] = event.args;
  
  // Update campaign total
  await client.query(`
    UPDATE campaigns 
    SET total_raised_wei = $1
    WHERE campaign_id = $2
  `, [newTotalRaisedWei.toString(), campaignId.toString()]);

  // Upsert contribution
  await client.query(`
    INSERT INTO contributions (campaign_id, contributor_address, amount_wei, last_tx_hash)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT(campaign_id, contributor_address) 
    DO UPDATE SET 
      amount_wei = contributions.amount_wei + EXCLUDED.amount_wei,
      last_tx_hash = EXCLUDED.last_tx_hash
  `, [
    campaignId.toString(),
    contributor.toLowerCase(),
    amountWei.toString(),
    event.transactionHash
  ]);

  console.log(`     ${contributor.slice(0, 8)}... contributed ${ethers.formatEther(amountWei)} ETH to campaign ${campaignId}`);
}

async function handleCampaignFinalized(event: ParsedEvent, client: any) {
  const [campaignId, status] = event.args;
  
  const statusMap: Record<number, string> = {
    0: 'ACTIVE',
    1: 'SUCCESS',
    2: 'FAILED'
  };

  const statusStr = statusMap[Number(status)] || 'ACTIVE';

  await client.query(`
    UPDATE campaigns 
    SET status = $1
    WHERE campaign_id = $2
  `, [statusStr, campaignId.toString()]);

  console.log(`     Campaign ${campaignId} finalized with status: ${statusStr}`);
}

async function handleFundsWithdrawn(event: ParsedEvent, client: any) {
  const [campaignId, creator, amountWei] = event.args;

  await client.query(`
    UPDATE campaigns 
    SET withdrawn = TRUE
    WHERE campaign_id = $1
  `, [campaignId.toString()]);

  console.log(`     ${creator.slice(0, 8)}... withdrew ${ethers.formatEther(amountWei)} ETH from campaign ${campaignId}`);
}

async function handleRefundIssued(event: ParsedEvent, client: any) {
  const [campaignId, contributor, amountWei] = event.args;

  await client.query(`
    UPDATE contributions 
    SET amount_wei = 0
    WHERE campaign_id = $1 AND contributor_address = $2
  `, [campaignId.toString(), contributor.toLowerCase()]);

  console.log(`     ${contributor.slice(0, 8)}... refunded ${ethers.formatEther(amountWei)} ETH from campaign ${campaignId}`);
}

async function handleOracleDataRequested(event: ParsedEvent, client: any) {
  const [campaignId, requestId, dataKey, param] = event.args;
  
  console.log(`     Oracle data requested for campaign ${campaignId}`);
  console.log(`       Data Key: ${dataKey}`);
  console.log(`       Param: ${param || 'none'}`);
}

async function handleOracleDataUpdated(event: ParsedEvent, client: any) {
  const [campaignId, requestId, dataKey, value, updatedAt] = event.args;

  await client.query(`
    INSERT INTO oracle_updates 
    (campaign_id, request_id, data_key, value, updated_at_chain)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (campaign_id, request_id) DO UPDATE SET
      data_key = EXCLUDED.data_key,
      value = EXCLUDED.value,
      updated_at_chain = EXCLUDED.updated_at_chain
  `, [
    campaignId.toString(),
    requestId,
    dataKey,
    value.toString(),
    updatedAt.toString()
  ]);

  console.log(`     Oracle data updated for campaign ${campaignId}`);
  console.log(`       Data Key: ${dataKey}`);
  console.log(`       Value: ${value.toString()}`);
}