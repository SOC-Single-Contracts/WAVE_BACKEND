const app = require('./index'); 
const port = process.env.PORT || 8081; 

app.use((req, res, next) => {
    const allowedOrigin = process.env.ALLOW_ORIGIN;
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); 
    next();
});

app.listen(port,()=>{
    console.log("Server running on port :", port)
})