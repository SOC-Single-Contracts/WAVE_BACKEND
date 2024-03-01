const User = require("../models/mongo");
const SolanaTransaction = require("../models/transaction");
const nodemailer = require("nodemailer");
const { randomInt } = require("crypto");
const secret = process.env.ENCRYPTION_KEY;
const jwt = require('jsonwebtoken');
let otpFromEmail = null;

class dbUser {
  constructor() {
    this.otpFromEmail = null;
    this.sendOtp = this.sendOtp.bind(this);
    this.verifyOtp = this.verifyOtp.bind(this);
  }

  async signUp(req, res) {
    try {
      const { email, username, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(200).send({ message: "Email already exists." });
      }
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(200).send({ message: "Username already exists." });
      }
      const user = new User({ email, username, password });
      await user.save();
      res.status(200).send({ message: "User successfully created" });
    } catch (error) {
      res
        .status(500)
        .send({ message: "Server error occurred.", error: error.message });
    }
  }
  async signIn(req, res) {
    try {
      const user = await User.findOne({ username: req.body.username });
      if (!user) {
        return res
          .status(401)
          .send({ message: "Login failed. User not found." });
      }

      if (req.body.password !== user.password) {
        return res
          .status(401)
          .send({ message: "Login failed. Incorrect password." });
      }

      res.status(200).send({ message: "Login successful", user: user });
    } catch (error) {
      console.error("Login error:", error);
      res
        .status(500)
        .send({ message: "An error occurred during the login process." });
    }
  }
  async addWallet(req, res) {
    const { userId, wallet, wallet_eth } = req.body;

    if (wallet === undefined || wallet_eth === undefined) {
      return res
        .status(400)
        .send({ message: "Invalid wallet amount provided." });
    }

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { wallet, wallet_eth } },
        { new: true }
      );

      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }

      res.status(200).send({ message: "Wallet updated successfully", user });
    } catch (error) {
      console.error("Update wallet error:", error);
      res
        .status(500)
        .send({ message: "An error occurred while updating the wallet." });
    }
  }

  async addAccount(req, res) {
    const { userId, account, account_eth } = req.body;

    // Check if both account and account_eth are provided
    // if (!account || !account_eth) {
    //     return res.status(400).send({ message: 'Both account and account_eth keys are required.' });
    // }

    try {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }

      // Check if either account or account_eth already exists
      const accountExists = user.accounts.some(
        (acc) => acc.account === account || acc.account_eth === account_eth
      );
      if (accountExists) {
        return res
          .status(409)
          .send({ message: "This account or account_eth already exists." });
      }

      // Add both account and account_eth to the user's accounts
      user.accounts.push({ account: account, account_eth: account_eth });
      await user.save();

      res.status(200).send({ message: "Account added successfully.", user });
    } catch (error) {
      console.error("Error adding account:", error);
      res
        .status(500)
        .send({ message: "An error occurred while adding the account." });
    }
  }

  async removeAccount(req, res) {
    const { userId, accountIndex } = req.body;

    try {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }

      const index = parseInt(accountIndex, 10);

      if (index < 0 || index >= user.accounts.length) {
        return res.status(400).send({ message: "Invalid account index." });
      }

      user.accounts.splice(index, 1);
      await user.save();

      res
        .status(200)
        .send({ message: "Encrypted account key deleted successfully.", user });
    } catch (error) {
      console.error("Error deleting encrypted account key:", error);
      res
        .status(500)
        .send({
          message:
            "An error occurred while deleting the encrypted account key.",
        });
    }
  }
  async insertTrx(req, res) {
    let transactionData = req.body;
    try {
      const existingTransaction = await SolanaTransaction.findOne({
        transactionId: transactionData.transactionId,
      });
      if (existingTransaction) {
        return res
          .status(201)
          .send({
            message: "Transaction already exists:",
            existingTransaction,
          });
      }
      const newTransaction = new SolanaTransaction(transactionData);
      await newTransaction.save();
      return res
        .status(200)
        .send({ message: "New transaction saved:", newTransaction });
    } catch (error) {
      return res
        .status(400)
        .send({ message: "Error in transaction insertion:", error });
    }
  }
  async getTrx(req, res) {
    let { address } = req.body;
    try {
      const transactions = await SolanaTransaction.find({
        $or: [{ sender: address }, { receiver: address }],
      })
        .sort({ blocktime: -1 })
        .limit(7);
      res.json(transactions);
    } catch (error) {
      res.status(500).send("Error retrieving transactions");
    }
  }

  // Function to send OTP
  async sendOtp(req, res) {
    const email = req.body.postData.email;
    const otp = randomInt(100000, 999999).toString();
    try {
      this.otpFromEmail = otp;
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(401).send({ message: "User not found" });
      }

      // Send OTP email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Verification",
        text: `Your OTP is: ${otp}`,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "OTP sent successfully." });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Function to verify OTP
  async verifyOtp(req, res) {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: "OTP is required." });
    }

    if (otp === this.otpFromEmail) {
      return res.status(200).json({ message: "OTP verified successfully." });
    } else {
      return res.status(401).json({ error: "Invalid OTP." });
    }
  }

  // function to change password
  async changePassword(req, res) {
    try {
      const { userEmail } = req.body;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ error: "New password is required." });
      }

      const user = await User.findOne({ email: userEmail });

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      user.password = jwt.sign(newPassword, secret)
      await user.save();

      res.status(200).json({ message: "Password updated successfully." });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Internal server error. Failed to update password." });
    }
  }

}

module.exports = new dbUser();
