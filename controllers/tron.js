const { verifyToken } = require("../jwt_encryption");
const secret = process.env.ENCRYPTION_KEY;

const hdkey = require('hdkey')
const bip39 = require('bip39')
const bip32 = require('bip32')
const bitcoin = require('bitcoinjs-lib');
const bs58 = require('bs58');

// const { hdkey } = require('ethereum-cryptography/bip32');
const { publicKeyConvert } = require('ethereum-cryptography/secp256k1');
const { bufferToHex } = require('ethereum-cryptography/utils');

const axios = require('axios');
const TronWeb = require('tronweb')

//Encrypt
// const data = jwt.sign(accCreate, secret);
// return res.json(accCreate);

//Decrypt
// const key = verifyToken(privateKey);

let testnet = 'https://api.shasta.trongrid.io'
let mainnet = 'https://api.trongrid.io'

const NETWORK = testnet
class TRON {

  async createAccount(req, res) {
    try {
      const tronWeb = new TronWeb({
        fullHost: NETWORK, 
        privateKey: TronWeb.utils.accounts.generateAccount().privateKey,
      });
      let data = {
        address: tronWeb.defaultAddress.base58,
        privateKey: tronWeb.defaultPrivateKey,
      };
      return res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to create new account." });
    }
  }

  async createWallet(req, res) {
    try {
      const mnemonic = bip39.generateMnemonic();
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const root = bitcoin.bip32.fromSeed(seed);
      const tronDerivationPath = "m/44'/195'/0'/0/0";
      const child = root.derivePath(tronDerivationPath);
      const privateKey = child.privateKey.toString('hex');
  
      const tronWeb = new TronWeb({
        fullHost: NETWORK, 
        privateKey: privateKey,
      });
  
      let data = {
        address: tronWeb.address.fromPrivateKey(privateKey),
        privateKey: privateKey,
        mnemonic: mnemonic,
      };
  
      return res.json(data);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      res.status(500).json({ error: "Failed to create new account." });
    }
  }

  async importAccount(req, res) {
    const { privateKey } = req.body;
  
    if (!privateKey) {
      return res.status(400).json({ error: "No private key provided." });
    }
  
    try {
      const tronWeb = new TronWeb({
        fullHost: NETWORK,
        privateKey: privateKey,
      });
  
      const address = tronWeb.address.fromPrivateKey(privateKey);
  
      const data = {
        address: address,
        privateKey: privateKey,
      };
  
      return res.json(data);
    } catch (error) {
      console.error('Failed to import account:', error);
      res.status(500).json({ error: "Failed to import account." });
    }
  }
  
