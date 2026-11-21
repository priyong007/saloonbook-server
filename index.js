import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { MongoClient } from 'mongodb';
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

const mongoClient= await  connectToMongoDB();
const database = mongoClient.db('salonbookDb');
const users = database.collection('user');

app.get('/', (req, res) => {
  res.send('Hello saloon server World!')
})

app.get('/users', async (req, res) => {
    const cursor = users.find({});
    const result = await cursor.toArray();
    res.send(result);
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
