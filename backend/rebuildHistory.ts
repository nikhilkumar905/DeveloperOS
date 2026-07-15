import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { rebuildDailySession } from './src/services/activityAggregator';
import User from './src/models/User';

dotenv.config();

const uri = process.env.MONGO_URI || '';

const toDateString = (d: Date): string => {
  const offset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

async function rebuild() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Get the nikhilsah user
    const user = await User.findOne({ email: 'nikhilsah90536@gmail.com' });
    if (!user) {
      console.error('User not found');
      return;
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = toDateString(today);
    const yesterdayStr = toDateString(yesterday);

    console.log(`Rebuilding sessions for ${user.email} on ${yesterdayStr} and ${todayStr}...`);

    await rebuildDailySession(user._id as mongoose.Types.ObjectId, yesterdayStr);
    await rebuildDailySession(user._id as mongoose.Types.ObjectId, todayStr);

    console.log('Successfully rebuilt sessions!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

rebuild();
