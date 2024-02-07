let express = require("express")
let router = express.Router()

let EVM = require('../controllers/evm-wallet')

router.post('/create/wallet',EVM.createWallet)
router.post('/create/account',EVM.createAccount)
router.post('/import/mnemonic',EVM.importAccount_Memonic)
router.post('/import/privateKey',EVM.importAccount_PrivateKey)
router.post('/import/erc20',EVM.import_erc20)
router.post('/get/balance',EVM.balance)
router.post('/send',EVM.send)
router.post('/send/erc20',EVM.send_erc20)
router.post('/transaction',EVM.transaction)

module.exports = router