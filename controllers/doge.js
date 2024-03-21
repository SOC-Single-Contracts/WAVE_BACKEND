const { verifyToken } = require("../jwt_encryption");
const secret = process.env.ENCRYPTION_KEY;
const jwt = require('jsonwebtoken');
const { BIP32Factory } = require("bip32");
const bip39 = require('bip39');
const ecc = require("tiny-secp256k1");
const bip32 = BIP32Factory(ecc);
const bitcoin = require('bitcoinjs-lib');
const axios = require('axios')

const dogecoinNetwork = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: 'bc',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398,
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
};
bitcoin.networks.dogecoin = dogecoinNetwork;
const network = bitcoin.networks.dogecoin;

class DOGE {
  async createAccount(req, res) {
    try {
    // Generate a new random key pair
    const keyPair = bitcoin.ECPair.makeRandom({ network });

    // Get the public and private keys
    const publicKey = keyPair.publicKey.toString('hex');
    const privateKey = keyPair.toWIF();

    // Generate a Dogecoin address
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });

      let accCreate = {
        address: address,
        publicKey:publicKey,
        privateKey: privateKey,
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

      const path = "m/44'/3'/0'/0/0";

      let account = root.derivePath(path);
      let node = account.derive(0).derive(0);
  
      let keyPair = bitcoin.ECPair.fromPrivateKey(node.privateKey, { network: bitcoin.networks.dogecoin });
      let { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.dogecoin });
  
      
      let accCreate = {
        address: address,
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
    // const key = await verifyToken(privateKey);

    try {
      const keyPair = bitcoin.ECPair.fromWIF(privateKey, bitcoin.networks.dogecoin);

      const publicKey = keyPair.publicKey.toString('hex');
      const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.dogecoin });

