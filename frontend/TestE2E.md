1. Lakuin dl tahapan smart contract sampai deployment (lihat readme smart contract)
    ```
    npx hardhat compile
    ```

2. jalanin backend dan front end (cd frontend atau backend)
    ```
    npm run dev
    ```

3. Buka page "Start a Fund Raiser", masukin semua input-nya dan submit


4. Nanti Bakal connect ke MetaMask (pastiin udah di tambahin di extension web-nya), abis itu tambahin wallet di akun MetaMask 
   dan pilih imported accounts dan masukin private key dari salah satu akun hasil dari command "npx hardhat node" dan klik confirm kalau udah connect ke imported account tersebut

4. Lihat log Backend dan udah berhasil nangkep event dan stored di database

5. Contoh implementasi E2E kirim dari FE ke Wallet ke SC ke BE, bisa lihat di script src/pages/CreateCampaignPage.tsx

    