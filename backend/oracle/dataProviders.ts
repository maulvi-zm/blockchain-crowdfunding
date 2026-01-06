interface ExchangeRateResponse {
  rate: number;
  timestamp: number;
}

export async function fetchExchangeRate(
  base: string,
  quote: string
): Promise<ExchangeRateResponse> {
  const API_URL = process.env.EXCHANGE_RATE_API_URL || 'https://api.coingecko.com/api/v3';
  
  try {
    if (base === 'ETH' && quote === 'IDR') {
      const response = await fetch(
        `${API_URL}/simple/price?ids=ethereum&vs_currencies=idr&include_last_updated_at=true`,
        {
          headers: {
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        rate: data.ethereum.idr,
        timestamp: data.ethereum.last_updated_at || Math.floor(Date.now() / 1000)
      };
    }

    if (base === 'ETH' && quote === 'USD') {
      const response = await fetch(
        `${API_URL}/simple/price?ids=ethereum&vs_currencies=usd&include_last_updated_at=true`,
        {
          headers: {
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        rate: data.ethereum.usd,
        timestamp: data.ethereum.last_updated_at || Math.floor(Date.now() / 1000)
      };
    }

    throw new Error(`Unsupported currency pair: ${base}/${quote}`);
  } catch (error) {
    console.error(`Error fetching ${base}/${quote} rate:`, error);
    throw error;
  }
}

