const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL , SystemProgram , clusterApiUrl, TransactionInstruction, Transaction, sendAndConfirmTransaction, Base58} = require("@solana/web3.js");
const { AccountLayout, getAssociatedTokenAddress, Token, TOKEN_PROGRAM_ID, mintTo , transfer, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const { TokenListProvider } = require('@solana/spl-token-registry');
const bip39 = require('bip39');
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const jwt = require('jsonwebtoken');
const axios = require("axios");
const fetch = require('node-fetch');
const connection = new Connection(process.env.SOL_NETWORK);
const { encrypt, decrypt } = require("../jwt.config");
const { getSolTrx } = require("./../solscan_scrapper")

exports.createWallet = async (req, res) => {
  try {
    const mnemonic = bip39.generateMnemonic();
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const wallet = Keypair.fromSeed(seed.slice(0, 32));
    const data = {
      publicKey: wallet.publicKey.toString(),
      mnemonic: mnemonic,
      privateKey: bs58.encode(Array.from(wallet.secretKey))
    }
    return res.status(200).json({ message: "New Solana Wallet", data })
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const mnemonic = bip39.generateMnemonic();
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const account = Keypair.fromSeed(seed.slice(0, 32));
    const data = {
      publicKey: account.publicKey.toString(),
      privateKey: bs58.encode(Array.from(account.secretKey))
    }
    return res.status(200).json({ message: "New Solana Account", data })
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importAccount_Memonic = async (req, res) => {
  try {
    const { mnemonic } = req.body;
    if (!mnemonic) {
      return res.status(400).json({ error: 'Mnemonic not provided' });
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const pair = nacl.sign.keyPair.fromSeed(seed.slice(0, 32));
    const keypair = Keypair.fromSecretKey(pair.secretKey)
    const balance = await connection.getBalance(keypair.publicKey);
    res.json({
      publicKey: keypair.publicKey.toString(),
      privateKey: bs58.encode(keypair.secretKey),
      balance: balance / LAMPORTS_PER_SOL
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importAccount_PrivateKey = async (req, res) => {
  try {
    const { privateKey } = req.body;
    if (!privateKey) {
        return res.status(400).json({ error: 'Private key not provided' });
    }
    const privateKeyUint8Array = bs58.decode(privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyUint8Array);
    const balance = await connection.getBalance(keypair.publicKey);
    res.json({
        publicKey: keypair.publicKey.toString(),
        privateKey: privateKey,
        balance: balance / LAMPORTS_PER_SOL
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.import_erc20 = async (req, res) => {
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
      const accountData = AccountLayout.decode(accountInfo.data);
      const address = new PublicKey(accountData.mint).toString()
      const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(address));
      const decimals = tokenInfo.value.data.parsed.info.decimals;
      const balance = (Number(accountData.amount.toString()) / 10 ** Number(decimals));
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

      res.json({token: tokenDetails});
    } else {
      res.status(404).json({ error: 'Token account not found.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.send_erc20 = async (req, res) => {
  try {
    const { privateKey, recipientAddress, tokenAddress, amount } = req.body;
    const connection = new Connection(process.env.SOL_NETWORK, "confirmed");
    const key = privateKey;
    const privateKeyUint8Array = bs58.decode(key);
    const senderKeyPair = Keypair.fromSecretKey(privateKeyUint8Array);
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeyPair,
      new PublicKey(tokenAddress),
      senderKeyPair.publicKey
    );
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeyPair,
      new PublicKey(tokenAddress),
      new PublicKey(recipientAddress)
    );
    const signature = await transfer(
      connection,
      senderKeyPair,
      senderTokenAccount.address,
      recipientTokenAccount.address,
      senderKeyPair.publicKey,
      amount
    );
    res.json(signature);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.send = async (req, res) =>{
  try {
    const { privateKey, recipientAddress, amount } = req.body;
    const key = privateKey
    const privateKeyUint8Array = bs58.decode(key);
    const senderKeyPair = Keypair.fromSecretKey(privateKeyUint8Array);
    const connection = new Connection(process.env.SOL_NETWORK, 'confirmed');
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: senderKeyPair.publicKey,
            toPubkey: new PublicKey(recipientAddress),
            lamports: amount,
        }),
    );
    const transactionId = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeyPair],
    );
    res.json({ success: true, transactionId: transactionId });
  } catch (error) {
      res.status(500).json({ error: error });
  }
}

exports.balance = async (req, res) => {
  const { address } = req.body;
  if (typeof address !== 'string' || address.trim() === '') {
    return res.status(400).json({ error: 'Invalid account address' });
  }

  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    res.json({ balance: solBalance });
  } catch (error) {
    if (error instanceof TypeError) {
      return res.status(401).json({ error: 'Invalid account address' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.transaction = async (req, res) =>{
  try {
    let { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required as a query parameter.' });
    }
    const walletAddress = new PublicKey(address);
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
    // getSolTrx(signature)
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}