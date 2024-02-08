let express = require("express")
let router = express.Router()

let SOL = require('../controllers/solana-wallet')

router.post('/create/wallet',SOL.createWallet)
router.post('/create/account',SOL.createAccount)
router.post('/import/mnemonic',SOL.importAccount_Memonic)
router.post('/import/privateKey',SOL.importAccount_PrivateKey)
router.post('/import/erc20',SOL.import_erc20)
router.post('/get/balance',SOL.balance)
router.post('/send/erc20',SOL.send_erc20)
router.post('/send',SOL.send)
router.post('/transaction',SOL.transaction)

module.exports = router