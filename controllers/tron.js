const { verifyToken } = require("../jwt_encryption");
const secret = process.env.ENCRYPTION_KEY;
const jwt = require('jsonwebtoken');
const hdkey = require('hdkey')
const bip39 = require('bip39')
const bip32 = require('bip32')
const bitcoin = require('bitcoinjs-lib');
const bs58 = require('bs58');
const abi = require("../tron_erc720.json");
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

const NETWORK = mainnet

async function getTokenDetailsFromCoinGecko(tokenNameOrSymbol) {
  try {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/list`);
      const coinList = await response.json();

      const token = coinList.find(coin => 
          coin.name.toLowerCase() === tokenNameOrSymbol.toLowerCase() || 
          coin.symbol.toLowerCase() === tokenNameOrSymbol.toLowerCase()
      );

      if (token) {
          console.log('CoinGecko ID for', tokenNameOrSymbol, ':', token.id);
          console.log('Image URL:', token.image);
      } else {
          console.log('Token not found on CoinGecko.');
      }
  } catch (error) {
      console.error('Error occurred while fetching token details from CoinGecko:', error);
  }
}

class TRON {

  async createAccount(req, res) {
    try {
      const tronWeb = new TronWeb({
        fullHost: NETWORK, 
        privateKey: TronWeb.utils.accounts.generateAccount().privateKey,
      });
      let accCreate = {
        address: tronWeb.defaultAddress.base58,
        privateKey: tronWeb.defaultPrivateKey,
      };
      const data = jwt.sign(accCreate, secret);
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
  
      let accCreate = {
        address: tronWeb.address.fromPrivateKey(privateKey),
        privateKey: privateKey,
        mnemonic: mnemonic,
      };
    const data = jwt.sign(accCreate, secret);
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

        const accCreate = {
            address: tronWeb.address.fromPrivateKey(privateKey),
            privateKey: privateKey
        };

        const data = jwt.sign(accCreate, secret);
        return res.json(data)
       
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


  async transferTokens(req, res) {
    const { privateKey, contractAddress, toAddress, amount } = req.body;
    const tronWeb = new TronWeb({
        fullHost: NETWORK,
    }); 

    console.log(req.body)

    try {
        // Ensure all required parameters are provided
        if (!privateKey || !contractAddress || !toAddress || !amount) {
            throw new Error('Missing required parameters');
        }

        // Set the private key and address
        tronWeb.setPrivateKey(privateKey);
        tronWeb.setAddress(tronWeb.address.fromPrivateKey(privateKey));

        // Check if sender's account exists
        const accountExists = await tronWeb.trx.getAccount(tronWeb.defaultAddress.base58);
        if (!accountExists) {
            throw new Error('Sender\'s account does not exist on the Tron blockchain');
        }

        // Check if recipient's account exists
        const recipientExists = await tronWeb.trx.getAccount(toAddress);
        if (!recipientExists) {
            throw new Error('Recipient\'s account does not exist on the Tron blockchain');
        }

        // Instantiate the token contract
        const contract = await tronWeb.contract().at(contractAddress);

        // Invoke the transfer method of the token contract
        const transaction = await contract.transfer(toAddress, amount).send();
        console.log("Transaction",transaction)
        // Wait for the transaction to be confirmed
        await waitForConfirmation(tronWeb, transaction);

        // Check if transaction hash is valid
        if (transaction && transaction.result && transaction.result === true) {
            return res.json({ success: true, message: "Transaction successful", transactionHash: transaction.txid });
        } else {
            throw new Error('Failed to send tokens');
        }
    } catch (error) {
        console.error('Error sending tokens:', error);

        // Return appropriate error response
        return res.status(500).json({ success: false, message: "Failed to send tokens", error: error.toString() });
    }
}

// Function to wait for transaction confirmation





  async getTokenBalance(req, res) {
    const { walletAddress, tokenAddress } = req.body;
    const tronWeb = new TronWeb({
      fullHost: NETWORK,
    });
    tronWeb.setAddress(walletAddress); 

    try {
      const contract = await tronWeb.contract().at(tokenAddress);
      const name = await contract.name().call();
      const symbol = await contract.symbol().call();
      const decimals = await contract.decimals().call();
      const totalSupply = await contract.totalSupply().call();
      const balance = await contract.balanceOf(walletAddress).call();
      
      const coingeckoResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/tron/contract/${tokenAddress}`
      );
      const coingeckoData = await coingeckoResponse.json();
      const coinlogo = coingeckoData.image
              ? coingeckoData.image.large
              : "https://imgs.search.brave.com/LZvcTgeGyJLUz1OoWZfzfZsr1XmG9V-xG6dzzG02cKo/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9wbmd0/ZWFtLmNvbS9pbWFn/ZXMvY29pbi1wbmct/MjQwMHgyMzk5XzVl/NzZhNDRjX3RyYW5z/cGFyZW50XzIwMmM1/My5wbmcucG5n";

      let data = {
        balance: `${balance.toNumber()}`,
        coingeckoId: coingeckoData?.id,
        decimals: decimals,
        logo: coinlogo,
        name: name,
        rpc: NETWORK,
        symbol: symbol,
        totalSupply:totalSupply,
        token_address: tokenAddress,
        wallet_address: walletAddress
      }
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to retrieve token balance", error: error.toString() });
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
async function waitForConfirmation(tronWeb, transaction) {
  const intervalId = setInterval(async () => {
      const receipt = await tronWeb.trx.getTransactionInfo(transaction.txid);
      if (receipt && receipt.receipt && receipt.receipt.result) {
          clearInterval(intervalId);
      }
  }, 1000); // Check every second
}
module.exports = new TRON();
