const express = require("express");
const amqplib = require("amqplib");

const app = express();
app.use(express.json());

let transactions = [];

const amqpURL = process.env.AMQP_URL || 'amqp://localhost';

// RabbitMQ consumer
async function startConsumer() {
  try {
    const conn = await amqplib.connect(amqpURL);
    const channel = await conn.createChannel();
    await channel.assertQueue('donations');

    channel.consume('donations', msg => {
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
        transactions.push(transaction);
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

app.post("/transactions", (req, res) => {
  const tx = { id: Date.now().toString(), ...req.body };
  transactions.push(tx);
  res.status(201).json({ status: "Transaction saved", tx });
});

app.get("/transactions", (_, res) => res.json(transactions));
app.get("/ping", (_, res) => res.send("pong"));
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.get("/metrics", (_, res) => res.json({ transactions: transactions.length }));

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Transaction service running on ${PORT}`));
