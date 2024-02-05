let express = require("express");
let app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true }));


const uploadFileToGDrive = require("./routes/uploadJson");
app.use('/api/upload_files', uploadFileToGDrive);


let port =5000
let server = app.listen(port,()=>{
    console.log("Server running on port :", port)
})
 
