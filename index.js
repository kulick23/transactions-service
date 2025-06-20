const express = require("express");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const amqplib = require("amqplib");
const client = require('prom-client');

const mongoUrl = process.env.MONGO_URL;
let db;

MongoClient.connect(mongoUrl, { useUnifiedTopology: true })
  .then(client => {
db = client.db('charity');
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

const app = express();
app.use(express.json());

const amqpURL = process.env.AMQP_URL || 'amqp://localhost';

client.collectDefaultMetrics();            // сбор дефолтных метрик
const transactionsGauge = new client.Gauge({// метрика число транзакций
  name: 'transactions_count',
  help: 'Number of transactions in MongoDB'
});

// RabbitMQ consumer
async function startConsumer() {
  try {
    const conn = await amqplib.connect(amqpURL);
    const channel = await conn.createChannel();
    await channel.assertQueue('donations');

    channel.consume('donations', async msg => {
      if (msg !== null) {
        const donation = JSON.parse(msg.content.toString());
        const transaction = {
          id: Date.now().toString(),
          type: 'donation',
          amount: donation.amount,
          donor: donation.donor,
          user: donation.user || {},
          createdAt: new Date().toISOString(),
        };
        await db.collection('transactions').insertOne(transaction);

        console.log('Transaction added from queue:', transaction);
        channel.ack(msg);
      }
    });

    console.log('Transaction service is listening to queue...');
  } catch (err) {
    console.error('RabbitMQ error:', err.message);
  }
}

startConsumer();

app.post("/transactions", async (req, res) => {
  const tx = { id: Date.now().toString(), ...req.body };
  await db.collection('transactions').insertOne(tx);
  res.status(201).json({ status: "Transaction saved", tx });
});

app.get("/transactions", async (_, res) => {
  const transactions = await db.collection('transactions').find().toArray();
  res.json(transactions);
});
app.get("/ping", (_, res) => res.send("pong"));
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.get("/metrics", async (_, res) => {
  const count = await db.collection('transactions').countDocuments();
  transactionsGauge.set(count);
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Transaction service running on ${PORT}`));
