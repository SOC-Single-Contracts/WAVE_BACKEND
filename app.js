const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');


dotenv.config();

const app = express();
const port = process.env.PORT;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const MAX_REQUESTS_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60000;
const requestQueue = [];


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use((req, res, next) => {
  const allowedOrigin = process.env.ALLOW_ORIGIN;
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

// Middleware for rate limiting
app.use((req, res, next) => {
  const now = Date.now();
  // Remove requests from the queue that are outside of the rate limit window
  while (requestQueue.length > 0 && requestQueue[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestQueue.shift();
  }
  // If the number of requests in the queue exceeds the rate limit, respond with 429
  if (requestQueue.length >= MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
  }
  requestQueue.push(now);
  next();
});

// controllers
const nonNative = require('./controllers/non-native');
const wallet = require('./controllers/wallet');
const transfer = require('./controllers/transfer');
const NFT = require('./controllers/nft');
const ethereum = require('./controllers/ethereum')
const solanaSwap = require('./controllers/solana-swap')
// mongodb_controllers
const mongodb = require('./controllers/user');


// soalan_routes
app.post('/create-wallet', wallet.createAccount);
app.post('/create-new-account', wallet.createNewAccount);
app.post('/wallet-ballance', wallet.getBalance);
app.post('/token-list', nonNative.List);
app.post('/tpx', nonNative.TPX);
app.post('/send-native', transfer.sendNative);
app.post('/send-non-native', nonNative.sendNonNative);
app.post('/tokendetails', nonNative.getTokenDetails);
app.post('/imp_tokenerc_20', nonNative.impTokenErc20);
app.post('/import-with-Key', wallet.importAccount);
app.post('/import-with-mnemonic', wallet.importAccountFromMnemonic);
app.post('/solana-swap', solanaSwap.solanaSwap);

app.post('/get-solTrx-details', transfer.getTrxDetails);
// ethereum_routes
app.post('/eth-create-account', ethereum.createAccount);
app.post('/eth-getbalance', ethereum.getBalance);
app.post('/eth-importaccount', ethereum.importAccount);
app.post('/imp_eth_tokenerc_20', ethereum.impTokenErc20);
app.post('/eth-import-720', ethereum.importToken);
app.post('/eth-import-721', ethereum.importToken721);
app.post('/eth-send', ethereum.sendNative);
app.post('/eth-send-720', ethereum.sendNonNative);
app.post('/eth-send-721', ethereum.sendNonNative721);
// mongodb_routes
app.post('/decrypt', wallet.decrypt);
app.post('/encrypt', wallet.encrypt);
app.post('/register', mongodb.signUp);
app.post('/login', mongodb.signIn);
app.put('/attach-wallet', mongodb.addWallet);
app.put('/attach-account', mongodb.addAccount);
app.put('/deattach-account', mongodb.removeAccount);
app.post('/insertTrx', mongodb.insertTrx);
app.post('/getTrx', mongodb.getTrx);
app.post('/getSolTrx', nonNative.getSolTrx);
app.post('/getEVMTrx', ethereum.getEVMtransaction);
app.post('/getnfts', NFT.getNft);
app.post('/sendnft', nonNative.sendNFT);
app.post('/sendotp', mongodb.sendOtp);
app.post('/verify-otp', mongodb.verifyOtp);
app.put('/change-password', mongodb.changePassword);


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
