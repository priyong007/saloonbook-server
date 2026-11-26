import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
const app = express();
const port = process.env.PORT || 5000;



//midlewear
app.use(express.json());
app.use(cors());


const client = new MongoClient(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vmdfl6j.mongodb.net/`);


export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const database = mongoClient.db('salonbookDb');
const users = database.collection('user');
const services = database.collection('services');
const appointments = database.collection('appointments')

app.get('/', (req, res) => {
  res.send('Hello saloon server World!')
})

app.get('/users', async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray();
  res.send(result);
})

// services related api


app.get('/services', async (req, res) => {
    const query = {};

    // Search by name
    if (req.query.name) {
        query.name = {
            $regex: req.query.name,
            $options: 'i'
        };
    }

    // Category filter
    if (req.query.category) {
        query.category = {
            $regex: `^${req.query.category}$`,
            $options: 'i'
        };
    }

    // Price filter
    if (req.query.price === 'under-500') {
        query.price = { $lt: 500 };
    }
    else if (req.query.price === '500-1000') {
        query.price = { $gte: 500, $lte: 1000 };
    }
    else if (req.query.price === '1000-2000') {
        query.price = { $gte: 1000, $lte: 2000 };
    }
    else if (req.query.price === 'over-2000') {
        query.price = { $gt: 2000 };
    }

    // Duration filter
    if (req.query.duration === 'under-30') {
        query.duration = { $lt: 30 };
    }
    else if (req.query.duration === '30-60') {
        query.duration = { $gte: 30, $lte: 60 };
    }
    else if (req.query.duration === '60-90') {
        query.duration = { $gte: 60, $lte: 90 };
    }
    else if (req.query.duration === 'over-90') {
        query.duration = { $gt: 90 };
    }

    // Sort
    const sortOptions = {
        newest: { createdAt: -1 },
        'price-asc': { price: 1 },
        'price-desc': { price: -1 },
        'duration-asc': { duration: 1 },
        'duration-desc': { duration: -1 }
    };

    const sort = sortOptions[req.query.sort] || sortOptions.newest;

    const result = await services
        .find(query)
        .sort(sort)
        .toArray();

    res.send(result);
});



app.get("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid service ID",
      });
    }

    const service = await services.findOne({
      _id: new ObjectId(id),
    });

    if (!service) {
      return res.status(404).send({
        message: "Service not found",
      });
    }

    res.send(service);

  } catch (error) {
    console.error("Get service error:", error);

    res.status(500).send({
      message: "Internal server error",
    });
  }
});



app.delete('/services/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await services.deleteOne(query);
  res.send(result);
})


// appointments related api



app.get('/my-appointments', async (req, res) => {
    try {
        const userId = req.query.userId;

        if (!userId) {
            return res.status(400).send({
                success: false,
                message: "User ID is required"
            });
        }

        const query = {
            userId: userId
        };

        const result = await appointments
            .find(query)
            .toArray();

        res.send({
            success: true,
            result
        });

    } catch (error) {
        console.error(error);

        res.status(500).send({
            success: false,
            message: "Failed to fetch appointments"
        });
    }
});






app.post('/appointments', async (req, res) => {
  try {
    const appointmentData = {
  ...req.body,
  status: "pending",
  appointmentStatus: "pending",
  paymentStatus: "unpaid",
  createdAt: new Date(),
};

    const result = await appointments.insertOne(appointmentData);

    res.status(201).send({
      success: true,
      message: "Appointment booked successfully",
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.error("Appointment booking error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to book appointment",
    });
  }
});




app.get('/appointments/count', async (req, res) => {
  try {
    const query = {};

    if (req.query.git) {
      query.userId = req.query.userId;
    }

    const result = await appointments.countDocuments(query);

    res.send({ count: result });

  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to count appointments",
    });
  }
});



// Cancel appointment


app.patch('/appointments/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const result = await appointments.updateOne(
      {
        _id: new ObjectId(id),
        $or: [
          { status: "pending" },
          { appointmentStatus: "pending" },
          {
            status: { $exists: false },
            appointmentStatus: { $exists: false },
          },
        ],
      },
      {
        $set: {
          status: "cancelled",
          appointmentStatus: "cancelled",
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Appointment not found or cannot be cancelled",
      });
    }

    res.send({
      success: true,
      message: "Appointment cancelled successfully",
    });

  } catch (error) {
    console.error("Cancel appointment error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to cancel appointment",
    });
  }
});






app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
