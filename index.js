const amqp = require('amqplib');

async function startConsumer() {
  const conn = await amqp.connect(process.env.RABBIT_URL || 'amqp://rabbitmq');
  const ch = await conn.createChannel();
  await ch.assertQueue('donation-events');
  await ch.assertQueue('logs');

  ch.consume('donation-events', msg => {
    const data = JSON.parse(msg.content.toString());
    console.log('Received donation event:', data);

    const log = {
      type: 'donation',
      timestamp: new Date(),
      data
    };

    ch.sendToQueue('logs', Buffer.from(JSON.stringify(log)));
    ch.ack(msg);
  });
}

startConsumer().then(() => console.log('Transactions service started'));