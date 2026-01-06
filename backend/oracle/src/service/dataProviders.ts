interface ExchangeRateResponse {
  rate: number;
  timestamp: number;
}

interface CoinGeckoPriceResponse {
  ethereum: {
    idr: number;
    last_updated_at?: number;
  };
}

export async function fetchExchangeRate(
  base: string,
  quote: string
): Promise<ExchangeRateResponse> {
  const API_URL = process.env.EXCHANGE_RATE_API_URL || 'https://api.coingecko.com/api/v3';
  
  try {
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

      const data = (await response.json()) as CoinGeckoPriceResponse;
      
      return {
        rate: data.ethereum.idr,
        timestamp: data.ethereum.last_updated_at || Math.floor(Date.now() / 1000)
      };

  } catch (error) {
    console.error(`Error fetching ${base}/${quote} rate:`, error);
    throw error;
  }
}
