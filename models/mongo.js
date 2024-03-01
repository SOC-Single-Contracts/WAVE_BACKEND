const mongoose = require('mongoose');

const User = new mongoose.Schema({
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    wallet: {
      type: String,
      default: 0,
    },
    wallet_eth: {
      type: String,
      default: 0,
    },
    accounts: [{
      account: { type: String },
      account_eth: { type: String }
    }],
});

const register = mongoose.model('TappUser', User);
module.exports = register;