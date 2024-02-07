let express = require("express");
let app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
require('dotenv').config();


const uploadFileToGDrive = require("./routes/uploadJson");
const evmWallet = require("./routes/evm-route")
const solWallet = require("./routes/solana-route")

app.use('/api/upload_files', uploadFileToGDrive);
app.use('/api/evm', evmWallet);
app.use('/api/sol', solWallet);
 
module.exports = app;