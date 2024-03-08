const { AccountLayout, Token, TOKEN_PROGRAM_ID, mintTo , transfer, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const { AccountInfo, Transaction, TransactionSignature, TransactionInstruction, sendAndConfirmTransaction, Base58 } = require('@solana/web3.js');
const {Keypair, SystemProgram , clusterApiUrl , Connection, PublicKey , LAMPORTS_PER_SOL} = require("@solana/web3.js");
const { TokenListProvider } = require('@solana/spl-token-registry');
const bs58 = require('bs58');
const fetch = require('node-fetch');
const { verifyToken } = require("../jwt_encryption");
const { getAssociatedTokenAddress } = require("@solana/spl-token");
const connection = new Connection(process.env.SOL_NETWORK);
const axios = require('axios');

async function findTokenByContractAddress(contractAddress) {
    try {
      // Fetch the list of coins from CoinGecko, including platform tokens
      const response = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=true', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch data from CoinGecko.');
      }
  
      const coinList = await response.json();
  
      // Find the token object with the specified contract address
      const foundToken = coinList.find((token) =>
        token.platforms && token.platforms.solana === contractAddress
      );
  
      if (!foundToken) {
        console.log(`Token not found for contract address: ${contractAddress}`);
        return null;
      }
  
      // Found the token, return the object
      return foundToken;
    } catch (error) {
      console.error(`An error occurred: ${error.message}`);
      return null;
    }
  }

  async function findTokenById(id) {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=true&market_data=false&community_data=true&developer_data=false&sparkline=true`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'YourApp/1.0.0', 
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch data from CoinGecko.');
      }
  
      const data = await response.json();
  
      return data;
    } catch (error) {
      console.error(`An error occurred: ${error.message}`);
      return null;
    }
  }
 

class NonNative {
    async List(req, res) {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required.' });
        }
        try {
            const publicKey = new PublicKey(walletAddress);
            const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID,
            });
            
            const tokens = await Promise.all(tokenAccounts.value.map(async (tokenAccount) => {
                const accountData = AccountLayout.decode(tokenAccount.account.data);
                const address = new PublicKey(accountData.mint).toString()
            
                const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(address));
                const decimals = tokenInfo.value.data.parsed.info.decimals;
                const balance = (Number(accountData.amount.toString()) / 10 ** Number(decimals));
            
                return {
                    address: address,
                    balance: balance,
                    decimals:decimals,
                };
            }));
            
            res.json(tokens);
  
        } catch (error) {
            console.error('Error fetching tokens:', error);
            res.status(500).json({ error: 'Failed to fetch tokens.' });
        }
    }

    async TPX(req, res) {
      const { walletAddress } = req.body;
      const specificTokenMint = "BvAZ2ay2KjBcGi49KspWtY3DAatBN7enmqaon1TuR8ES"; // Specific token mint address
  
      if (!walletAddress) {
          return res.status(400).json({ error: 'Wallet address is required.' });
      }
  
      try {
          const publicKey = new PublicKey(walletAddress);
          const specificTokenPublicKey = new PublicKey(specificTokenMint);
  
          // Get the associated token account for the specific token
          const associatedTokenAddress = await getAssociatedTokenAddress(
              specificTokenPublicKey,
              publicKey
          );
  
          // Fetch account info
          const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
          if (accountInfo) {
              const accountData = AccountLayout.decode(accountInfo.data);

              const tokenBalance = Number(Number(accountData.amount) / 1000000);
  
              const tokenDetails = {
                  balance: tokenBalance,
              };
  
              res.json(tokenDetails);
          } else {
              res.status(404).json({ error: 'Token account not found.' });
          }
      } catch (error) {
          console.error('Error fetching token:', error);
          res.status(500).json({ error: 'Failed to fetch token.' });
      }
    }

    async sendNonNative(req, res) {
        try {
            const { privateKey, recipientAddress, tokenMintAddress, amount } = req.body;

            const connection = new Connection(process.env.SOL_NETWORK, 'confirmed');
            const key = verifyToken(privateKey)

            const privateKeyUint8Array = bs58.decode(key);
            const senderKeyPair = Keypair.fromSecretKey(privateKeyUint8Array);
    
            // Get the token account of the sender
            const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                senderKeyPair,
                new PublicKey(tokenMintAddress),
                senderKeyPair.publicKey
            );
           
            // Get or create the recipient's token account
            const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                senderKeyPair,
                new PublicKey(tokenMintAddress),
                new PublicKey(recipientAddress)
            );
 
            // Transfer the tokens
            const signature = await transfer(
                connection,
                senderKeyPair,
                senderTokenAccount.address,
                recipientTokenAccount.address,
                senderKeyPair.publicKey,
                amount
            );
         
            res.json({ success: true, txid: signature });
        } catch (error) {
            res.status(500).json({ error: error });
        }

    }

    async getTokenDetails(req, res) {
        // try{
        // const { mintAddress } = req.body;
        // const tokens = await new TokenListProvider().resolve();
        // const tokenList = tokens.filterByClusterSlug('mainnet-beta').getList(); 
      
        // const tokenData = tokenList.find((token) => token.address === mintAddress);
        // if (!tokenData) {
        //     findTokenByContractAddress(mintAddress)
        //     .then(async(token) => {
        //         if (token) {
        //           const data = await findTokenByid(token.id);
        //           const detailedData = {
        //             "chainId": data.id,
        //             "address": data.detail_platforms.solana.contract_address,
        //             "symbol": data.symbol,
        //             "name": data.name,
        //             "decimals": data.detail_platforms.solana.decimal_place,
        //             "logoURI": data.image.small,
        //           }
        //             console.log(detailedData)
        //             res.json(detailedData);
        //         } else {
        //         console.log('Token not found.');
        //         res.json('Unknown token');
        //         }
        //     });
        // }
        // res.json(tokenData);}
        // catch (err){}

        try {
            const { mintAddress } = req.body;
            const tokens = await new TokenListProvider().resolve();
            const tokenList = tokens.filterByClusterSlug('mainnet-beta').getList();
        
            const tokenData = tokenList.find((token) => token.address === mintAddress);
        
            if (!tokenData) {
                // Token not found in local token list, let's introduce a delay before making the request to CoinGecko
                setTimeout(async () => {
                  try {
                    
                    const token = await findTokenByContractAddress(mintAddress);
                    if (token) {
                      const data = await findTokenById(token.id);
                      if (data) {
                        const detailedData = {
                          chainId: data.id,
                          address: data.detail_platforms.solana.contract_address,
                          symbol: data.symbol,
                          name: data.name,
                          decimals: data.detail_platforms.solana.decimal_place,
                          logoURI: data.image.small,
                          dolar : data.tickers
                        };
                        
                        res.json(detailedData);
                      } else {
                        console.log('Token details not found on CoinGecko.');
                        res.json('Unknown token');
                      }
                    } else {
                      
                      res.json('Unknown token');
                    }
                  } catch (error) {
                    console.error(`An error occurred when fetching data from CoinGecko: ${error.message}`);
                    res.status(500).json({ error: 'Internal server error' });
                  }
                }, 5000);
              } else {
              // Token found in local token list, send it as JSON response
              res.json(tokenData);
            }
          } catch (err) {
            console.error(`An error occurred: ${err.message}`);
            res.status(500).json({ error: 'Internal server error' });
          }
    }

    async sendNFT(req, res) {
        try {
            const { privateKey, receiverPublicKeyString, mintAddressString } = req.body;
    
            const connection = new Connection(process.env.SOL_NETWORK, 'confirmed');
            const key = await verifyToken(privateKey)
            const senderKeypair = web3.Keypair.fromSecretKey(Uint8Array.from( bs58.decode(key)));
            const receiverPublicKey = new web3.PublicKey(receiverPublicKeyString);
            const mintPublicKey = new web3.PublicKey(mintAddressString);
        
            const senderTokenAccount = await splToken.getAssociatedTokenAddress(
                mintPublicKey,
                senderKeypair.publicKey
            );
            const receiverTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
                connection,
                senderKeypair,
                mintPublicKey,
                receiverPublicKey
            );
        
            const transaction = new web3.Transaction().add(
                splToken.createTransferInstruction(
                    senderTokenAccount,
                    receiverTokenAccount.address,
                    senderKeypair.publicKey,
                    1, 
                    [],
                    splToken.TOKEN_PROGRAM_ID
                )
            );
        
            const signature = await web3.sendAndConfirmTransaction(
                connection,
                transaction,
                [senderKeypair]
            );
        
            res.json({ success: true, txid: signature });
        } catch (error) {
            res.json({ success: false, error: error });
        }

    }

    async getSolTrx(req, res) {
        let { walletAddressStr } = req.body;



        // try {
        //     const { walletAddressStr } = req.body;
        
        //     if (!walletAddressStr) {
        //       return res.status(400).json({ error: 'walletAddress is required.' });
        //     }
        
        //     const publicKey = new PublicKey(walletAddressStr);
        //     const transactions = await getSolanaTransactions(publicKey);
        
        //     res.json(transactions);
        //   } catch (error) {
        //     console.error('Error fetching Solana transactions:', error);
        //     res.status(500).json({ error: 'Internal server error' });
        //   }


        try {
        
            if (!walletAddressStr) {
              return res.status(400).json({ error: 'Wallet address is required as a query parameter.' });
            }
        
            const walletAddress = new PublicKey(walletAddressStr);
        
            const transactions = await connection.getConfirmedSignaturesForAddress2(walletAddress, {
              limit: 10,
            });
            // const transactionDetails = await Promise.all(
            //     transactions.map(async (trx) => {
            //       const signature = trx.signature;
            //       const transaction = await getSignatureDetailsWithRetry(signature);
            //       return transaction;
            //     })
            //   );
            
            res.json(transactions);
          } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
    }

    async impTokenErc20(req, res){
      const { address, erc20_address } = req.body;
      if (!address) {
        return res.status(400).json({ error: 'Wallet address is required.' });
      }
      try {
        const publicKey = new PublicKey(address);
        const specificTokenPublicKey = new PublicKey(erc20_address);
    
        const associatedTokenAddress = await getAssociatedTokenAddress(
          specificTokenPublicKey,
          publicKey
        );
          
        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
        if (accountInfo) {
          try{
          const accountData = AccountLayout.decode(accountInfo.data);
          const address = new PublicKey(accountData.mint).toString()
          const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(address));
          const decimals = tokenInfo.value.data.parsed.info.decimals;
          const balance = (Number(accountData?.amount.toString()) / 10 ** Number(decimals));
          const coingeckoResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/solana/contract/${erc20_address}`);
          const coinlogo = coingeckoResponse.data.image ? coingeckoResponse.data.image.large : 'https://imgs.search.brave.com/LZvcTgeGyJLUz1OoWZfzfZsr1XmG9V-xG6dzzG02cKo/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9wbmd0/ZWFtLmNvbS9pbWFn/ZXMvY29pbi1wbmct/MjQwMHgyMzk5XzVl/NzZhNDRjX3RyYW5z/cGFyZW50XzIwMmM1/My5wbmcucG5n';
          const tokenDetails = {
            address: address,
            balance: balance,
            decimals: decimals,
            logo : coinlogo,
            coingekoId:coingeckoResponse.data.id.toString(),
            symbol:coingeckoResponse.data.symbol.toString(),
            name:coingeckoResponse.data.name.toString(),
          };
          res.json({token: tokenDetails});}
          catch(error){
            const accountData = AccountLayout.decode(accountInfo.data);
            const address = new PublicKey(accountData.mint).toString()
            const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(address));
            const decimals = tokenInfo.value.data.parsed.info.decimals;
            const balance = (Number(accountData?.amount.toString()) / 10 ** Number(decimals));
            const tokens = await new TokenListProvider().resolve();
            const tokenList = tokens.filterByClusterSlug('mainnet-beta').getList();
            const tokenData = tokenList.find((token) => token.address === erc20_address);
            console.log(tokenData)
            const coinlogo = tokenData.logoURI ? tokenData.logoURI : 'https://imgs.search.brave.com/LZvcTgeGyJLUz1OoWZfzfZsr1XmG9V-xG6dzzG02cKo/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9wbmd0/ZWFtLmNvbS9pbWFn/ZXMvY29pbi1wbmct/MjQwMHgyMzk5XzVl/NzZhNDRjX3RyYW5z/cGFyZW50XzIwMmM1/My5wbmcucG5n';
            const tokenDetails = {
              address: address,
              balance: balance,
              decimals: decimals,
              logo : coinlogo,
              coingekoId:tokenData?.name,
              symbol:tokenData.symbol,
              name:tokenData.name,
            };
            res.json({token: tokenDetails});
          }
        } else {
          res.status(404).json({ error: 'Solana Network Error' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }

}
module.exports = new NonNative();
