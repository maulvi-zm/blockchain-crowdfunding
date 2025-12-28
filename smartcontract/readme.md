1. compiling
    ```
    npx hardhat compile
    ```

2. jalanin blockchain local
    ```
    npx hardhat node
    ```

3. send smart contract ke blockchain lokal
    ```
    npx hardhat run scripts/deploy.js --network localhost
    ```

4. run script utk ngetes interaksi

    sebelum run script ini, kodenya harus diubah dulu. ntar abis run deploy.js outputnya kan bakal gini
    ```
    Deploying contract with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    Crowdfunding deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
    Oracle Address set to: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    ```

    nah alamat yg ada di `Crowdfunding deployed to:` itu dicopas ke kode interact.js di line ini
    ```
    const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    ```

    abis itu lgsg jalanin aja kode interact.js nya
    ```
    npx hardhat run scripts/interact.js --network localhost
    ```
