const fetch = require('node-fetch');



async function getTokenMetadata(chainName, tokenAddress) {

  
  // Fetch the token image from CoinGecko API
  const coingeckoResponse = await fetch(`https://api.coingecko.com/api/v3/coins/${chainName.toLowerCase()}/contract/${tokenAddress}`);
  const coingeckoData = await coingeckoResponse.json();

  return {
    logo: coingeckoData.image ? coingeckoData.image.large : null,
  };
}

// Example usage
getTokenMetadata('binance-smart-chain', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c')
  .then(metadata => console.log(metadata))
  .catch(error => console.error(error));
