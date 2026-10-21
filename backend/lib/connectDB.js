import mongoose from "mongoose";
import dns from "dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  // Ignore in environments where setting DNS servers is restricted
}

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );

    return connection;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }
};

export default connectDB;
