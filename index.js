import express from "express";
import { dbConnection } from "./Database/dbConnection.js";
import { bootstrap } from "./src/bootstrap.js";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from 'cors'
import { createOnlineOrder } from "./src/modules/order/order.controller.js";

dotenv.config();
const app = express();
app.use(cors())

const port = process.env.PORT || 3000;

// Middleware BEFORE routes
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static("uploads"));

// Health check endpoint (for container probes & monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.MODE || 'development'
  });
});

// Webhook route AFTER json middleware
app.post('/webhook', express.raw({type: 'application/json'}), createOnlineOrder);

bootstrap(app);
dbConnection();

const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port} (${process.env.MODE || 'development'} mode)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
