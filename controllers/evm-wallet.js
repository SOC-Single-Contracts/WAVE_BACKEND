const Web3 = require('web3').default;
const bip39 = require("bip39");
const pkutils = require("ethereum-mnemonic-privatekey-utils");
const hdkey = require('ethereumjs-wallet/hdkey');
const jwt = require('jsonwebtoken');
const axios = require("axios");
const fetch = require('node-fetch');
const secret = process.env.ENCRYPTION_KEY;
const web3 = new Web3();
const { encrypt , decrypt } = require("../jwt.config");
const abi_erc20 = require("../EVM_ABI's/ERC20.json");
const abi_erc721 = require("../EVM_ABI's/ERC721.json");

exports.createWallet = async (req, res) =>{
    try {
        const mnemonic = bip39.generateMnemonic();
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const hdWallet = hdkey.fromMasterSeed(seed);
        const walletHdpath = "m/44'/60'/0'/0/";
        const wallet = hdWallet.derivePath(walletHdpath + 0).getWallet();
        const address = `0x${wallet.getAddress().toString("hex")}`;
        const privateKey = wallet.getPrivateKey().toString("hex");
        const data = {
            phrase: encrypt(mnemonic),
            privateKey: encrypt(privateKey),
            address: address,
        };
        return res.status(200).json({message:"New EVM Wallet" , data})
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createAccount = async (req, res) =>{
    try {
        const account = web3.eth.accounts.create();
        const data = {
            privateKey: encrypt(account.privateKey),
            address: account.address,
        }
        return res.status(200).json({message:"New EVM Account" , data})
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.importAccount_Memonic = async (req, res) =>{
    try {
        const { mnemonic } = req.body;
        if (!mnemonic || !bip39.validateMnemonic(decrypt(mnemonic))) {
            res.status(400).send('Invalid mnemonic');
            return;
        }
        const seed = bip39.mnemonicToSeedSync(decrypt(mnemonic));
        const hdWallet = hdkey.fromMasterSeed(seed);
        const walletHdpath = "m/44'/60'/0'/0/";
        const wallet = hdWallet.derivePath(walletHdpath + 0).getWallet();
        const address = `0x${wallet.getAddress().toString("hex")}`;
        const privateKey = wallet.getPrivateKey().toString("hex");
        const data = {
            privateKey:encrypt(privateKey),
            address:address,
        };
        return res.status(200).json({message:"Import Account Using Mnemonic" , data})
        } catch (error) {
          res.status(500).send({ error: error.message });
        }
};

exports.importAccount_PrivateKey = async (req, res) =>{
    try {
        const { privateKey } = req.body;
        if (!privateKey || typeof privateKey !== 'string') {
            return res.status(400).json({ error: 'Invalid private key' });
        }
        const key = "0x"+decrypt(privateKey);
        const account = web3.eth.accounts.privateKeyToAccount(key);
        const data = {
            privateKey:encrypt(account.privateKey),
            address:account.address.toLocaleLowerCase(),
        };
        return res.status(200).json({message:"Import Account Using Mnemonic" , data})
        } catch (error) {
          res.status(500).send({ error: error.message });
        }
};

exports.import_erc20 = async (req, res) => {
    try {
        const { address, chain, network_name, erc20_address } = req.body;
        const erc20_Regex = /^(0x)?[A-Fa-f0-9]{40}$/;
        if (typeof address !== 'string') {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        if (!chain) {
            return res.status(400).json({ error: 'Unsupported chain' });
        }
        if (!erc20_Regex.test(erc20_address)) {
            return res.status(400).send({ error: 'Invalid ERC20 Address' });
        }
        const web3 = new Web3(new Web3.providers.HttpProvider(chain));
        const contract = new web3.eth.Contract(abi_erc20, erc20_address);

        contract.methods.balanceOf(address).call()
        .then(balance => {
            const value = web3.utils.fromWei(balance, "ether");
            return contract.methods.symbol().call()
                .then(async (symbol) => {
                    try {
                        const coingeckoResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/${network_name}/contract/${erc20_address}`);
                        const coinlogo = coingeckoResponse.data.image ? coingeckoResponse.data.image.large : 'https://imgs.search.brave.com/LZvcTgeGyJLUz1OoWZfzfZsr1XmG9V-xG6dzzG02cKo/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9wbmd0/ZWFtLmNvbS9pbWFn/ZXMvY29pbi1wbmct/MjQwMHgyMzk5XzVl/NzZhNDRjX3RyYW5z/cGFyZW50XzIwMmM1/My5wbmcucG5n';
                        const decimals = await contract.methods.decimals().call();
                        const data = {
                            balance: value.toString(),
                            token_address: erc20_address,
                            wallet_address: address,
                            symbol: symbol,
                            decimals: decimals.toString(),
                            rpc: chain,
                            logo: coinlogo,
                            coingekoId:coingeckoResponse.data.id.toString(),
                            name:coingeckoResponse.data.name.toString(),
                        };
                        return res.status(200).send({ message: "ERC20 Import", data });
                    } catch (error) {
                        console.log("Error fetching token image from CoinGecko:", error);
                    }
                });
        })
        .catch(error => {
            res.status(400).send({ error: error.message });
        });

    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

exports.balance = async (req, res) =>{
    try {
        const { address , chain } = req.body;
        if (typeof address !== 'string') {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        if (!chain) {
            return res.status(400).json({ error: 'Unsupported chain' });
        }
        const web3 = new Web3(new Web3.providers.HttpProvider(chain));
        const balanceWei = await web3.eth.getBalance(address);
        const balanceEther = web3.utils.fromWei(balanceWei, 'ether');
        const data = {
            balance:Number(balanceEther),
            address:address,
        };
        return res.status(200).json({message:"Account Balance" , data})
        } catch (error) {
          res.status(500).send({ error: error.message });
        }
};

exports.send = async (req, res) =>{
    try{
        const { privateKey, recipientAddress, amount , chain } = req.body;
        const providerUrl = chain;
        const AddressRegex = /^(0x)?[A-Fa-f0-9]{40}$/; 
        if (!providerUrl)
        {return res.status(400).json({ error: 'Unsupported chain' });}
        if (!AddressRegex.test(recipientAddress))
        {return res.status(400).send({ error: "Address is not valid" });}
       
        const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
        const key = decrypt(privateKey)
        const accountSender = web3.eth.accounts.privateKeyToAccount("0x"+key);
        const amountWei = web3.utils.toWei(amount, "ether").toString();
    
        const transactionObject = {
          from: accountSender.address,
          to: recipientAddress,
          value: amountWei,
        };

        web3.eth.estimateGas(transactionObject)
        .then(gasEstimate => {
          transactionObject.gas = gasEstimate;
          return web3.eth.getGasPrice();
        })
        .then(gasPrice => {
          transactionObject.gasPrice = gasPrice;
          return web3.eth.accounts.signTransaction(transactionObject, key);
        })
        .then(signedTx => web3.eth.sendSignedTransaction(signedTx.rawTransaction))
        .then(receipt => {
            const serializedReceipt = JSON.stringify(receipt, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          );
          
          res.status(200).json(JSON.parse(serializedReceipt));
        })
        .catch(txError => {
          res.status(400).json({ error: txError.message });
        });
      
       }catch(error){
        res.status(500).json({ error: error.message });
       }
}

exports.send_erc20 = async (req, res) =>{
    try {
        const { privateKey, recipientAddress, amount, tokenAddress, chain } = req.body;

        const providerUrl = chain;
        const AddressRegex = /^(0x)?[A-Fa-f0-9]{40}$/;
    
        if (!providerUrl) {
          return res.status(400).json({ error: 'Unsupported chain' });
        }
    
        if (!AddressRegex.test(recipientAddress)) {
          return res.status(400).send({ error: "Address is not valid" });
        }
    
        const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
        const key = decrypt(privateKey)
        const accountSender = web3.eth.accounts.privateKeyToAccount("0x"+key);
        const amountWei = web3.utils.toWei(amount, "ether").toString();
    
        const contract = new web3.eth.Contract(abi_erc20, tokenAddress);
        const balance = await contract.methods.balanceOf(accountSender.address).call()
        const amountEther = web3.utils.fromWei(balance, "ether");
        if(amountEther < amount){
            return res.status(400).send({ error: "Insufficient Balance" });
        }
        const gasPrice = await web3.eth.getGasPrice();
    
        const tx = {
          from: accountSender.address,
          to: tokenAddress,
          gas: 2000000,
          gasPrice: gasPrice,
          data: contract.methods.transfer(recipientAddress, amountWei).encodeABI()
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, key);

        await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
          .on('receipt', receipt => {
              const serializedReceipt = JSON.stringify(receipt, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            );
            res.status(200).send(JSON.parse(serializedReceipt));
          })
          .on('error', error => {
            res.status(400).send({ error: error.message });
          });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
}

exports.transaction = async (req, res) =>{
    try {
        const { address, chain } = req.body;        
        let apiKey;
        let apiUrl;
        if (chain === 'https://bsc.publicnode.com') {
          apiKey = "FBBJRWSBP1P4KIF6QJDHKZHHZPTE7R9WCB"
          apiUrl = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
        } else if (chain === 'https://eth.drpc.org') {
          apiKey = "FRK7H7B1WGN24HV3CY8CKDFUG5IE7XBXV6"
          apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
        }
        const response = await axios.get(apiUrl);
        if (response.status !== 200 || !response.data || response.data.status !== '1') {
          throw new Error('Failed to fetch transactions.');
        }
        const transactions = response.data.result.slice(0, 10).map((tx) => ({
          to: tx.to,
          from: tx.from,
          status: tx.txreceipt_status === '1' ? 'Success' : 'Failed',
          sendOrReceived: tx.from.toLowerCase() === address.toLowerCase() ? 'Sent' : 'Received',
          currencySymbol: chain === 'https://bsc.publicnode.com' ? 'BNB' : 'ETH', 
          currencyAddress: chain === address,
          tx: tx
        }));
        res.json({ transactions });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'An error occurred' });
        }
}

