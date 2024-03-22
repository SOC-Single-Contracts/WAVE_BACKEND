const { Connection, Keypair, TransactionInstruction, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL, SystemProgram, PublicKey, Base58 } = require('@solana/web3.js');
const bs58 = require('bs58');
const { verifyToken } = require("../jwt_encryption");

const puppeteer = require('puppeteer')

async function getSolScan(token) {
    const browser = await puppeteer.launch({
      headless: true,
      // executablePath: '/usr/bin/chromium-browser',
      // args: [ '--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote' ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 0, height: 0});
    await page.goto(`https://solscan.io/tx/${token}`);
    await page.waitForNetworkIdle();
    await page.waitForSelector(".dark-mode-box > div > div > .tx-account");
    // For Overview
    const data = await page.evaluate(() => {
      const elArray = Array(
        ...document.querySelectorAll(
          ".ant-tabs-tabpane > section > div > .ant-row"
        )
      );
      let overview = {};
      elArray.forEach((el) => {
        let key = el.children[0].innerText;
        let value = el.children[1].innerText;
        console.log(key);
        if (!key.includes("Main Actions")) {
          overview[key] = value;
        }
      });
      return overview;
    });
    data.transaction_info = await page.evaluate(() => {
      let fromAddress = document.querySelectorAll(
        ".dark-mode-box > div > div > .tx-account"
      )[0].firstChild.firstChild.children[0].href;
      let toAddress = document.querySelectorAll(
        ".dark-mode-box > div > div > .tx-account"
      )[1].firstChild.firstChild.children[0].href;
      let address = document.querySelector(".dark-mode-box > div > div").lastChild
        .firstChild.firstChild.href;
      let symbol = document
        .querySelector(".dark-mode-box > div > div")
        .lastChild.textContent.slice(0, 3);
      let amount = document.querySelector(
        ".dark-mode-box > div > div > strong"
      ).textContent;
      return { fromAddress, toAddress, symbol, address, amount };
    });
    await browser.close();
    return data;
  }
  

class transfer {
    async sendNative(req, res) {
        try {
            const { privateKey, recipientAddress, amount } = req.body;
            const key = verifyToken(privateKey)
       
            const privateKeyUint8Array = bs58.decode(key);
            const senderKeyPair = Keypair.fromSecretKey(privateKeyUint8Array);
    
            const connection = new Connection(process.env.SOL_NETWORK, 'confirmed');
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: senderKeyPair.publicKey,
                    toPubkey: new PublicKey(recipientAddress),
                    lamports: Math.round(1000000000 * amount),
                }),
            );
            console.log(transaction)
            const transactionId = await sendAndConfirmTransaction(
                connection,
                transaction,
                [senderKeyPair],
            );
            console.log(transactionId)
            
            res.json({ success: true, transactionId: transactionId });
            
        } catch (error) {
            res.status(500).json({ error: error });
        }
    }
    async getTrxDetails(req, res) {
        try {
            const { signature } = req.body;
            const details = await getSolScan(signature)
            console.log(details)
            res.json(details);
        } catch (error) {
            console.log(error.message)
            res.status(400).json({ error: error });
        }
    }
    async getExtimatedGas(req, res){
      try {
      const {key, from, amount } = req.body;
      const privateKey = verifyToken(key)
      const privateKeyUint8Array = bs58.decode(privateKey);
            const senderKeyPair = Keypair.fromSecretKey(privateKeyUint8Array);
    
            const connection = new Connection(process.env.SOL_NETWORK, 'confirmed');
            const { blockhash } = await connection.getLatestBlockhash();

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: senderKeyPair.publicKey,
                    toPubkey: new PublicKey(from),
                    lamports: Math.round(1000000000 * amount),
                }),
            );
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new PublicKey(from);

            const message = transaction.compileMessage();
            const fee = await connection.getFeeForMessage(message);
        
            const response = await connection.getFeeForMessage(
              transaction.compileMessage(),
              'confirmed',
            );
            const feeInLamports = response.value / 1000000000;
        let data = {
          gas_price: "84711489836",
          gas_fee: feeInLamports.toString(),
          gasFeeInEther: feeInLamports.toString(),
          fee:fee
        }
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
    async getExtimatedGasToken(req, res){
      try {
      const {key, from, amount , tokenAddress} = req.body;
      const privateKey = verifyToken(key)
      const privateKeyUint8Array = bs58.decode(privateKey);
            const senderKeyPair = Keypair.fromSecretKey(privateKeyUint8Array);
    
            const connection = new Connection(process.env.SOL_NETWORK, 'confirmed');
            const { blockhash } = await connection.getLatestBlockhash();

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: senderKeyPair.publicKey,
                    toPubkey: new PublicKey(from),
                    lamports: Math.round(1000000000 * amount),
                }),
            );
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new PublicKey(from);

            const message = transaction.compileMessage();
            const fee = await connection.getFeeForMessage(message);
        
            const response = await connection.getFeeForMessage(
              transaction.compileMessage(),
              'confirmed',
            );
            const feeInLamports = response.value / 1000000000;
        let data = {
          gas_price: "84711489836",
          gas_fee: feeInLamports.toString(),
          gasFeeInEther: feeInLamports.toString(),
          fee:fee
        }
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
}
module.exports = new transfer();
