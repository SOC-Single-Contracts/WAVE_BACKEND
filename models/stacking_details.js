const mongoose = require('mongoose');

const StackedDetailSchema = new mongoose.Schema({
    rpcUrl: {
        type: String,
        default: null,
    },
    apr: {
        type: Number,
        required: true,
        default: null,
    },
    locktime: {
        type: Number,
        required: true,
    },
    network_type: {
        type: String,
        required: true,
        default: null,
    },
});

const StackingDetails = mongoose.model('StackingDetails', StackedDetailSchema);
module.exports = StackingDetails;
