let express = require("express")
let router = express.Router()
const multer  = require('multer')
const path = require("path"); 
const upload = multer({   
    fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    if ( ext !== '.json') {
        return cb(new Error('Invalid mime type'));
    }
    cb(null,true)
}})

let {uploadJson} = require('../controllers/uploadJson')
router.post('/',upload.single("file"),uploadJson)


module.exports = router