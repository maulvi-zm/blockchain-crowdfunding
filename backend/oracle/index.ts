import { EventLog, Log, ethers } from 'ethers';
import { contractABI } from '../src/config/abi';
import { fetchExchangeRate } from './dataProviders';

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '31337');
const ORACLE_POLL_INTERVAL = parseInt(process.env.ORACLE_POLL_INTERVAL || '10000');

// Retry configuration
const MAX_RETRY = parseInt(process.env.MAX_RETRY || '3');
const BACKOFF_MS = [500, 1500, 3000];


interface OracleRequest {
  campaignId: bigint;
  requestId: string;
  dataKey: string;
  param: string;
  blockNumber: number;
  transactionHash: string;
}

function isEventLog(log: Log | EventLog): log is EventLog {
  return 'args' in log
}

class OracleService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private processedRequests: Set<string>;
  private queue: Promise<void>;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.provider.pollingInterval = ORACLE_POLL_INTERVAL;
    this.wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, this.wallet);
    this.processedRequests = new Set();
    this.queue = Promise.resolve();
    
    console.log('Oracle Service initialized');
    console.log('Oracle Address:', this.wallet.address);
    console.log('Contract Address:', CONTRACT_ADDRESS);
  }

  async start() {
    console.log('Starting Oracle Service...');
    
    // Listen for OracleDataRequested events
    this.contract.on('OracleDataRequested', async (
      campaignId: bigint,
      requestId: string,
      dataKey: string,
      param: string,
      event: any
    ) => {
      const request: OracleRequest = {
        campaignId,
        requestId,
        dataKey,
        param,
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash
      };

      await this.handleRequest(request);
    });

    // Also check for past events on startup
    await this.processPastEvents();

    console.log('Oracle Service is now listening for requests...');
  }

  

  private async processPastEvents() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks

      console.log(`Checking past events from block ${fromBlock} to ${currentBlock}`);

      const events = await this.contract.queryFilter(
        'OracleDataRequested',
        fromBlock,
        currentBlock
      );

      for (const event of events) {
        if (!isEventLog(event)) continue

        const [campaignId, requestId, dataKey, param] = event.args

        if (!this.processedRequests.has(requestId)) {
            const request: OracleRequest = {
            campaignId,
            requestId,
            dataKey,
            param,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
            }

            await this.handleRequest(request)
        }
        }

    } catch (error) {
      console.error('Error processing past events:', error);
    }
  }

  private async handleRequest(request: OracleRequest) {
    this.queue = this.queue.then(() => this.processRequest(request));
    await this.queue;
  }

  private async processRequest(request: OracleRequest) {
    const { campaignId, requestId, dataKey, param } = request;

    // Check if already processed
    if (this.processedRequests.has(requestId)) {
      console.log(`Request ${requestId} already processed, skipping`);
      return;
    }

    console.log(`\nProcessing request:`);
    console.log(`  Campaign ID: ${campaignId}`);
    console.log(`  Request ID: ${requestId}`);
    console.log(`  Data Key: ${dataKey}`);
    console.log(`  Param: ${param}`);

    try {
      let value: bigint;
      let updatedAt: bigint;

      switch (dataKey) {
        case 'ETH_IDR':
          const rateData = await this.fetchWithRetry(() => fetchExchangeRate('ETH', 'IDR'));
          value = BigInt(Math.floor(rateData.rate * 100)); // Store with 2 decimals
          updatedAt = BigInt(rateData.timestamp);
          break;

        case 'CAMPAIGN_VERIFIED':
          value = BigInt(1); // 1 = verified, 0 = not verified
          updatedAt = BigInt(Math.floor(Date.now() / 1000));
          break;

        default:
          console.error(`Unknown data key: ${dataKey}`);
          return;
      }

      await this.submitCallback(campaignId, requestId, dataKey, value, updatedAt);
      
      this.processedRequests.add(requestId);
      
      console.log(`✓ Request ${requestId} processed successfully`);
    } catch (error) {
      console.error(`✗ Failed to process request ${requestId}:`, error);
    }
  }

  private async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    retries: number = MAX_RETRY
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetchFn();
      } catch (error) {
        if (i === retries - 1) throw error;
        
        const backoff = BACKOFF_MS[i] || BACKOFF_MS[BACKOFF_MS.length - 1];
        console.log(`Retry ${i + 1}/${retries} after ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
    throw new Error('All retries failed');
  }

  private async submitCallback(
    campaignId: bigint,
    requestId: string,
    dataKey: string,
    value: bigint,
    updatedAt: bigint
  ) {
    console.log(`Submitting callback for request ${requestId}...`);
    console.log(`  Value: ${value}`);
    console.log(`  Updated At: ${updatedAt}`);

    try {
      const tx = await this.contract.oracleCallback(
        campaignId,
        requestId,
        dataKey,
        value,
        updatedAt,
        {
          gasLimit: 500000 
        }
      );

      console.log(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    } catch (error: any) {
      // Handle specific errors
      if (error.message?.includes('already fulfilled')) {
        console.log('Request already fulfilled on-chain');
        this.processedRequests.add(requestId);
      } else if (error.message?.includes('Unauthorized')) {
        console.error('Oracle not authorized! Check oracle address in contract');
        throw error;
      } else {
        throw error;
      }
    }
  }
}

// Start the service
const oracle = new OracleService();
oracle.start().catch(error => {
  console.error('Failed to start Oracle Service:', error);
  process.exit(1);
});
