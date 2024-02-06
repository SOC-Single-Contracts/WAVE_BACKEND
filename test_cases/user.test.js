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
    
    test("Insert JSON File in to Google Drive", async () => {
      const response = await supertest(app)
        .post("/api/upload_files")
        .send({
            file: FileJSON
        });
        expect(response.statusCode).toBe(200);
   
    });

  });