const { verifyToken } = require("../jwt_encryption");
const secret = process.env.ENCRYPTION_KEY;

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

      let data = {
        address: address,
        publicKey:publicKey,
        privateKey: privateKey,
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

      const path = "m/44'/3'/0'/0/0";

      let account = root.derivePath(path);
      let node = account.derive(0).derive(0);
  
      let keyPair = bitcoin.ECPair.fromPrivateKey(node.privateKey, { network: bitcoin.networks.dogecoin });
      let { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.dogecoin });
  
      
      let data = {
        address: address,
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


          const data = {
                address: address,
                privateKey: node.toWIF()
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
      const url = `https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance`;
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
        const senderKeyPair = dogecoin.ECPair.fromWIF(senderPrivateKeyWIF);

        // Fetch the UTXOs (Unspent Transaction Outputs) for the sender's address
        const senderAddress = dogecoin.payments.p2pkh({ pubkey: senderKeyPair.publicKey }).address;
        const utxosResponse = await axios.get(`https://blockstream.info/testnet/api/addr/${senderAddress}/utxo`);
        const utxos = utxosResponse.data;

        // Construct the transaction
        const txb = new dogecoin.TransactionBuilder(network);

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

        // Broadcast the transaction to the dogecoin network
        const broadcastResponse = await axios.post(`https://blockstream.info/testnet/api/tx`, { tx: txHex });
        const transactionId = broadcastResponse.data;
            res.json({ result: transactionId});
        
        } catch (error) {
            console.error('Error sending dogecoin:', error.message);
            res.status(500).send({ error: error.message });
        }
    }

}

module.exports = new DOGE();
