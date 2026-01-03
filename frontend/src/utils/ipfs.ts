const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY
const PINATA_API_SECRET = import.meta.env.VITE_PINATA_API_SECRET

const PINATA_BASE_URL = 'https://api.pinata.cloud'
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/'

/**
 * Upload FILE (image)
 */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${PINATA_BASE_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_API_SECRET
    },
    body: formData
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pinata upload failed: ${err}`)
  }

  const data = await res.json()
  return data.IpfsHash
}

/**
 * Upload JSON metadata
 */
export async function uploadJSON(json: object): Promise<string> {
  const res = await fetch(`${PINATA_BASE_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_API_SECRET
    },
    body: JSON.stringify(json)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pinata JSON upload failed: ${err}`)
  }

  const data = await res.json()
  return data.IpfsHash
}

export function ipfsToHttp(uriOrCid: string): string {
  if (!uriOrCid) return ''
  if (uriOrCid.startsWith('ipfs://')) return `${PINATA_GATEWAY}${uriOrCid.slice(7)}`
  if (uriOrCid.startsWith('http://') || uriOrCid.startsWith('https://')) return uriOrCid
  return `${PINATA_GATEWAY}${uriOrCid}`
}

export async function fetchIpfsJson<T = any>(cid: string): Promise<T> {
  const url = ipfsToHttp(cid)
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`IPFS fetch failed: ${err}`)
  }
  return res.json()
}
