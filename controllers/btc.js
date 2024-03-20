const { verifyToken } = require("../jwt_encryption");
const secret = process.env.ENCRYPTION_KEY;
const jwt = require('jsonwebtoken');
const { BIP32Factory } = require("bip32");
const ecc = require("tiny-secp256k1");
const bip32 = BIP32Factory(ecc);
const bip39 = require("bip39");
const bitcoin = require("bitcoinjs-lib");
const axios = require('axios');
const BitcoinCore = require('bitcoin-core');

//Encrypt
// const data = jwt.sign(accCreate, secret);
// return res.json(accCreate);

//Decrypt
// const key = verifyToken(privateKey);

const network = bitcoin.networks.testnet;

const bitcoinClient = new BitcoinCore(network);

const path = `m/44'/0'/0'/0`;

const accountA = {
    "address": "msZsq22YXGXEtcjfWoxwxatYpm6sQGn4LT",
    "privateKey": "cTMbdPRokRm7gmVGpGC5c2mjC6DJc54eGMcdsWTJK5uAsukhhqj1",
    "mnemonic": "frame build safe vapor excuse stone monitor glove comic sweet perfect tent"
  }

class BTC {
  async createAccount(req, res) {
    try {
      let mnemonic = bip39.generateMnemonic();
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      let root = bip32.fromSeed(seed, network);

      let account = root.derivePath(path);
      let node = account.derive(0).derive(0);

      let btcAddress = bitcoin.payments.p2pkh({
        pubkey: node.publicKey,
        network: network,
      }).address;

      let accCreate = {
        address: btcAddress,
        privateKey: node.toWIF(),
      };
      const data = jwt.sign(accCreate, secret);
      return res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to create new account." });
    }
  }

  async createWallet(req, res) {
    try {
      let mnemonic = bip39.generateMnemonic();
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      let root = bip32.fromSeed(seed, network);

      let account = root.derivePath(path);
      let node = account.derive(0).derive(0);

      let btcAddress = bitcoin.payments.p2pkh({
        pubkey: node.publicKey,
        network: network,
      }).address;

      let accCreate = {
        address: btcAddress,
        privateKey: node.toWIF(),
        mnemonic: mnemonic,
      };
      const data = jwt.sign(accCreate, secret);
      return res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to create new account." });
    }
  }

