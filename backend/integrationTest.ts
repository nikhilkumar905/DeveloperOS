import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:6500/api';

async function testBackend() {
  try {
    console.log('Testing auth register...');
    const email = `testuser_${Date.now()}@example.com`;
    const authRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test User',
      email: email,
      password: 'password123'
    });
    const token = authRes.data.token;
    console.log(`Registration successful for ${email}! Token acquired.`);

    console.log('\nTesting Dashboard APIs...');
    const headers = { Authorization: `Bearer ${token}` };
    
    // Stats
    const statsRes = await axios.get(`${BASE_URL}/dashboard/stats`, { headers });
    console.log('Stats Response:', Object.keys(statsRes.data));

    // Weekly Activity
    const weeklyRes = await axios.get(`${BASE_URL}/activity/weekly`, { headers });
    console.log('Weekly Activity Days:', weeklyRes.data.days?.length);

    // Heatmap
    const heatmapRes = await axios.get(`${BASE_URL}/activity/heatmap`, { headers });
    console.log('Heatmap Sessions:', heatmapRes.data.sessions?.length);

    // Knowledge Graph
    try {
      const kgRes = await axios.get(`${BASE_URL}/developer/intelligence`, { headers });
      console.log('Knowledge Graph Nodes:', kgRes.data.graph?.nodes?.length);
    } catch (e: any) {
      console.log('KG failed:', e.response?.status);
    }

    // Resume Infer
    try {
      const resumeRes = await axios.post(`${BASE_URL}/resume/infer`, {}, { headers });
      console.log('Resume Inference Status:', resumeRes.status);
    } catch (e: any) {
      console.log('Resume Infer failed:', e.response?.data?.message || e.message);
    }

    console.log('\nCore APIs testing complete!');
  } catch (error: any) {
    console.error('Test Failed:', error.response?.data || error.message);
  }
}

testBackend();
