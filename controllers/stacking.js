const Staking = require("../models/stacking");
const StackingDetails = require("../models/stacking_details");
const mongoose = require("mongoose")

// {
//   "encrypt": {
//     "publicKey": "3BEVzxnYu7AJAjfqhTDw7frNUdRxZGVNthw1cyJLHp8N",
//     "mnemonic": "nominee sea lounge scene couple couch crane follow ghost lunar parade bubble",
//     "secretKey": "4Rws8XP6H6ivBDCUb9D3cPknpacCDYaHagt1bxuv7Tfb7XpqxZfvHwi5HGqYva91hJuHSKzex2jmF85Pi9unE7iW"
//   }
// }
// {
//   "encrypt": {
//     "publicKey": "AeAEN86RK4A9ftQ889wa3nWQdTPcQQCwEGEdo6qFu3hi",
//     "mnemonic": "pottery excite fiction surround silk team lift pole cigar sauce uncle token",
//     "secretKey": "2cx6NoAVyZMJn3iMVCXmarTqWSkJzTRyN3LFD8DqAbEzYW6s2uFyDESKwtbht9GMcGE899zHHWa3GNQZrqPbY5zG"
//   }
// }

class Stacking {
  async AdminStacked(req, res) {
    try {
      const { rpcUrl, apr, locktime, network_type } = req.body;
      if (!rpcUrl || !apr || !locktime || !network_type) {
        return res.status(400).send({ message: "Required field is missing" });
      }
      const existingStack = await StackingDetails.findOne({ network_type });
      if (existingStack) {
        existingStack.rpcUrl = rpcUrl;
        existingStack.apr = apr;
        existingStack.locktime = locktime;
        await existingStack.save();
        return res
          .status(200)
          .send({ message: "Staking configuration updated successfully" });
      } else {
        const newStackValue = new StackingDetails({
          rpcUrl,
          apr,
          locktime,
          network_type,
        });
        await newStackValue.save();
        return res
          .status(200)
          .send({ message: "Staking configuration added successfully" });
      }
    } catch (error) {
      return res
        .status(500)
        .send({ message: "Server error occurred", error: error.message });
    }
  }
  async get_stacked_config(req, res) {
    try {
      const { network_type } = req.body;
      if (!network_type) {
        return res.status(404).send({ message: "Required Field is Missing" });
      }
      const getStaking = await StackingDetails.find({
        network_type: network_type,
      });
      return res
        .status(200)
        .send({
          message: "get Staking Details successfully",
          data: getStaking,
        });
    } catch (error) {
      return res
        .status(500)
        .send({ message: "Server error occurred.", error: error.message });
    }
  }

  async claimAmount(req, res){
    try {
      const {id} = req.body;
      
      let objectId = id
      if (!mongoose.Types.ObjectId.isValid(objectId)) {
          return res.status(400).send({ message: "Invalid ObjectID" });
      }

      // Find the document by ID and update the claim field to false
      const updatedStack = await Staking.findByIdAndUpdate(objectId, { $set: { claim: false } }, { new: true });

      // Check if the document with the provided ID exists
      if (!updatedStack) {
          return res.status(404).send({ message: "Document not found" });
      }

      return res.status(200).send({ message: "Claim Successfully", updatedStack });
  } catch (error) {
      return res.status(500).send({ message: "Server error occurred", error: error.message });
  }
  }
  async stacked(req, res) {
    try {
      const { rpcUrl, wallet, wallet_type, amount } = req.body;
      if (!wallet || !wallet_type) {
        return res.status(404).send({ message: "Required Field is Missing" });
      }
      const StackValue = new Staking({ rpcUrl, wallet, wallet_type, amount });
      await StackValue.save();
      return res.status(200).send({ message: "Staking successfully" });
    } catch (error) {
      return res
        .status(500)
        .send({ message: "Server error occurred.", error: error.message });
    }
  }
  async get_stacked_byWallet(req, res) {
    try {
      const { wallet, wallet_type } = req.body;
      if (!wallet || !wallet_type) {
        return res.status(404).send({ message: "Required Field is Missing" });
      }
      const getStaking = await Staking.find({
        wallet: wallet,
        wallet_type: wallet_type,
      }).sort({ date: -1 });
      return res
        .status(200)
        .send({ message: "get Staking successfully", data: getStaking });
    } catch (error) {
      return res
        .status(500)
        .send({ message: "Server error occurred.", error: error.message });
    }
  }
}

module.exports = new Stacking();
