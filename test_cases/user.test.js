const supertest = require("supertest");
const app = require('../index'); 
const mongoose = require('mongoose')
const {MongoMemoryServer} = require('mongodb-memory-server')
  
const FileJSON = require('../package.json')

describe("Api Testing", () => {
    
    // beforeAll( async () => {
    //   const mongoServer = await MongoMemoryServer.create()
    //   await mongoose.connect(mongoServer.getUri())
    // })
    // afterAll( async () => {
    //   await mongoose.disconnect();
    //   await mongoose.connection.close();
    // })
    
    test("Craete Evm Wallet", async () => {
      const response = await supertest(app)
        .post("/api/evm/create/wallet").send();
        expect(response.statusCode).toBe(200);
    });

  });