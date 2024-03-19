const { verifyToken } = require("../jwt_encryption");
const secret = process.env.ENCRYPTION_KEY;

const { BIP32Factory } = require("bip32");
const ecc = require("tiny-secp256k1");
const bip32 = BIP32Factory(ecc);
const bip39 = require("bip39");
const bitcoin = require("bitcoinjs-lib");
const axios = require('axios');

//Encrypt
// const data = jwt.sign(accCreate, secret);
// return res.json(accCreate);

//Decrypt
// const key = verifyToken(privateKey);

const network = bitcoin.networks.testnet;
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

      let data = {
        address: btcAddress,
        privateKey: node.toWIF(),
      };
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

      let data = {
        address: btcAddress,
        privateKey: node.toWIF(),
        mnemonic: mnemonic,
      };
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
      const keyPair = bitcoin.ECPair.fromWIF(privateKey, network);
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network,
      });
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

          const seed = bip39.mnemonicToSeedSync(mnemonic);
          const root = bip32.fromSeed(seed, network);
        
          let account = root.derivePath(path);
          let keyPair = account.derive(0).derive(0);
          
          let btcAddress = bitcoin.payments.p2pkh({
            pubkey: keyPair.publicKey,
            network: network,
          }).address;
    
          const privateKey = keyPair.toWIF();

          const data = {
                address: btcAddress,
                privateKey: privateKey
            };

        //   const data = jwt.sign(impCreate, secret);
          
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
        const url = `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`;
        const response = await axios.get(url);
        
        const balance = response.data.balance;
        const finalBalance = balance / 100000000;

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

    async sendNative(req, res) {
        try {
            const {  senderPrivateKeyWIF, recipientAddress, amount } = req.body;
            // Decode the sender's private key from Wallet Import Format (WIF)
        const senderKeyPair = bitcoin.ECPair.fromWIF(senderPrivateKeyWIF);

        // Fetch the UTXOs (Unspent Transaction Outputs) for the sender's address
        const senderAddress = bitcoin.payments.p2pkh({ pubkey: senderKeyPair.publicKey }).address;
        const utxosResponse = await axios.get(`https://blockstream.info/testnet/api/addr/${senderAddress}/utxo`);
        const utxos = utxosResponse.data;

        // Construct the transaction
        const txb = new bitcoin.TransactionBuilder(network);

        // Add inputs (UTXOs) to the transaction
        utxos.forEach(utxo => {
            txb.addInput(utxo.txid, utxo.vout);
        });

        // Calculate the amount to send (in satoshis)
        const amountToSend = Math.round(amount * 1e8); // Convert BTC to satoshis

        // Add output (recipient address and amount) to the transaction
        txb.addOutput(recipientAddress, amountToSend);

        // Sign the transaction with the sender's private key
        utxos.forEach((utxo, index) => {
            txb.sign(index, senderKeyPair);
        });

        // Build the transaction
        const tx = txb.build();

        // Serialize the transaction to hex
        const txHex = tx.toHex();

        // Broadcast the transaction to the Bitcoin network
        const broadcastResponse = await axios.post(`https://blockstream.info/testnet/api/tx`, { tx: txHex });
        const transactionId = broadcastResponse.data;
            res.json({ result: transactionId});
        
        } catch (error) {
            console.error('Error sending Bitcoin:', error.message);
            res.status(500).send({ error: error.message });
        }
    }
}

module.exports = new BTC();
