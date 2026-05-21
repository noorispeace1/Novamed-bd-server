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
const JWKS = createRemoteJWKSet(new URL(`${process.env.NEXT_PUBLIC_API_URI}/api/auth/jwks`));

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
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

async function run() {
  try {
    const db = client.db("novameddb");
    const detailsCollection = db.collection("drdetails");
    const bookingsCollection = db.collection("bookings");

    app.post("/all-appointment", async (req, res) => {
      try {
        console.log("POST /all-appointment - body:", req.body);
        const doctorData = req.body;
        const result = await detailsCollection.insertOne(doctorData);
        console.log("POST /all-appointment - insertOne result:", result);
        res.status(201).send(result);
      } catch (error) {
        console.error("POST /all-appointment - error:", error);
        res.status(500).send({ message: "Failed to create doctor profile", error });
      }
    });

    app.get("/all-appointment", async (req, res) => {
      try {
        console.log("GET /all-appointment - req.query:", req.query);
        const { search } = req.query;
        console.log("GET /all-appointment - search value:", search);

        let query = {};

        if (search) {
          query = {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { specialty: { $regex: search, $options: 'i' } },
              { hospital: { $regex: search, $options: 'i' } },
            ],
          };
          console.log("GET /all-appointment - query built:", JSON.stringify(query));
        } else {
          console.log("GET /all-appointment - no search, fetching all");
        }

        const cursor = detailsCollection.find(query);
        console.log("GET /all-appointment - cursor created:", !!cursor);

        const result = await cursor.toArray();
        console.log("GET /all-appointment - total results found:", result.length);
        console.log("GET /all-appointment - result preview:", result.slice(0, 2));

        res.send(result);
      } catch (error) {
        console.error("GET /all-appointment - error:", error);
        res.status(500).send({ message: "Failed to fetch appointments", error });
      }
    });

    app.get('/all-appointment/:detailsId', async (req, res) => {
      try {
        console.log("GET /all-appointment/:id - params:", req.params);
        const { detailsId } = req.params;

        if (!ObjectId.isValid(detailsId)) {
          console.warn("GET /all-appointment/:id - invalid ObjectId:", detailsId);
          return res.status(400).send({ message: "Invalid ID format" });
        }

        const query = { _id: new ObjectId(detailsId) };
        console.log("GET /all-appointment/:id - query:", query);

        const result = await detailsCollection.findOne(query);
        console.log("GET /all-appointment/:id - result found:", !!result);
        console.log("GET /all-appointment/:id - result:", result);

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
        console.log("PUT /all-appointment/:id - params:", req.params);
        console.log("PUT /all-appointment/:id - body:", req.body);
        const { detailsId } = req.params;

        if (!ObjectId.isValid(detailsId)) {
          console.warn("PUT /all-appointment/:id - invalid ObjectId:", detailsId);
          return res.status(400).send({ message: "Invalid ID format" });
        }

        const filter = { _id: new ObjectId(detailsId) };
        const updatedDoc = { $set: req.body };
        console.log("PUT /all-appointment/:id - filter:", filter);
        console.log("PUT /all-appointment/:id - updatedDoc:", updatedDoc);

        const result = await detailsCollection.updateOne(filter, updatedDoc);
        console.log("PUT /all-appointment/:id - matchedCount:", result.matchedCount);
        console.log("PUT /all-appointment/:id - modifiedCount:", result.modifiedCount);

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
        console.log("DELETE /all-appointment/:id - params:", req.params);
        const { detailsId } = req.params;

        if (!ObjectId.isValid(detailsId)) {
          console.warn("DELETE /all-appointment/:id - invalid ObjectId:", detailsId);
          return res.status(400).send({ message: "Invalid ID format" });
        }

        const query = { _id: new ObjectId(detailsId) };
        console.log("DELETE /all-appointment/:id - query:", query);

        const result = await detailsCollection.deleteOne(query);
        console.log("DELETE /all-appointment/:id - deletedCount:", result.deletedCount);

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
        console.log("GET /booking/:id - params:", req.params);
        const { detailsId } = req.params;

        const result = await bookingsCollection.find({ userId: detailsId }).toArray();
        console.log("GET /booking/:id - bookings found:", result.length);
        console.log("GET /booking/:id - result:", result);

        res.json(result);
      } catch (error) {
        console.error("GET /booking/:id - error:", error);
        res.status(500).send({ message: "Failed to fetch bookings", error });
      }
    });

    app.post("/bookings",verifyToken, async (req, res) => {
      try {
        console.log("POST /bookings - body:", req.body);
        const bookingData = req.body;
        const finalBooking = {
          ...bookingData,
          createdAt: new Date()
        };
        console.log("POST /bookings - finalBooking to insert:", finalBooking);

        const result = await bookingsCollection.insertOne(finalBooking);
        console.log("POST /bookings - insertOne result:", result);

        res.status(201).send(result);
      } catch (error) {
        console.error("POST /bookings - error:", error);
        res.status(500).send({ message: "Failed to save booking", error });
      }
    });

    app.get("/bookings", async (req, res) => {
      try {
        console.log("GET /bookings - req.query:", req.query);
        const email = req.query.email;
        console.log("GET /bookings - email filter:", email);

        let query = {};
        if (email) {
          query = { userEmail: email };
          console.log("GET /bookings - query with email:", query);
        } else {
          console.log("GET /bookings - no email, fetching all bookings");
        }

        const result = await bookingsCollection.find(query).toArray();
        console.log("GET /bookings - total found:", result.length);
        console.log("GET /bookings - result:", result);

        res.send(result);
      } catch (error) {
        console.error("GET /bookings - error:", error);
        res.status(500).send({ message: "Failed to fetch bookings", error });
      }
    });

    app.put("/bookings/:id", async (req, res) => {
      try {
        console.log("PUT /bookings/:id - params:", req.params);
        console.log("PUT /bookings/:id - body:", req.body);
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          console.warn("PUT /bookings/:id - invalid ObjectId:", id);
          return res.status(400).send({ message: "Invalid Booking ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateData = { ...req.body };
        delete updateData._id;
        const updatedDoc = { $set: updateData };
        console.log("PUT /bookings/:id - filter:", filter);
        console.log("PUT /bookings/:id - updatedDoc:", updatedDoc);

        const result = await bookingsCollection.updateOne(filter, updatedDoc);
        console.log("PUT /bookings/:id - matchedCount:", result.matchedCount);
        console.log("PUT /bookings/:id - modifiedCount:", result.modifiedCount);

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
        console.log("DELETE /bookings/:id - params:", req.params);
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          console.warn("DELETE /bookings/:id - invalid ObjectId:", id);
          return res.status(400).send({ message: "Invalid Booking ID format" });
        }

        const query = { _id: new ObjectId(id) };
        console.log("DELETE /bookings/:id - query:", query);

        const result = await bookingsCollection.deleteOne(query);
        console.log("DELETE /bookings/:id - deletedCount:", result.deletedCount);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Booking not found" });
        }
        res.send({ message: "Booking deleted successfully", result });
      } catch (error) {
        console.error("DELETE /bookings/:id - error:", error);
        res.status(500).send({ message: "Failed to delete booking", error });
      }
    });

    console.log("MongoDB connection integrated successfully!");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`NovaMed server listening on port ${port}`);
});