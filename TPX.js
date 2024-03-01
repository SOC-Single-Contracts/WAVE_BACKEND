const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

async function getSPLTokenBalance(walletAddress, mintAddress) {
    // Connect to the Solana cluster
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));

    // Convert wallet address to a PublicKey object
    const walletPublicKey = new web3.PublicKey(walletAddress);

    // Convert mint address to a PublicKey object
    const mintPublicKey = new web3.PublicKey(mintAddress);

    // Find the associated token address
    const associatedTokenAddress = await splToken.getAssociatedTokenAddress(
        mintPublicKey,
        walletPublicKey
    );

    // Fetch the account info
    try {
        const accountInfo = await connection.getParsedAccountInfo(associatedTokenAddress);
        if (accountInfo.value) {
            const tokenBalance = accountInfo.value.data.parsed.info.tokenAmount.uiAmount;
            return tokenBalance;
        } else {
            return 'Token account not found.';
        }
    } catch (error) {
        console.error('Error fetching account info:', error);
    }
}

// Example usage
getSPLTokenBalance('8xpkMJkyhXMP2vydfQJKxZHZgyhSvqdjsqhQf23XBxvy', 'BvAZ2ay2KjBcGi49KspWtY3DAatBN7enmqaon1TuR8ES').then(balance => {
    console.log('Token Balance:', balance);
});
