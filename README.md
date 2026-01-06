# blockchain-crowdfunding

## Quick start (local)

### 1) Install dependencies

Smart contract:
```
cd smartcontract
npm install
```

Backend:
```
cd backend
npm install
```

Frontend:
```
cd frontend
npm install
```

### 2) Start local chain + deploy contract

Terminal A:
```
cd smartcontract
npx hardhat node
```

Terminal B:
```
cd smartcontract
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed contract address and update:
- `backend/.env` → `CONTRACT_ADDRESS`
- `backend/oracle/.env` → `CONTRACT_ADDRESS`
- `frontend/.env` → `VITE_CROWDFUNDING_ADDRESS`

### 3) Start database (PostgreSQL)

Option A (docker):
```
cd backend
npm run docker:up
```

Option B (local Postgres):
```
cd backend
npm run db:setup
npm run db:migrate
```

### 4) Start backend indexer API

```
cd backend
npm run dev
```

### 5) Start oracle service (separate process)

```
cd backend
npm run oracle
```

Oracle config lives in `backend/oracle/.env` (RPC URL, contract address, oracle private key, exchange rate API).

### 6) Start frontend

```
cd frontend
npm run dev
```

Frontend config lives in `frontend/.env`.

## Notes

- The oracle must be running to finalize a campaign (it supplies ETH/IDR rate).
- If you redeploy the contract, update all three env files with the new address.
