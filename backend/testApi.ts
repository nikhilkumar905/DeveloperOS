import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import User from './src/models/User';
import jwt from 'jsonwebtoken';

async function testApi() {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    const user = await User.findOne({ email: 'sahnikhil905@gmail.com' }); // User with 12 repos
    if (!user) return console.log("User not found");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || '', { expiresIn: '1d' });
    console.log("Got token");

    const response = await axios.post('http://localhost:6500/api/resume/infer', {
      targetRole: 'Software Engineer'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log("Infer success! Projects returned:");
    console.log(response.data.profile.projects.map((p: any) => p.name));
  } catch (error: any) {
    console.error("Infer failed:", error.response?.data || error.message);
  } finally {
    mongoose.disconnect();
  }
}
testApi();
