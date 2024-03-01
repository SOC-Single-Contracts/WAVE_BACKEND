const mongoose = require('mongoose');

const Transaction = new mongoose.Schema({
    transactionId: { type: String, unique: true },
    sender: String,
    receiver: String,
    tokenaddres: String,
    amount: Number,
    date: String,
    blocktime : Number,
    time: String,
    status: String,
    rpc: String,
    symbol: String,
});
  
const Trx = mongoose.model('Transactions', Transaction);
module.exports = Trx;