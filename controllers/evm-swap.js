// const ParaSwap = require('paraswap').ParaSwap;
const Web3 = require("web3").default;
const fetch = require("node-fetch");
const { ethers } = require('ethers');
const axios = require("axios");




class EvmSwap {
    async evmSwap(req, res) {
        try {
          const {
            rpcUrl,
            fromToken,
            toToken,
            amount,
            sender,
            recipient,
            privateKey,
          } = req.body;

        const validation = await validateNetworkAndGetChain(rpcUrl);
        if (!validation.success) {
            return res
            .status(500)
            .json({
                message: "Failed to validate network",
                error: validation.error,
            });
        }
        const { chainId } = validation;
        
        const apiBaseUrl = `https://api.1inch.dev/swap/v5.2/${chainId}`;
        const broadcastApiUrl = `https://api.1inch.dev/tx-gateway/v1.1/${chainId}/broadcast`;
        const walletAddress = sender;
        const web3 = new Web3(rpcUrl);
        const headers = { "Content-Type": "application/json", Authorization: "Bearer DHLqmQREZyWRTTEk6SIEi9ESWn6MhTdj" };
        
        async function validateNetworkAndGetChain(rpcUrl) {
            try {
              const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
              const chainId = await web3.eth.getChainId();
              let chain = "";
              switch (Number(chainId.toString())) {
                case 1:
                  chain = "ethereum";
                  break;
                case 56:
                  chain = "bsc";
                  break;
                case 137:
                  chain = "polygon";
                  break;
                default:
                  throw new Error("Unsupported network");
              }
          
              return { success: true, chain , chainId :Number(chainId.toString()) };
            } catch (error) {
              console.error("Error validating network:", error);
              return { success: false, error: error.message };
            }
        }
        
        function apiRequestUrl(methodName, queryParams) {
          return `${apiBaseUrl}${methodName}?${new URLSearchParams(queryParams)}`;
        }
        
        async function broadcastRawTransaction(rawTransaction) {
          try {
              const response = await fetch(broadcastApiUrl, {
                  method: "POST",
                  body: JSON.stringify({ rawTransaction }),
                  headers
              });
              const data = await response.json();
              return data.transactionHash;
          } catch (error) {
              console.error('Error broadcasting transaction:', error);
              throw error;
          }
        }
        
        async function signAndSendTransaction(transaction , privateKey) {
        if (!transaction || typeof transaction.from === 'undefined') {
          throw new Error('Transaction object is invalid or missing the "from" property.');
        }
        
        try {
          const signedTransaction = await web3.eth.accounts.signTransaction(transaction, privateKey);
          // console.log(signedTransaction)
          if (!signedTransaction || !signedTransaction.rawTransaction) {
            throw new Error('Failed to sign the transaction.');
          }
        //  await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction).then( async (receipt) => {
        //     return receipt;
        //   }).catch(async (err) => {
        //       console.error('Error sending signed transaction:', err);
        //       return await broadcastRawTransaction(signedTransaction.rawTransaction);
        //   });
          return await broadcastRawTransaction(signedTransaction.rawTransaction);
        } catch (error) {
          console.error('Error signing or sending transaction:', error);
          throw error; 
        }
        }
        
        async function checkAllowance(tokenAddress, walletAddress) {
        const url = apiRequestUrl("/approve/allowance", { tokenAddress, walletAddress });
        try {
          const data = await fetchWithRetry(url, { method: 'GET', headers }, 3, 1000);
          return data.allowance;
        } catch (error) {
          console.error('Error checking allowance:', error);
          throw error;
        }
        }
        
        async function buildTxForApproveTradeWithRouter(tokenAddress, amount) {
        const url = apiRequestUrl("/approve/transaction", amount ? { tokenAddress, amount } : { tokenAddress });
        try {
            const response = await fetchWithRetry(url, { method: 'GET', headers });
            const transactionData = response.transaction;
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = await web3.eth.estimateGas({
                ...transactionData,
                from: walletAddress ,
                gas: '53000',
                gasPrice: gasPrice,
            });
            return {
              data: response.data,
              gasPrice: response.gasPrice,
              to: response.to,
              value: response.value,
              from: walletAddress,
              gas: '53000',
              // value:web3.utils.toHex('0'),
              // gasPrice:web3.utils.toHex(gasPrice),
              // gasLimit:web3.utils.toHex(2900000),
          };
            // return {
            //     ...transactionData,
            //     from: walletAddress,
            //     gas: '53000',
            //     gasPrice: gasPrice,
            // };
        } catch (error) {
            console.error('Error building transaction for approval:', error);
            throw error;
        }
        }
        
        async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
        try {
          const response = await fetch(url, options);
          if (!response.ok) {
            if (response.status === 429 && retries > 0) {
              // console.log(`Rate limit reached, retrying in ${backoff}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoff));
              return fetchWithRetry(url, options, retries - 1, backoff * 2); // Exponential backoff
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json();
        } catch (error) {
          console.error('Fetch operation failed:', error);
          throw error; // Rethrow after retries exhausted
        }
        }
        
        async function performSwap(swapParams) {
        console.log(swapParams)
        const queryParams = new URLSearchParams(swapParams).toString();
        const url = `${apiBaseUrl}/swap?${queryParams}`;
        
        try {
            const response = await fetchWithRetry(url, {
                method: 'GET', 
                headers: headers,
            }, 3, 1000);
            const data = JSON.stringify(response);
            return JSON.parse(data);
        } catch (error) {
            console.error('Error performing swap:', error);
            throw error;
        }
        }
        
        const swapParams = {
          src: fromToken, 
          dst: toToken, 
          amount: amount, 
          from: walletAddress,
          slippage: 1, 
          disableEstimate: false,
          allowPartialFill: false
        };
     
        console.log("Checking allowance...");
        const allowance = await checkAllowance(swapParams.src, walletAddress);
        console.log("Allowance: ", allowance);
        // const transactionForSign = await buildTxForApproveTradeWithRouter(swapParams.src, swapParams.amount);
        // console.log("Transaction for approve: ", transactionForSign);
        
        // const approveTxHash = await signAndSendTransaction(transactionForSign , privateKey); 
        // console.log("Approve tx hash: ", approveTxHash);
        
   
      
            console.log("Performing swap...");
            const swapResult = await performSwap(swapParams);
            console.log("Swap result:", swapResult.tx);
            const finalizeTrx = await signAndSendTransaction(swapResult.tx , privateKey)
            console.log("Swap finalizeTrx:", finalizeTrx);
            res.status(200).json({ message: "Swap executed successfully", data: finalizeTrx });
       


        } catch (error) {
          res.status(500).send({ message: "Internal server error", error: error.toString() });
        }
      }
}

module.exports = new EvmSwap();