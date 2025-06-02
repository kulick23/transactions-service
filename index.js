const express = require("express");
const app = express();
app.use(express.json());

let transactions = [];

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