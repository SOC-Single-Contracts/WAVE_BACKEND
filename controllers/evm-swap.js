const Web3 = require('web3').default;
const fetch = require('node-fetch');
const { ParaSwap }  = require('@paraswap/sdk');
// async function getQuotes(chain, fromToken, toToken, amount) {
//     const KYBERSWAP_QUOTES_URL = `https://aggregator-api.kyberswap.com/${chain}/api/v1/quotes`;

//     try {
//         const response = await fetch(`${KYBERSWAP_QUOTES_URL}?fromToken=${fromToken}&toToken=${toToken}&amount=${amount}`, {
//             method: 'GET',
//             headers: {
//                 "Content-Type": "application/json",
//                 "x-client-id":"SOC"
//             },
//         });
//         console.log(response)

//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }

//         const data = await response.json();
//         return {
//             success: true,
//             data: data,
//         };
//     } catch (error) {
//         console.error('Error getting quotes:', error);
//         return {
//             success: false,
//             error: error.message,
//         };
//     }
// }


// async function performSwap(chain, routeSummary, sender, recipient, deadline, slippageTolerance, source) {
//     const KYBERSWAP_SWAP_URL = `https://aggregator-api.kyberswap.com/${chain}/api/v1/route/build`;

//     try {
//     const response = await fetch(KYBERSWAP_SWAP_URL, {
//         method: 'POST',
//         headers: {
//         "Content-Type": "application/json",
//         "x-client-id":"SOC"
//         },
//         body: JSON.stringify({
//         routeSummary,
//         deadline,
//         slippageTolerance,
//         sender,
//         recipient,
//         source,
//         }),
//     });

//     if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     return { success: true, data: data };
//     } catch (error) {
//     console.error('Error performing swap:', error);
//     return { success: false, error: error.message };
//     }
// }
// async function validateNetworkAndGetChain(rpcUrl) {
//     try {
//         const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
//         const chainId = await web3.eth.getChainId();
//         let chain = '';
//         switch (Number(chainId.toString())) {
//             case 1:
//                 chain = 'ethereum';
//                 break;
//             case 56:
//                 chain = 'bsc';
//                 break;
//             case 137:
//                 chain = 'polygon';
//                 break;
//             default:
//                 throw new Error('Unsupported network');
//         }

//         return { success: true, chain };
//     } catch (error) {
//         console.error('Error validating network:', error);
//         return { success: false, error: error.message };
//     }
// }


const MAINNET = 1;
const ROPSTEN = 3;
const POLYGON = 137;
const BSC = 56;
const AVALANCHE = 43114;
class EvmSwap {
    
    async evmSwap(req, res) {
        try {
            const paraSwap = new ParaSwap({
                chainId: BSC,
                fetcher: fetch,
            });
            const { rpcUrl, fromToken, toToken, amount, sender, recipient } = req.body;

            const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
            const chainId = await web3.eth.getChainId();

            try {
                // Get price route
                const priceRoute = await paraSwap.getRate({
                    fromToken,
                    toToken,
                    amount,
                    
                    sender,
                    chainId,
                });
        
                // Build transaction parameters
                const transactionParams = await paraSwap.buildTransaction({
                    fromToken,
                    amount,
                    toToken,
                    
                    priceRoute,
                    sender,
                    chainId,
                    deadline: Math.floor(Date.now() / 1000) + 300, // Example deadline (5 minutes from now)
                });
        
                // Execute the swap transaction
                const transactionResponse = await paraSwap.executeTransaction(transactionParams);
                res.status(200).json({ message: "Swap successful", data:transactionResponse });
   
            } catch (error) {
                res.status(400).json({ error});
          
            }






            // console.log(rpcUrl)

            // const deadline = Math.floor(Date.now() / 1000) + 20 * 60; // Example: current time + 20 minutes
            // const slippageTolerance = 50;
            // const source = 'MyDApp_v1.0';
      
            // // Validate network and get chain
            // const validation = await validateNetworkAndGetChain(rpcUrl);
            // if (!validation.success) {
            //   return res.status(500).json({ message: "Failed to validate network", error: validation.error });
            // }
            // const { chain } = validation;
            // console.log(chain)
            // // Get quotes
            // const quotesResult = await getQuotes(chain, fromToken, toToken, amount);
            // if (!quotesResult.success) {
            //   return res.status(500).json({ message: "Failed to get quotes", error: quotesResult.error });
            // }
            // console.log(quotesResult)
          
            // const routeSummary = 'quotesResult?.data';
      
            // // Perform the swap
            // const swapResult = await performSwap(chain, routeSummary, sender, recipient, deadline, slippageTolerance, source);
            // if (!swapResult.success) {
            //   return res.status(500).json({ message: "Failed to perform swap", error: swapResult.error });
            // }
      
            res.status(200).json({ message: "Swap successful", data: swapResult.data });
        } catch (error) {
            console.error('Unexpected error in evmSwap:', error);
            res.status(500).send({ message: "Internal server error", error: error.toString() });
        }
    }
}

module.exports = new EvmSwap();
