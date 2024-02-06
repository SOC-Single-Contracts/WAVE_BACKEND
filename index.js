let express = require("express");
let app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true }));


const uploadFileToGDrive = require("./routes/uploadJson");
app.use('/api/upload_files', uploadFileToGDrive);
 
module.exports = app;