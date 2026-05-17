const express = require('express');
const dotenv = require('dotenv');

const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

dotenv.config();


const app = express();
const port = process.env.PORT || 8080;


app.use(cors());


app.get('/', (req, res) => {
  res.send('Hello World!');
});










const uri = "mongodb+srv://novamed:PY22qgU03VH6L81d@cluster0.agkguij.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();


    const db = client.db("novameddb")
    const detailsCollection = db.collection("drdetails")

    app.get("/details", async (req, res) => {
      const cursor = detailsCollection.find();
      const result = await cursor.toArray();
      // console.log(result);
      res.send(result)
    })







    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);






app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});