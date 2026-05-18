const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json()); // Essential for handling JSON requests later

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
    // Connect the client to the server
    await client.connect();

    const db = client.db("novameddb");
    const detailsCollection = db.collection("drdetails");

    // Get all appointments
    app.get("/all-appointment", async (req, res) => {
      try {
        const cursor = detailsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch appointments", error });
      }
    });

   
    app.get('/all-appointment/:detailsId', async (req, res) => {
      try {
        const { detailsId } = req.params;
        
     console.log(detailsId);
        if (!ObjectId.isValid(detailsId)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }

        const query = { _id: detailsId };
        
     
        const result = await detailsCollection.findOne(query); 

        if (!result) {
          return res.status(404).send({ message: "Appointment not found" });
        }

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

// Run the database function
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});