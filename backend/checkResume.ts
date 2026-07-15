import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ResumeProfile from './src/models/ResumeProfile';
import User from './src/models/User';

async function checkResume() {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    const user = await User.findOne({ email: 'sahnikhil905@gmail.com' });
    if (!user) return console.log("User not found");

    const profile = await ResumeProfile.findOne({ user: user._id });
    if (!profile) return console.log("Profile not found");

    console.log("Projects in DB:");
    console.log(profile.projects.map((p: any) => p.name));
  } catch (error: any) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}
checkResume();
