const mongoose = require('mongoose');

const StackedSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now,
        required: true,
    },
    rpcUrl: {
        type: String,
        default: null,
    },
    wallet: {
        type: String,
        required: true,
        default: null,
    },
    amount: {
        type: Number,
        required: true,
        default: 0,
    },
    wallet_type: {
        type: String,
        required: true,
        default: null,
    },
    claim:{
        type: Boolean,
        required: true,
        default: true
    }
});

const Stack = mongoose.model('Stacking', StackedSchema);
module.exports = Stack;
