import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';

dotenv.config();

const resetPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('MongoDB Connected');

    const users = await User.find({});
    for (const user of users) {
      user.password = 'password123';
      await user.save();
    }
    console.log(`Reset passwords to "password123" for ${users.length} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetPasswords();
