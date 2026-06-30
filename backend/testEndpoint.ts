import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import axios from 'axios';

const secret = 'd7f5234ef0e0faa10e17ff4f55beb52af08c02226ff0e864e98e1366a9177752f8cd34fddaf0015ed66f0426dd7f36c27105888c2c9a4ff8cc8bc4fb37da77eb';
const dummyId = new mongoose.Types.ObjectId().toString();

const token = jwt.sign({ id: dummyId }, secret, { expiresIn: '1h' });

async function test() {
  try {
    const res = await axios.options('http://localhost:5000/api/leetcode/stats', {
      headers: { 
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization'
      }
    });
    console.log(`Status: ${res.status}`);
  } catch (err: any) {
    console.log(`Status: ${err.response?.status}`);
    console.log(`Error: ${JSON.stringify(err.response?.data)}`);
  }
}

test();
