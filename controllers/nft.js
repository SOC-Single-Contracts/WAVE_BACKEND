const { Keypair, Connection, PublicKey, clusterApiUrl , LAMPORTS_PER_SOL } = require("@solana/web3.js");
const {TOKEN_PROGRAM_ID} = require("@solana/spl-token");
const fetch = require('node-fetch');
const connection = new Connection(process.env.SOL_NETWORK);
// https://api.mainnet-beta.solana.com
class NFT {
    async getNft(req, res) {
        const { walletAddress, page , limit = 10 } = req.body;

        if (typeof walletAddress !== 'string' || walletAddress.trim() === '') {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        const start = (page - 1) * limit; 

        try {
            const publicKey = new PublicKey(walletAddress);
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID,
            });

            const nfts = tokenAccounts.value.filter(account => account.account.data.parsed.info.tokenAmount.uiAmount === 1 && account.account.data.parsed.info.tokenAmount.decimals === 0
            );

            // Apply pagination
            const paginatedNfts = nfts.slice(start, start + limit);

            const nftDetails = [];
            for (const nft of paginatedNfts) {
                const tokenId = nft.account.data.parsed.info.mint;
                const assetInfo = await getAssetInfoWithRetry(tokenId);

                nftDetails.push({
                    tokenId: tokenId,
                    amount: nft.account.data.parsed.info.tokenAmount,
                    assetInfo: assetInfo.result
                });
            }

            res.json({
                page,
                limit,
                totalNfts: nfts.length,
                totalPages: Math.ceil(nfts.length / limit),
                nfts: nftDetails
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

async function getAssetInfoWithRetry(assetId, retries = 3) {
    try {
        return await getAssetInfo(assetId);
    } catch (error) {
        if (retries > 0) {
            return getAssetInfoWithRetry(assetId, retries - 1);
        } else {
            throw error;
        }
    }
}

async function getAssetInfo(assetId) {
    const rpcEndpointUrl = process.env.SOL_NETWORK; 

    const response = await fetch(rpcEndpointUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: "rpd-op-123",
            method: "getAsset",
            params: {
                id: assetId,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

module.exports = new NFT();