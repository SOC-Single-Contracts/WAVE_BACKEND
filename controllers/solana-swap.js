const { Connection, Keypair, VersionedTransaction } = require('@solana/web3.js');
const fetch = require('cross-fetch');
const { Wallet } = require('@project-serum/anchor');
const bs58 = require('bs58');


class SolanaSwap {
    async
    solanaSwap = async (req, res) => {
        try {
            const { inputMint, outputMint, amount, token } = req.body;
            if (!inputMint, !outputMint, !amount, !token) {
                res.status(401).json({ message: "Requuired fileds are missing" })

            }

            // It is recommended that you use your own RPC endpoint.
            // This RPC endpoint is only for demonstration purposes so that this example will run.
            const connection = new Connection('https://api.mainnet-beta.solana.com');
            const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(`${token}` || '')));
            // Swapping SOL to USDC with input 0.1 SOL and 0.5% slippage
            const quoteResponse = await (
                await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
                )
            ).json();
            // get serialized transactions for the swap
            const { swapTransaction } = await (
                await fetch('https://quote-api.jup.ag/v6/swap', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        // quoteResponse from /quote api
                        quoteResponse,
                        // user public key to be used for the swap
                        userPublicKey: wallet.publicKey.toString(),
                        // auto wrap and unwrap SOL. default is true
                        wrapAndUnwrapSol: true,
                        // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
                        // feeAccount: "fee_account_public_key"
                    })
                })
            ).json();
            // deserialize the transaction
            const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
            var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

            // sign the transaction
            transaction.sign([wallet.payer]);
            // Execute the transaction
            // const rawTransaction = transaction.serialize()
            // const txid = await connection.sendRawTransaction(rawTransaction, {
            //   skipPreflight: true,
            //   maxRetries: 2
            // });

            // await connection.confirmTransaction(txid);
            const rawTransaction = transaction.serialize()
            const txid = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: false,
                preflightCommitment: 'singleGossip',
                maxRetries: 5
            });

            // console.log(`Transaction Confirmed - [https://solscan.io/tx/${txid}`](https://solscan.io/tx/$%7Btxid%7D%60));

            res.status(200).send({ message: "Swap Successful", txid: txid });

        } catch (error) {
            res.status(500).send({ message: "internal server error", error: error });

        }
    }

}



module.exports = new SolanaSwap();