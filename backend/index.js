import "dotenv/config";
import dns from "dns";
import http from "http";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";

import connectDB from "./lib/connectDB.js";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import webhookRouter from "./routes/webhook.route.js";
import adminRouter from "./routes/admin.route.js";
import channelRouter from "./routes/channel.route.js";
import { initSocket } from "./socket.js";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";

const app = express();
const server = http.createServer(app);

// Initialize real-time Socket.IO with server
initSocket(server);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(clerkMiddleware());
app.use("/webhooks", webhookRouter);
app.use(express.json());

app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);
app.use("/admin", adminRouter);
app.use("/channels", channelRouter);

// Catch-all 404 handler for undefined routes to always return consistent JSON errors
app.use((req, res) => {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);

  res.json({
    message: error.message || "Something went wrong!",
    status: error.status,
    stack: error.stack,
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}!`);
});

export { app, server };
