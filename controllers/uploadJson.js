const uploadFile = require("../helper/uploadFile") 

exports.uploadJson = async (req, res) =>{
    try {
        const { file } = req;
        if(!file) return res.status(400).json({message: "File missing, please upload file"})
        
        await uploadFile(file);
        return res.status(200).json({message: "File has been uploaded"})
    } catch (error) {
        return res.status(500).json({message: "Internal server error",error : error.message});
    }
};