  async importAccountMemonic(req, res) {
      const { mnemonic } = req.body;
      try {
        if (!bip39.validateMnemonic(mnemonic)) {
          throw new Error('Invalid mnemonic phrase.');
        }
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const root = bitcoin.bip32.fromSeed(seed);
        const tronDerivationPath = "m/44'/195'/0'/0/0";
        const child = root.derivePath(tronDerivationPath);
        const privateKey = child.privateKey.toString('hex');
        console.log(privateKey)

        const tronWeb = new TronWeb({
            fullHost: NETWORK, 
            privateKey: privateKey,
        });

        const data = {
            address: tronWeb.address.fromPrivateKey(privateKey),
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
  
    const tronWeb = new TronWeb({
      fullHost: NETWORK,
    });

    if (!address || !tronWeb.isAddress(address)) {
      return res.status(400).json({ error: "Invalid or no address provided." });
    }
  
    try {
      // Get the balance in SUN (1 TRX = 1,000,000 SUN)
      const balanceInSun = await tronWeb.trx.getBalance(address);
      // Convert balance to TRX for readability
      const balanceInTrx = tronWeb.fromSun(balanceInSun);
  
      const data = {
        balance: balanceInTrx,
      };
  
      return res.json(data);
    } catch (error) {
      console.error('Failed to get balance:', error);
      res.status(500).json({ error: "Failed to retrieve account balance." });
    }
  }

  async getTransactions(req, res) {
    const { address } = req.body;
    const tronWeb = new TronWeb({
      fullHost: NETWORK,
    });
    try {
      const url = `${NETWORK}/v1/accounts/${address}/transactions?only_confirmed=true&limit=10&order_by=block_timestamp,desc`;
      const response = await axios.get(url);
      const transactions = response.data.data.map(tx => ({
        feeTRX: tronWeb.fromSun(tx.fee), 
        fee: tx.fee, 
        amount: tronWeb.fromSun(tx.raw_data.contract[0].parameter.value.amount) || 'N/A', 
        sender: tx.raw_data.contract[0].parameter.value.owner_address || 'N/A',
        recipient: tx.raw_data.contract[0].parameter.value.to_address || 'N/A',
        status: tx.ret[0].contractRet, 
        timestamp: tx.raw_data.timestamp,
        transactionType: tx.raw_data.contract[0].type, 
        senderOrReceiver: address === tx.raw_data.contract[0].parameter.value.owner_address ? 'Send' : 'Received'
      }));
  
      return res.json(transactions);
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return res.status(500).json({ error: "Failed to retrieve transactions." });
    }
  }

  async sendTRX(req, res) {
    const { privateKey, recipientAddress, amount } = req.body;
  
    // Initialize TronWeb with the sender's privateKey
    const tronWeb = new TronWeb({
      fullHost: NETWORK,
      privateKey: privateKey,
    });
  
    try {
      // Convert the amount to SUN, as transactions on TRON are denominated in SUN
      const amountInSun = tronWeb.toSun(amount);
  
      // Create a transaction
      const tradeobj = await tronWeb.transactionBuilder.sendTrx(recipientAddress, amountInSun, tronWeb.defaultAddress.base58);
  
      // Sign the transaction
      const signedTxn = await tronWeb.trx.sign(tradeobj, privateKey);
  
      // Broadcast the transaction
      const receipt = await tronWeb.trx.sendRawTransaction(signedTxn);
  
      if (receipt.result) {
        return res.json({ success: true, message: "Transaction successful", transactionHash: receipt.txid });
      } else {
        throw new Error('Failed to send TRX');
      }
    } catch (error) {
      console.error('Error sending TRX:', error);
      return res.status(500).json({ success: false, message: "Failed to send TRX", error: error.toString() });
    }
  }
  
  async estimateTRXFee(req, res) {
    const { senderAddress, recipientAddress, amount } = req.body;
    try {
      const tronWeb = new TronWeb({
        fullHost: NETWORK,
      });
        // Convert the amount to SUN as TronWeb uses SUN for transactions
        const amountInSun = tronWeb.toSun(amount);
     
        // Create a transaction object without signing or broadcasting it
        const transaction = await tronWeb.transactionBuilder.sendTrx(recipientAddress, amount, senderAddress);
        console.log(transaction)
        // Estimate the fee based on network parameters and the transaction
        // Note: TronWeb does not directly provide fee estimates. You might need to simulate the transaction or use fixed values for bandwidth and energy consumption.
        const bandwidthPointCost = await tronWeb.trx.getBandwidthPrice(); // This method might not exist as is. You'd need to adjust based on actual available methods or use fixed values.
        const energyPointCost = await tronWeb.trx.getEnergyPrice(); // Adjust based on actual methods to get current energy price or use fixed values.

        const estimatedBandwidthCost = transaction.raw_data.contract[0].parameter.value.fee_limit / bandwidthPointCost; // Simplified and hypothetical calculation
        const estimatedEnergyCost = (transaction.raw_data.contract[0].parameter.value.call_value || 0) / energyPointCost; // Hypothetical calculation

        // Combine costs for a total estimate (this is a simplified example; adjust your calculations based on actual network parameters and your application's needs)
        const estimatedFee = estimatedBandwidthCost + estimatedEnergyCost;

        return res.json({
            estimatedFee: estimatedFee,
            estimatedBandwidthCost: estimatedBandwidthCost,
            estimatedEnergyCost: estimatedEnergyCost,
        });

    } catch (error) {
        console.error('Failed to estimate TRX fee:', error);
        return res.status(500).json({ error: "Failed to estimate fee." });
    }
  }
 
}

module.exports = new TRON();
