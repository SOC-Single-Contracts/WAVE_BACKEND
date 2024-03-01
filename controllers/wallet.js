const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { verifyToken } = require("../jwt_encryption");
const connection = new Connection(process.env.SOL_NETWORK);
const bip39 = require('bip39');
const bs58 = require('bs58');
const nacl = require('tweetnacl');

const jwt = require('jsonwebtoken');
const secret = process.env.ENCRYPTION_KEY;


function deriveKeypair(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const keyPair = nacl.sign.keyPair.fromSeed(seed.slice(0, 32));
    return Keypair.fromSecretKey(keyPair.secretKey);
}


class wallet {
    async createAccount(req, res) {
        try {
            const mnemonic = bip39.generateMnemonic();
            const seed = await bip39.mnemonicToSeed(mnemonic);
            const newAccount = Keypair.fromSeed(seed.slice(0, 32));
            const encrypt = {
                                publicKey: newAccount.publicKey.toString(),
                                mnemonic: mnemonic,
                                secretKey: bs58.encode(Array.from(newAccount.secretKey))
                            }
            const data = jwt.sign(encrypt, secret)
            return res.json({ data });
        } catch (error) {
            console.error('Error creating new account with phrase:', error);
            res.status(500).json({ error: 'Failed to create new account with phrase.' });
        }
    }

    async createNewAccount(req, res) {
        try {
            const mnemonic = bip39.generateMnemonic();
            const seed = await bip39.mnemonicToSeed(mnemonic);
            const newAccount = Keypair.fromSeed(seed.slice(0, 32));
            const encrypt = {
                            publicKey: newAccount.publicKey.toString(),
                            secretKey: bs58.encode(Array.from(newAccount.secretKey))
                        }
            const data = jwt.sign(encrypt, secret)
            return res.json({data});
        } catch (error) {
            console.error('Error creating new account with phrase:', error);
            res.status(500).json({ error: 'Failed to create new account with phrase.' });
        }
    }

    async getBalance(req, res) {
        const { walletAddress } = req.body;
        if (typeof walletAddress !== 'string' || walletAddress.trim() === '') {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        try {
            const publicKey = new PublicKey(walletAddress);
            const balance = await connection.getBalance(publicKey);
            const solBalance = balance / LAMPORTS_PER_SOL;
            res.json({ balance: solBalance });
        } catch (error) {
            console.error('Error fetching balance:', error);
            if (error instanceof TypeError) {
                return res.status(400).json({ error: 'Invalid wallet address' });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async importAccount(req, res) {
        try {
            const { privateKey } = req.body;
            if (!privateKey) {
                return res.status(400).json({ error: 'Private key not provided' });
            }

            const privateKeyUint8Array = bs58.decode(verifyToken(privateKey));
            const keypair = Keypair.fromSecretKey(privateKeyUint8Array);

            const balance = await connection.getBalance(keypair.publicKey);

            res.json({
                publicKey: keypair.publicKey.toString(),
                privateKey: verifyToken(privateKey),
                balance: balance / LAMPORTS_PER_SOL
            });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async importAccountFromMnemonic(req, res) {
        try {
            const { mnemonic } = req.body;
            if (!mnemonic) {
                return res.status(400).json({ error: 'Mnemonic not provided' });
            }
            
            const mne = verifyToken(mnemonic)
            const keypair = deriveKeypair(mne);

            const balance = await connection.getBalance(keypair.publicKey);

            res.json({
                publicKey: keypair.publicKey.toString(),
                privateKey: bs58.encode(keypair.secretKey),
                balance: balance / LAMPORTS_PER_SOL
            });
        } catch (error) {
            console.error('Error in importAccountFromMnemonic:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async decrypt(req, res) {
        let {token , KEY} = req.body
        if (typeof token !== 'string') {
            res.status(400).json( null );
          }
          try {
            const payload = jwt.verify(token, KEY);
            res.status(200).json( payload );
          } catch (error) {
            res.status(400).json( null );
          }
    }

    async encrypt(req, res) {
        let {token , KEY} = req.body
          try {
            const payload = jwt.sign(token, KEY)
            res.status(200).json( payload );
          } catch (error) {
            res.status(400).json( null );
          }
    }

   
}

module.exports = new wallet();
