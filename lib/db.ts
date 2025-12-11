import mongoose from 'mongoose';

// MongoDB connection function with singleton pattern
const connection: { isConnected?: number } = {};

async function connectDB(): Promise<void> {
  if (connection.isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  // Use MONGODB_URI consistently throughout the app
  const mongoUri: string =
    process.env.MONGODB_URI ||
    'mongodb://romaralquizar21:romar09129811481@ac-vqwjsji-shard-00-00.cql4lvq.mongodb.net:27017,ac-vqwjsji-shard-00-01.cql4lvq.mongodb.net:27017,ac-vqwjsji-shard-00-02.cql4lvq.mongodb.net:27017/?replicaSet=atlas-gnmcfu-shard-0&ssl=true&authSource=admin';

  if (!mongoUri) {
    throw new Error('MongoDB connection string is not configured. Please set MONGODB_URI in .env.');
  }

  try {
    // Remove deprecated options - they're no longer needed in Mongoose 6+
    await mongoose.connect(mongoUri);
    connection.isConnected = mongoose.connections[0].readyState;
    console.log('New MongoDB connection established');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Failed to connect to MongoDB');
  }
}

// Disconnect function (optional for cleanup)
async function disconnectDB(): Promise<void> {
  if (connection.isConnected) {
    await mongoose.disconnect();
    connection.isConnected = 0;
    console.log('MongoDB connection disconnected');
  }
}

export { connectDB, disconnectDB };

// ✅ Fix: add default export for compatibility
export default connectDB;
