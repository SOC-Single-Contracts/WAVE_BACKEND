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

const network = bitcoin.networks.bitcoin;
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

  // async importToken(req, res) {
    //   const { address, tokenAddress } = req.body;
      
    //   try {
    //     const esploraApiUrl = `https://blockstream.info/api/address/${address}/assets`;
    //     const response = await axios.get(esploraApiUrl);

    //     const tokens = response.data;

    //     res.json({ balance: tokens });
    //     tokens.forEach(token => {
    //         console.log(`Token ID: ${token.asset}, Name: ${token.name}, Balance: ${token.quantity}`);
    //       });
    //   } catch (error) {
    //     console.error('Error listing Bitcoin tokens:', error.message);
    //     res.status(500).json({ error: "Error fetching token balance:" });
    //   }
    // }

  //   async importToken721(req, res) {
  //     const { chain, walletAddress, contractAddress, tokenId } = req.body;
  //     const web3 = new Web3(new Web3.providers.HttpProvider(chain));
  //     const contract = new web3.eth.Contract(abi721, contractAddress);

  //     try {
  //       const tokenURI = await contract.methods.tokenURI(Number(tokenId)).call();
  //       const owner = await contract.methods.ownerOf(tokenId).call();
  //       if (walletAddress == owner) {
  //         let metadata = null;
  //         try {
  //           const metadataResponse = await axios.get(tokenURI);
  //           metadata = metadataResponse.data;
  //         } catch (error) {
  //           console.error("Error fetching metadata for token:", tokenId, error);
  //         }
  //         res
  //           .status(200)
  //           .send({ contractAddress, tokenId, tokenURI, owner, metadata });
  //       } else {
  //         res.status(404).send({
  //           massage:
  //             "'NFT can’t be added as the ownership details do not match. Make sure you have entered correct information.",
  //         });
  //       }
  //     } catch (error) {
  //       res.status(500).json({ error: error.message });
  //     }
  //   }

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

  //   async sendNonNative(req, res) {
  //     let responseSent = false; // Declare `responseSent` at the top of the function scope

  //     try {
  //       const { privateKey, recipientAddress, amount, tokenAddress, chain } =
  //         req.body;
  //       const providerUrl = chain;
  //       const AddressRegex = /^(0x)?[A-Fa-f0-9]{40}$/;

  //       if (!providerUrl) {
  //         return res.status(400).json({ error: "Unsupported chain" });
  //       }

  //       if (!AddressRegex.test(recipientAddress)) {
  //         return res.status(400).send({ error: "Address is not valid" });
  //       }

  //       const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
  //       const key = verifyToken(privateKey);
  //       const accountSender = web3.eth.accounts.privateKeyToAccount(key);
  //       const amountWei = amount; // web3.utils.toWei(amount, "ether").toString();

  //       const contract = new web3.eth.Contract(abi, tokenAddress);

  //       const gasPrice = await web3.eth.getGasPrice();

  //       const tx = {
  //         from: accountSender.address,
  //         to: tokenAddress,
  //         gas: 2000000,
  //         gasPrice: gasPrice,
  //         data: contract.methods
  //           .transfer(recipientAddress, amountWei)
  //           .encodeABI(),
  //       };
  //       const signedTx = await web3.eth.accounts.signTransaction(tx, key);
  //       console.log(">>>signedTx", signedTx?.transactionHash);

  //       await web3.eth
  //         .sendSignedTransaction(signedTx?.rawTransaction)
  //         .on("receipt", (receipt) => {
  //           if (!responseSent) {
  //             const serializedReceipt = JSON.stringify(receipt, (key, value) =>
  //               typeof value === "bigint" ? value.toString() : value
  //             );
  //             res.status(200).send(JSON.parse(serializedReceipt));
  //             responseSent = true; // Update the flag
  //           }
  //         })
  //         .on("error", (error) => {
  //           if (!responseSent) {
  //             res.status(400).send({ error: error.message });
  //             responseSent = true; // Update the flag
  //           }
  //         });
  //     } catch (error) {
  //       if (!responseSent) {
  //         res.status(500).send({ error: error.message });
  //       }
  //     }
  //   }

  //   async sendNonNative721(req, res) {
  //     const { chain, privateKey, recipientAddress, contractAddress, tokenId } =
  //       req.body;
  //     try {
  //       const web3 = new Web3(new Web3.providers.HttpProvider(chain));
  //       const contract = new web3.eth.Contract(abi721, contractAddress);
  //       const key = await verifyToken(privateKey);
  //       const senderAccount = web3.eth.accounts.privateKeyToAccount(key);

  //       // Check if the sender owns the NFT
  //       const owner = await contract.methods.ownerOf(tokenId).call();
  //       if (owner.toLowerCase() !== senderAccount.address.toLowerCase()) {
  //         throw new Error("Sender does not own the NFT.");
  //       }

  //       // Encode the transfer function
  //       const data = contract.methods
  //         .safeTransferFrom(senderAccount.address, recipientAddress, tokenId)
  //         .encodeABI();

  //       // Estimate gas and gas price
  //       const gas = await web3.eth.estimateGas({
  //         to: contractAddress,
  //         data,
  //       });
  //       const gasPrice = await web3.eth.getGasPrice();
  //       // Create and sign the transaction
  //       const tx = {
  //         from: senderAccount.address,
  //         to: contractAddress,
  //         gas,
  //         gasPrice,
  //         data,
  //       };

  //       const signedTx = await web3.eth.accounts.signTransaction(tx, key);

  //       // Send the signed transaction
  //       const receipt = await web3.eth.sendSignedTransaction(
  //         signedTx.rawTransaction
  //       );
  //       res.status(200).send(receipt);
  //     } catch (error) {
  //       res.status(200).send(error);
  //     }
  //   }

  //   async getEVMtransaction(req, res) {
  //     try {
  //       const { walletAddress, chain } = req.body;

  //       // const web3 = new Web3(new Web3.providers.HttpProvider(chain));

  //       let apiKey;
  //       let apiUrl;
  //       if (chain === "https://bsc.publicnode.com") {
  //         // For BSC, use BscScan API
  //         apiKey = "FBBJRWSBP1P4KIF6QJDHKZHHZPTE7R9WCB";
  //         apiUrl = `https://api.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
  //       } else if (chain === "https://eth.drpc.org") {
  //         // For Ethereum, use Etherscan API
  //         apiKey = "FRK7H7B1WGN24HV3CY8CKDFUG5IE7XBXV6";
  //         apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
  //       }

  //       // Make the API request
  //       const response = await axios.get(apiUrl);
  //       if (
  //         response.status !== 200 ||
  //         !response.data ||
  //         response.data.status !== "1"
  //       ) {
  //         throw new Error("Failed to fetch transactions.");
  //       }

  //       // Extract and format transaction details
  //       const transactions = response.data.result.slice(0, 50).map((tx) => ({
  //         to: tx.to,
  //         from: tx.from,
  //         status: tx.txreceipt_status === "1" ? "Success" : "Failed",
  //         sendOrReceived:
  //           tx.from.toLowerCase() === walletAddress.toLowerCase()
  //             ? "Sent"
  //             : "Received",
  //         currencySymbol: chain === "https://bsc.publicnode.com" ? "BNB" : "ETH",
  //         currencyAddress: chain === walletAddress,
  //         tx: tx,
  //       }));

  //       res.json({ transactions });
  //     } catch (error) {
  //       console.error(error);
  //       res.status(500).json({ error: "An error occurred" });
  //     }
  //   }

  //   async impTokenErc20(req, res) {
  //     try {
  //       const { address, chain, network_name, erc20_address } = req.body;
  //       const erc20_Regex = /^(0x)?[A-Fa-f0-9]{40}$/;
  //       if (typeof address !== "string") {
  //         return res.status(400).json({ error: "Invalid wallet address" });
  //       }
  //       if (!chain) {
  //         return res.status(400).json({ error: "Unsupported chain" });
  //       }
  //       if (!erc20_Regex.test(erc20_address)) {
  //         return res.status(400).send({ error: "Invalid ERC20 Address" });
  //       }
  //       const web3 = new Web3(new Web3.providers.HttpProvider(chain));
  //       const contract = new web3.eth.Contract(abi, erc20_address);

  //       contract.methods
  //         .balanceOf(address)
  //         .call()
  //         .then((balance) => {
  //           const value = web3.utils.fromWei(balance, "ether");
  //           return contract.methods
  //             .symbol()
  //             .call()
  //             .then(async (symbol) => {
  //               try {
  //                 const coingeckoResponse = await axios.get(
  //                   `https://api.coingecko.com/api/v3/coins/${network_name}/contract/${erc20_address}`
  //                 );
  //                 const coinlogo = coingeckoResponse.data.image
  //                   ? coingeckoResponse.data.image.large
  //                   : "https://imgs.search.brave.com/LZvcTgeGyJLUz1OoWZfzfZsr1XmG9V-xG6dzzG02cKo/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9wbmd0/ZWFtLmNvbS9pbWFn/ZXMvY29pbi1wbmct/MjQwMHgyMzk5XzVl/NzZhNDRjX3RyYW5z/cGFyZW50XzIwMmM1/My5wbmcucG5n";
  //                 const decimals = await contract.methods.decimals().call();

  //                 const data = {
  //                   balance: value.toString(),
  //                   token_address: erc20_address,
  //                   wallet_address: address,
  //                   symbol: symbol,
  //                   decimals: decimals.toString(),
  //                   rpc: chain,
  //                   logo: coinlogo,
  //                   coingekoId: coingeckoResponse.data.id.toString(),
  //                   name: coingeckoResponse.data.name.toString(),
  //                 };
  //                 return res.status(200).send({ message: "ERC20 Import", data });
  //               } catch (error) {
  //                 const coinlogo =
  //                   "https://imgs.search.brave.com/LZvcTgeGyJLUz1OoWZfzfZsr1XmG9V-xG6dzzG02cKo/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9wbmd0/ZWFtLmNvbS9pbWFn/ZXMvY29pbi1wbmct/MjQwMHgyMzk5XzVl/NzZhNDRjX3RyYW5z/cGFyZW50XzIwMmM1/My5wbmcucG5n";
  //                 const decimals = await contract.methods.decimals().call();
  //                 const name = await contract.methods.name().call();
  //                 const data = {
  //                   balance: value.toString(),
  //                   token_address: erc20_address,
  //                   wallet_address: address,
  //                   symbol: symbol,
  //                   decimals: decimals.toString(),
  //                   rpc: chain,
  //                   logo: coinlogo,
  //                   coingekoId: name.toString(),
  //                   name: name.toString(),
  //                 };
  //                 return res.status(200).send({ message: "ERC20 Import", data });
  //                 // console.log("Error fetching token image from CoinGecko:", error);
  //               }
  //             });
  //         })
  //         .catch((error) => {
  //           res.status(400).send({ error: error.message });
  //         });
  //     } catch (error) {
  //       res.status(500).send({ error: error.message });
  //     }
  //   }
  //   async getEstimatedGas(req, res) {
  //     try {
  //       const { to, from, amount, chain } = req.body;
  //       // console.log(to, from, amount, chain);
  //       const web3 = new Web3(new Web3.providers.HttpProvider(chain));

  //       const txObject = {
  //         from: from,
  //         to: to,
  //         value: web3.utils.toWei(amount, "ether"),
  //       };
  //       // console.log(txObject);

  //       // Estimate the gas
  //       const gasEstimate = await web3.eth.estimateGas(txObject);
  //       // console.log(`Estimated Gas: ${gasEstimate}`);

  //       // Get the current gas price
  //       const gasPrice = await web3.eth.getGasPrice();

  //       // Calculate the gas fee in Wei and then convert to Ether
  //       // console.log(gasPrice)
  //       // console.log(gasEstimate)
  //       const gasFeeInWei = BigInt(gasEstimate) * BigInt(gasPrice);
  //       const gasFeeInEther = web3.utils.fromWei(gasFeeInWei.toString(), "ether");

  //       // Send the response
  //       res.status(200).send({
  //         // message: `Estimated Gas: ${gasEstimate}`,
  //         gas_price: `${BigInt(gasPrice)}`,
  //         gas_fee: `${BigInt(gasEstimate)}`,
  //         gasFeeInEther: gasFeeInEther,
  //       });
  //     } catch (error) {
  //       console.error(error);
  //       // Handle known error types more gracefully
  //       if (error.code === -32000) {
  //         res.status(400).send({ error: "Insufficient funds for gas" });
  //       } else {
  //         // For other unhandled errors, send a generic error response
  //         res
  //           .status(500)
  //           .send({ error: error.message || "An unexpected error occurred." });
  //       }
  //     }
  //   }
  //   async getEstimatedGasToken(req, res) {
  //     try {
  //       const { to, from, amount, chain, tokenAdd } = req.body;
  //       // console.log(to, from, amount, chain);
  //       const web3 = new Web3(new Web3.providers.HttpProvider(chain));

  //       const contract = new web3.eth.Contract(abi, tokenAdd);

  //       // Estimate the gas
  //       // const gasEstimate = await web3.eth.estimateGas(txObject);
  //       // console.log(`Estimated Gas: ${gasEstimate}`);
  //       let gasEstimate;
  //       await contract.methods
  //         .transfer(to, amount)
  //         .estimateGas({ from: from })
  //         .then(function (gasAmount) {
  //           gasEstimate = gasAmount;
  //         })
  //         .catch(function (error) {
  //           console.log(error);
  //         });
  //       //   gasEstimate = 46109;
  //       // console.log(gasEstimate,"gas")
  //       // Get the current gas price
  //       const gasPrice = await web3.eth.getGasPrice();

  //       // Calculate the gas fee in Wei and then convert to Ether
  //       // console.log(gasPrice)
  //       // console.log(gasEstimate)
  //       const gasFeeInWei = BigInt(gasEstimate) * BigInt(gasPrice);
  //       const gasFeeInEther = web3.utils.fromWei(gasFeeInWei.toString(), "ether");

  //       // Send the response
  //       res.status(200).send({
  //         // message: `Estimated Gas: ${gasEstimate}`,
  //         gas_price: `${BigInt(gasPrice)}`,
  //         gas_fee: `${BigInt(gasEstimate)}`,
  //         gasFeeInEther: gasFeeInEther,
  //       });
  //     } catch (error) {
  //       console.error(error);
  //       // Handle known error types more gracefully
  //       if (error.code === -32000) {
  //         res.status(400).send({ error: "Insufficient funds for gas" });
  //       } else {
  //         // For other unhandled errors, send a generic error response
  //         res
  //           .status(500)
  //           .send({ error: error.message || "An unexpected error occurred." });
  //       }
  //     }
  //   }
}

module.exports = new BTC();
