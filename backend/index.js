
import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import connectDB from "./lib/connectDB.js";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import webhookRouter from "./routes/webhook.route.js";
import adminRouter from "./routes/admin.route.js";
import channelRouter from "./routes/channel.route.js";
import { initSocket } from "./socket.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as server-to-server calls.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);

// Keep webhook parsing compatible with your existing webhook handler.
// If it verifies Svix signatures, it must receive the raw request body.
app.use("/webhooks", webhookRouter);

app.use(express.json());
app.use(clerkMiddleware());

app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);
app.use("/admin", adminRouter);
app.use("/channels", channelRouter);

app.use((req, res) => {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error("Request error:", error);

  res.status(error.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong!"
        : error.message,
    ...(process.env.NODE_ENV !== "production" && {
      stack: error.stack,
    }),
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();

    // Socket.IO shares the same HTTP server.
    initSocket(server);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Veles backend:", error);
    process.exit(1);
  }
}

startServer();

export { app, server };
