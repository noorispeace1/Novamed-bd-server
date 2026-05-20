const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('NovaMed Server is Running!');
});

const uri = process.env.MONGODB_URI;

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

    const db = client.db("novameddb");
    const detailsCollection = db.collection("drdetails");
    const bookingsCollection = db.collection("bookings");


    app.post("/all-appointment", async (req, res) => {
      try {
        const doctorData = req.body;
        const result = await detailsCollection.insertOne(doctorData);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to create doctor profile", error });
      }
    });

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
        if (!ObjectId.isValid(detailsId)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }
        const query = { _id: new ObjectId(detailsId) };
        const result = await detailsCollection.findOne(query); 
        if (!result) {
          return res.status(404).send({ message: "Doctor not found" });
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    app.put("/all-appointment/:detailsId", async (req, res) => {
      try {
        const { detailsId } = req.params;
        if (!ObjectId.isValid(detailsId)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }
        const filter = { _id: new ObjectId(detailsId) };
        const updatedDoc = { $set: req.body };
        const result = await detailsCollection.updateOne(filter, updatedDoc);
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Doctor not found" });
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update doctor profile", error });
      }
    });

    app.delete("/all-appointment/:detailsId", async (req, res) => {
      try {
        const { detailsId } = req.params;
        if (!ObjectId.isValid(detailsId)) {
          return res.status(400).send({ message: "Invalid ID format" });
        }
        const query = { _id: new ObjectId(detailsId) };
        const result = await detailsCollection.deleteOne(query);
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Doctor not found" });
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete doctor profile", error });
      }
    });

    
    app.get("/booking/:detailsId", async (req, res) => {
      try {
        const { detailsId } = req.params;
        const result = await bookingsCollection.find({ userId: detailsId }).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch bookings", error });
      }
    });


    app.post("/bookings", async (req, res) => {
      try {
        const bookingData = req.body;
        const finalBooking = {
          ...bookingData,
          createdAt: new Date()
        };
        const result = await bookingsCollection.insertOne(finalBooking);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to save booking", error });
      }
    });

    app.get("/bookings", async (req, res) => {
      try {
        const email = req.query.email;
        let query = {};
        if (email) {
          query = { userEmail: email };
        }
        const result = await bookingsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch bookings", error });
      }
    });

    app.put("/bookings/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Booking ID format" });
        }
        const filter = { _id: new ObjectId(id) };
        
        const updateData = { ...req.body };
        delete updateData._id; 

        const updatedDoc = { $set: updateData };
        const result = await bookingsCollection.updateOne(filter, updatedDoc);
        
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Booking not found" });
        }
        res.send({ message: "Booking updated successfully", result });
      } catch (error) {
        res.status(500).send({ message: "Failed to update booking", error });
      }
    });

    app.delete("/bookings/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid Booking ID format" });
        }
        const query = { _id: new ObjectId(id) };
        const result = await bookingsCollection.deleteOne(query);
        
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Booking not found" });
        }
        res.send({ message: "Booking deleted successfully", result });
      } catch (error) {
        res.status(500).send({ message: "Failed to delete booking", error });
      }
    });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`NovaMed server listening on port ${port}`);
});