  async importAccount(req, res) {
    const { privateKey } = req.body;
    if (!privateKey || typeof privateKey !== "string") {
      return res.status(400).json({ error: "Invalid private key" });
    }
    const key = await verifyToken(privateKey);

    try {
      const keyPair = bitcoin.ECPair.fromWIF(key, network);
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network,
      });
      const data = {
        address: address,
        privateKey: key,
      };
      res.json(data);
    } catch (error) {
      if (error instanceof TypeError) {
        return res
          .status(400)
          .json({ error: error.message });
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async importAccountMemonic(req, res) {
      const { mnemonic } = req.body;
      console.log(mnemonic)
      try {
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase.');
          }

          const seed = bip39.mnemonicToSeedSync(mnemonic);
          const root = bip32.fromSeed(seed, network);
        
          let account = root.derivePath(path);
          let keyPair = account.derive(0).derive(0);
          
          let btcAddress = bitcoin.payments.p2pkh({
            pubkey: keyPair.publicKey,
            network: network,
          }).address;
    
          const privateKey = keyPair.toWIF();

          const impCreate = {
                address: btcAddress,
                privateKey: privateKey
            };

          const data = jwt.sign(impCreate, secret);
          
        return res.json(data);
       
      } catch (error) {
          res.status(500).send({ error: error });
      }
  }

  async getBalance(req, res) {
      const { address } = req.body;

      if (typeof address !== "string") {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      try {
        // https://blockstream.info/testnet/api/
        // https://blockstream.info/api/
        const response = await axios.get(`https://blockstream.info/testnet/api/address/${address}/utxo`);
        const utxos = response.data;

        // Calculate total balance from unspent transaction outputs (UTXOs) in Satoshis
        let balanceSatoshis = 0;
        utxos.forEach(utxo => {
            balanceSatoshis += utxo.value;
        });

        // Convert balance from Satoshis to BTC
        const balanceBTC = balanceSatoshis / 100000000;
        // const url = `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`;
        // const response = await axios.get(url);
        
        // const balance = response.data.balance;
        // const finalBalance = balance / 100000000;

        res.json({ balance: balanceBTC });
      } catch (error) {
        if (error instanceof TypeError) {
          return res
            .status(400)
            .json({ error: "Invalid wallet address or chain" });
        }
        res.status(500).json({ error: "Internal Server Error" });
      }
  }

  // {
  //   "address": "n3Cun8Jmjj4PXhStMSZwSvzcvvSkEcdXcS",
  //   "privateKey": "cVHoW5myzdxb7zo9LZGspAQyik9QupPULH2tTJLYo835xK9Sf8S5",
  //   "mnemonic": "analyst hen until observe salon maid search middle van future embrace call"
  // }

    async sendNative(req, res) {
        try {
            const { senderPrivateKeyWIF, recipientAddress, amount } = req.body;
            const senderKeyPair = bitcoin.ECPair.fromWIF(senderPrivateKeyWIF, network);
            const { address } = bitcoin.payments.p2pkh({
                pubkey: senderKeyPair.publicKey,
                network,
            });

            // Fetch UTXOs using Blockstream's API
            const utxosResponse = await axios.get(`https://blockstream.info/testnet/api/address/${address}/utxo`);
            const utxosData = utxosResponse.data;

            const txb = new bitcoin.TransactionBuilder(network);

            let totalUtxoValue = 0;
            utxosData.forEach((utxo) => {
                txb.addInput(utxo.txid, utxo.vout);
                totalUtxoValue += utxo.value;
            });

            // console.log('Total UTXO Value:', totalUtxoValue);
            const targetAddress = recipientAddress;
            const amountToSend = amount * 100000000; // Convert BTC to Satoshi

            // Simplified fee calculation - this should be dynamically calculated
            const fee = 10000;

            txb.addOutput(targetAddress, amountToSend);

            const change = totalUtxoValue - amountToSend - fee;
            if (change > 0) {
                txb.addOutput(address, change);
            }

            // Sign each input
            for (let i = 0; i < txb.__inputs.length; i++) {
                txb.sign(i, senderKeyPair);
            }

            const tx = txb.build();
            const txHex = tx.toHex();
        

            const broadcastResponse = await fetch('https://api.blockcypher.com/v1/btc/test3/txs/push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ tx: txHex }),
            });
            
            const broadcastData = await broadcastResponse.json();
            console.log(broadcastResponse)
            if (broadcastData.result && broadcastData.result.error === "Limits reached.") {
              console.error("Error: Limits reached. Please try again later.");
          } else {
            res.json({ result: txHex });
          }
            // if(broadcastData){
            //   res.json({ result: broadcastData });
            // }else{
            //   res.json({ result: txHex });
            // }

            // try{
            
            //   const broadcastResponse = await fetch('https://api.blockchain.info/v3/pushtx', {
            //     method: 'POST',
            //     headers: {
            //       'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({ tx: txHex }),
            //   });
            
            //   const broadcastData = await broadcastResponse.json();
            //   res.json({ result: broadcastData });
            
            // }catch(error){
            //    const broadcastResponse = await fetch('https://api.blockcypher.com/v1/btc/test3/txs/push', {
            //     method: 'POST',
            //     headers: {
            //       'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({ tx: txHex }),
            //   });
              
            //   const broadcastData = await broadcastResponse.json();
            //   res.json({ result: broadcastData });
            // }


        } catch (error) {
            console.error('Error sending Bitcoin:', error.message);
            res.status(500).send({ error: error.message });
        }
    }   
    async ConfirmNativeTransaction(req, res) {
      try {
        const { senderPrivateKeyWIF, recipientAddress, amount } = req.body;
    
        // Convert the sender's private key from WIF and generate the sender's address
        const senderKeyPair = bitcoin.ECPair.fromWIF(senderPrivateKeyWIF, network);
        const { address } = bitcoin.payments.p2pkh({
          pubkey: senderKeyPair.publicKey,
          network,
        });
    
        // Fetch UTXOs using Blockstream's API
        const utxosResponse = await axios.get(`https://blockstream.info/testnet/api/address/${address}/utxo`);
        const utxosData = utxosResponse.data;
    
        const txb = new bitcoin.TransactionBuilder(network);
        let totalUtxoValue = 0;
    
        // Process each UTXO for the transaction
        utxosData.forEach((utxo) => {
          txb.addInput(utxo.txid, utxo.vout);
          totalUtxoValue += utxo.value;
        });
    
        // console.log('Total UTXO Value:', totalUtxoValue);
        const targetAddress = recipientAddress;
        const amountToSend = amount * 100000000; // Convert BTC to Satoshi
    
        // Estimate fee (placeholder logic; should be adjusted based on actual fee rates)
        const fee = 10000; // Flat fee for example; adjust based on network conditions
    
        // Add the output for the recipient
        txb.addOutput(targetAddress, amountToSend);
    
        // Calculate change and add an output for it
        const change = totalUtxoValue - amountToSend - fee;
        if (change > 0) {
          txb.addOutput(address, change);
        }
    
        let data = {
          totalUtxoValue: totalUtxoValue / 100000000,
          amountToSend: amountToSend / 100000000,
          fee: fee / 100000000,
          change: change / 100000000,
        };
    
        // Note: The transaction is still not signed or broadcasted
        res.json({ result: data });
    
      } catch (error) {
        console.error('Error in ConfirmNativeTransaction:', error.message);
        res.status(500).send({ error: error.message });
      }
    }
    async getTransactions(req, res) {
      const { address } = req.body;
      try {
        // Assuming you're working with Bitcoin's testnet; change the URL for mainnet if needed
        const response = await axios.get(`https://blockstream.info/testnet/api/address/${address}/txs`);
        const transactions = response.data;
    
        // Return only the 10 most recent transactions
        const recentTransactions = transactions.slice(0, 10);
    
        res.json(recentTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error.message);
        res.status(500).send({ error: 'Failed to fetch transactions' });
      }
    }
}

module.exports = new BTC();
