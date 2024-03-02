
const Web3 = require('web3').default;
const axios = require('axios')
const jwt = require('jsonwebtoken');
const { verifyToken } = require("../jwt_encryption");
const secret = process.env.ENCRYPTION_KEY;
const abi = require("../ERC720.json");
const abi721 = require("../ERC721.json");
const fetch = require('node-fetch');
const { Alchemy, Network } = require("alchemy-sdk");

class wallet {
    
    async createAccount(req, res) {
        try {
            const web3 = new Web3();
            var accCreate = web3.eth.accounts.create();
            const data = jwt.sign(accCreate, secret)
            return res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create new account with phrase.' });
        }
    }
      
    async importAccount(req, res) {
              const { privateKey } = req.body;
              if (!privateKey || typeof privateKey !== 'string') {
                return res.status(400).json({ error: 'Invalid private key' });
              }
              const key = await verifyToken(privateKey)
      
              try {
                  const web3 = new Web3();
                  const account = web3.eth.accounts.privateKeyToAccount(key);
                  res.json(account);
              } catch (error) {
                  if (error instanceof TypeError) {
                      return res.status(400).json({ error: 'Invalid wallet address or chain' });
                  }
                  res.status(500).json({ error: 'Internal Server Error' });
              }
    }
  
    async getBalance(req, res) {
        const { walletAddress, chain } = req.body;

        if (typeof walletAddress !== 'string') {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        
        const providerUrl = chain;
        if (!providerUrl) {
            return res.status(400).json({ error: 'Unsupported chain' });
        }

        try {
            const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
            const balanceWei = await web3.eth.getBalance(walletAddress);
            const balanceEther = web3.utils.fromWei(balanceWei, 'ether');

            res.json({ balance: balanceEther });
        } catch (error) {
            if (error instanceof TypeError) {
                return res.status(400).json({ error: 'Invalid wallet address or chain' });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async importToken(req, res) {
        const { walletAddress, chain , tokenAddress } = req.body;     
        const providerUrl = chain;

        // const network = providerUrl === "https://eth.drpc.org" ? Network.ETH_MAINNET :
        //         providerUrl === "https://ethereum-sepolia.publicnode.com" ? Network.ETH_SEPOLIA :
        //         providerUrl === "https://bsc.publicnode.com" ? Network.BSC_MAINNET : 
        //         providerUrl === "https://data-seed-prebsc-2-s1.binance.org:8545/" ? Network.BSC_TESTNET :
        //         Network.ETH_MAINNET; 
        const network = chain === "https://eth.drpc.org" ? 'ethereum' :
        providerUrl === "https://bsc.publicnode.com" ? 'binance-smart-chain' : 
        'ethereum'; 
        // const config = {
        //   apiKey: 'WwjB5CXPaGJY7cX7OOtUIDMzqeZMtTno', 
        //   network: network
        // };
        
        // const alchemy = new Alchemy(config);

        if (!providerUrl) {
            return res.status(400).json({ error: 'Unsupported chain' });
        }

        const rpc = providerUrl;
        const wallet_address = walletAddress;
        const token_address = tokenAddress;
      
        const AddressRegex = /^(0x)?[A-Fa-f0-9]{40}$/;
      
        if (!AddressRegex.test(token_address)) {
          return res.status(400).send({ error: 'Invalid Address' });
        }
      
        const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
        const token = new web3.eth.Contract(abi, token_address);
      
        token.methods.balanceOf(wallet_address).call()
          .then(balance => {
            const value = web3.utils.fromWei(balance, "ether");
            return token.methods.symbol().call()
              .then(async (symbol) => {
                // const metadata = await alchemy.core.getTokenMetadata(tokenAddress);
                const coingeckoResponse =  await fetch(`https://api.coingecko.com/api/v3/coins/${network}/contract/${token_address}`);
                const coingeckoData = await coingeckoResponse.json();
                const coinlogo = coingeckoData.image ? coingeckoData.image.large : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwkdP1O0eDqny2iNuYwZHxn5SR8fLHBiLWqt03X8PK3b7mPawB'


                if(coinlogo){
                const data = {
                  balance: value,
                  token_address: token_address,
                  wallet_address: wallet_address,
                  symbol: symbol,
                  rpc: rpc,
                  // decimals: metadata.decimals,
                  logo: coinlogo, 
                  // name: metadata.name,
                };
                res.status(200).send(data);
               }else{
                const data = {
                  balance: value,
                  token_address: token_address,
                  wallet_address: wallet_address,
                  symbol: symbol,
                  rpc: rpc
                };
                res.status(200).send(data);
               }
          
              });
          })
          .catch(error => {
            res.status(400).send({ error: 'Error occurred while fetching token data' });
          });
    }

    async importToken721(req, res) {
        const { chain, walletAddress, contractAddress , tokenId} = req.body;
        const web3 = new Web3(new Web3.providers.HttpProvider(chain));
        const contract = new web3.eth.Contract(abi721, contractAddress);
        
        try {
            const tokenURI = await contract.methods.tokenURI(Number(tokenId)).call();
            const owner = await contract.methods.ownerOf(tokenId).call();
            if(walletAddress ==  owner){
            let metadata = null;
            try {
                const metadataResponse = await axios.get(tokenURI);
                metadata = metadataResponse.data;
            } catch (error) {
                console.error('Error fetching metadata for token:', tokenId, error);
            }
            res.status(200).send({ contractAddress, tokenId, tokenURI, owner, metadata });
            }else{
            res.status(404).send({ massage: "'NFT can’t be added as the ownership details do not match. Make sure you have entered correct information." });
            }
      
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
      
    }

    async sendNative(req, res) {
       try{
        const { privateKey, recipientAddress, amount , chain } = req.body;
        const providerUrl = chain;
        const AddressRegex = /^(0x)?[A-Fa-f0-9]{40}$/; 
        if (!providerUrl)
        {return res.status(400).json({ error: 'Unsupported chain' });}
        if (!AddressRegex.test(recipientAddress))
        {return res.status(400).send({ error: "Address is not valid" });}
       
        const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
        const key = await verifyToken(privateKey)
        const accountSender = web3.eth.accounts.privateKeyToAccount(key);
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
          console.error(txError.message);
          res.status(400).json({ error: txError.message });
        });
      

       }catch(error){
        res.status(500).json({ error: error.message });
       }
    
    }

    async sendNonNative(req, res) {
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
          const key = await verifyToken(privateKey)
          const accountSender = web3.eth.accounts.privateKeyToAccount(key);
          const amountWei = web3.utils.toWei(amount, "ether").toString();
      
          const contract = new web3.eth.Contract(abi, tokenAddress);
      
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

    async sendNonNative721(req, res) {
      const { chain, privateKey, recipientAddress, contractAddress, tokenId } = req.body;
      try {
        const web3 = new Web3(new Web3.providers.HttpProvider(chain));
        const contract = new web3.eth.Contract(abi721, contractAddress);
        const key = await verifyToken(privateKey)
        const senderAccount = web3.eth.accounts.privateKeyToAccount(key);
    
        // Check if the sender owns the NFT
        const owner = await contract.methods.ownerOf(tokenId).call();
        if (owner.toLowerCase() !== senderAccount.address.toLowerCase()) {
          throw new Error('Sender does not own the NFT.');
        }
    
          // Encode the transfer function
          const data = contract.methods.safeTransferFrom(senderAccount.address, recipientAddress, tokenId).encodeABI();

          // Estimate gas and gas price
          const gas = await web3.eth.estimateGas({
              to: contractAddress,
              data,
          });
          const gasPrice = await web3.eth.getGasPrice();
        // Create and sign the transaction
        const tx = {
          from: senderAccount.address,
          to: contractAddress,
          gas,
          gasPrice,
          data,
      };

      const signedTx = await web3.eth.accounts.signTransaction(tx, key);

      // Send the signed transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      res.status(200).send(receipt);
      } catch (error) {
        res.status(200).send(error);
      }
    }
    
    async getEVMtransaction(req, res) {
      try {
      const { walletAddress, chain } = req.body;
      
      // const web3 = new Web3(new Web3.providers.HttpProvider(chain));
      
      let apiKey;
      let apiUrl;
      if (chain === 'https://bsc.publicnode.com') {
        // For BSC, use BscScan API
        apiKey = "FBBJRWSBP1P4KIF6QJDHKZHHZPTE7R9WCB"
        apiUrl = `https://api.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
      } else if (chain === 'https://eth.drpc.org') {
        // For Ethereum, use Etherscan API
        apiKey = "FRK7H7B1WGN24HV3CY8CKDFUG5IE7XBXV6"
        apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
      }

      // Make the API request
      const response = await axios.get(apiUrl);
      console.log(">>>>>>>>>>",response)
      if (response.status !== 200 || !response.data || response.data.status !== '1') {
        throw new Error('Failed to fetch transactions.');
      }

      // Extract and format transaction details
      const transactions = response.data.result.slice(0, 10).map((tx) => ({
        to: tx.to,
        from: tx.from,
        status: tx.txreceipt_status === '1' ? 'Success' : 'Failed',
        sendOrReceived: tx.from.toLowerCase() === walletAddress.toLowerCase() ? 'Sent' : 'Received',
        currencySymbol: chain === 'https://bsc.publicnode.com' ? 'BNB' : 'ETH', 
        currencyAddress: chain === walletAddress,
        tx: tx
      }));

        res.json({ transactions });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
      }
    }

    async impTokenErc20(req,res){
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
        const contract = new web3.eth.Contract(abi, erc20_address);

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
    }
  
}

module.exports = new wallet();