      const data = {
        address: address,
        privateKey: privateKey,
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
      
      try {
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase.');
          }

         // Generate seed from mnemonic
          const seed = bip39.mnemonicToSeedSync(mnemonic);

          // Derive master node
          const root = bip32.fromSeed(seed, bitcoin.networks.dogecoin);

          // Define the BIP32 path for Dogecoin (m/44'/3'/0'/0/0)
          const path = "m/44'/3'/0'/0/0";

          // Derive account node
          const account = root.derivePath(path);
          const node = account.derive(0).derive(0);

          // Derive key pair from node
          const keyPair = bitcoin.ECPair.fromPrivateKey(node.privateKey, { network: bitcoin.networks.dogecoin });

          // Derive address from key pair
          const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.dogecoin });


          const accCreate = {
                address: address,
                privateKey: node.toWIF()
            };

        
            const data = jwt.sign(accCreate, secret);
            return res.json(data)
       
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
      const url = `https://dogechain.info/api/v1/address/balance/${address}`;
      const response = await axios.get(url);
      const balance = response.data.balance;
      const finalBalance = balance ;

      res.json({ balance: finalBalance });
    } catch (error) {
      if (error instanceof TypeError) {
        return res
          .status(400)
          .json({ error: "Invalid wallet address or chain" });
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
}

async getTransactions(req, res) {
const { address } = req.body;
try {
  // Assuming you're working with Bitcoin's testnet; change the URL for mainnet if needed
  const response = await axios.get(`https://dogechain.info/api/v1/address/transactions/${address}/1`);
  const transactions = response.data.transactions;

  res.json(transactions);
} catch (error) {
  console.error('Error fetching transactions:', error.message);
  res.status(500).send({ error: 'Failed to fetch transactions' });
}
}
// async sendNative(req, res) {
//   try {
//       const { senderPrivateKeyWIF, recipientAddress, amount } = req.body;
//       const senderKeyPair = bitcoin.ECPair.fromWIF(senderPrivateKeyWIF, network);
//       const { address } = bitcoin.payments.p2pkh({
//           pubkey: senderKeyPair.publicKey,
//           network,
//       });

//       // Fetch UTXOs using Blockstream's API
//       const utxosResponse = await axios.get(`https://blockstream.info/testnet/api/address/${address}/utxo`);
//       const utxosData = utxosResponse.data;

//       const txb = new bitcoin.TransactionBuilder(network);

//       let totalUtxoValue = 0;
//       utxosData.forEach((utxo) => {
//           txb.addInput(utxo.txid, utxo.vout);
//           totalUtxoValue += utxo.value;
//       });

//       // console.log('Total UTXO Value:', totalUtxoValue);
//       const targetAddress = recipientAddress;
//       const amountToSend = amount * 100000000; // Convert BTC to Satoshi

//       // Simplified fee calculation - this should be dynamically calculated
//       const fee = 10000;

//       txb.addOutput(targetAddress, amountToSend);

//       const change = totalUtxoValue - amountToSend - fee;
//       if (change > 0) {
//           txb.addOutput(address, change);
//       }

//       // Sign each input
//       for (let i = 0; i < txb.__inputs.length; i++) {
//           txb.sign(i, senderKeyPair);
//       }

//       const tx = txb.build();
//       const txHex = tx.toHex();
  

//       const broadcastResponse = await fetch('https://api.blockcypher.com/v1/btc/test3/txs/push', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ tx: txHex }),
//       });
      
//       const broadcastData = await broadcastResponse.json();
//       console.log(broadcastResponse)
//       if (broadcastData.result && broadcastData.result.error === "Limits reached.") {
//         console.error("Error: Limits reached. Please try again later.");
//     } else {
//       res.json({ result: txHex });
//     }
      


//   } catch (error) {
//       console.error('Error sending Bitcoin:', error.message);
//       res.status(500).send({ error: error.message });
//   }
// }   
async sendNative(req, res) {
  try {
    const { senderPrivateKeyWIF, recipientAddress, amount } = req.body;

    const dogeNetwork = {
      messagePrefix: '\x19Dogecoin Signed Message:\n',
      bech32: 'bc',
      bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4,
      },
      pubKeyHash: 0x1e,
      scriptHash: 0x16,
      wif: 0x9e,
    };

    const senderKeyPair = bitcoin.ECPair.fromWIF(senderPrivateKeyWIF, dogeNetwork);
    const { address } = bitcoin.payments.p2pkh({
        pubkey: senderKeyPair.publicKey,
        network: dogeNetwork,
    });

    // Fetch UTXOs using SoChain API
    const network = 'DOGE'; // Specify the network, DOGE for Dogecoin
    const utxosResponse = await axios.get(`https://sochain.com/api/v2/get_tx_unspent/${network}/${address}`);
    const utxosData = utxosResponse.data.data.txs;

    const txb = new bitcoin.TransactionBuilder(dogeNetwork);

    let totalUtxoValue = 0;
    utxosData.forEach((utxo) => {
        txb.addInput(utxo.txid, utxo.output_no);
        totalUtxoValue += Math.floor(utxo.value * 100000000); // Convert DOGE to satoshi
    });

    const targetAddress = recipientAddress;
    const amountToSend = amount * 100000000; // Convert amount to satoshi

    const fee = 10000; // Placeholder for fee

    txb.addOutput(targetAddress, amountToSend);
    const change = totalUtxoValue - amountToSend - fee;
    if (change > 0) {
        txb.addOutput(address, change);
    }

    // Sign each input
    for (let i = 0; i < utxosData.length; i++) {
        txb.sign(i, senderKeyPair);
    }

    const tx = txb.build();
    const txHex = tx.toHex();

    // Broadcast transaction using SoChain's API
    const broadcastResponse = await axios.post(`https://sochain.com/api/v2/send_tx/${network}`, {
      tx_hex: txHex,
    });

    const broadcastData = broadcastResponse.data;

    res.json({ result: txHex, broadcastData });
  } catch (error) {
    console.error('Error sending Dogecoin:', error.message);
    res.status(500).send({ error: error.message });
  }
}
}

module.exports = new DOGE();
