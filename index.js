const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

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


const JWKS = createRemoteJWKSet(new URL(`${process.env.ClIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    req.user = payload; 
    console.log("Token payload verified successfully:", payload);
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(403).json({ message: "Forbidden" });
  }
};


let db, detailsCollection, bookingsCollection;

async function connectDB() {
  try {

    await client.connect();
    
    db = client.db("novameddb");
    detailsCollection = db.collection("drdetails");
    bookingsCollection = db.collection("bookings");

    console.log("MongoDB connection integrated successfully!");
  } catch (err) {
    console.error("Database initialization failed:", err);
    process.exit(1);
  }
}



app.post("/all-appointment", async (req, res) => {
  try {
    console.log("POST /all-appointment - body:", req.body);
    const doctorData = req.body;
    const result = await detailsCollection.insertOne(doctorData);
    res.status(201).send(result);
  } catch (error) {
    console.error("POST /all-appointment - error:", error);
    res.status(500).send({ message: "Failed to create doctor profile", error });
  }
});

app.get("/all-appointment", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { specialty: { $regex: search, $options: 'i' } },
          { hospital: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const cursor = detailsCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    console.error("GET /all-appointment - error:", error);
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
    console.error("GET /all-appointment/:id - error:", error);
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
    console.error("PUT /all-appointment/:id - error:", error);
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
    console.error("DELETE /all-appointment/:id - error:", error);
    res.status(500).send({ message: "Failed to delete doctor profile", error });
  }
});

app.get("/booking/:detailsId", async (req, res) => {
  try {
    const { detailsId } = req.params;
    const result = await bookingsCollection.find({ userId: detailsId }).toArray();
    res.json(result);
  } catch (error) {
    console.error("GET /booking/:id - error:", error);
    res.status(500).send({ message: "Failed to fetch bookings", error });
  }
});

app.post("/bookings", verifyToken, async (req, res) => {
  try {
    const bookingData = req.body;
    const finalBooking = {
      ...bookingData,
      createdAt: new Date()
    };

    const result = await bookingsCollection.insertOne(finalBooking);
    res.status(201).send(result);
  } catch (error) {
    console.error("POST /bookings - error:", error);
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
    console.error("GET /bookings - error:", error);
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
    delete updateData._id; // Prevents Mongo from crashing if the client sends an immutable _id property
    const updatedDoc = { $set: updateData };

    const result = await bookingsCollection.updateOne(filter, updatedDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Booking not found" });
    }
    res.send({ message: "Booking updated successfully", result });
  } catch (error) {
    console.error("PUT /bookings/:id - error:", error);
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
    console.error("DELETE /bookings/:id - error:", error);
    res.status(500).send({ message: "Failed to delete booking", error });
  }
});

// FIX 4: Establish the database connection first, then spin up the HTTP listener
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`NovaMed server listening on port ${port}`);
  });
});