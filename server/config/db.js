const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/staffsync_db');
    console.log(`[StaffSync Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[StaffSync Database Error] ${error.message}`);
    console.error(`Please ensure your MongoDB service is running locally on port 27017 or update MONGODB_URI in server/.env`);
    process.exit(1);
  }
};

module.exports = connectDB;
