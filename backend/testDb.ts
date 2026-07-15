import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI || '';

async function test() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // check if user exists
    const db = mongoose.connection.db;
    const users = await db?.collection('users').find({}).toArray();
    console.log('Users found:', users?.length);
    if (users && users.length > 0) {
      console.log('Sample user:', { email: users[0].email, name: users[0].name });
    }
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    mongoose.disconnect();
  }
}

test();
