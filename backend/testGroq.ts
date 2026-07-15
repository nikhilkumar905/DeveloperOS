import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testGroq() {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const repoData = [
  {
    "name": "DeveloperOS",
    "description": "",
    "primary_language": "TypeScript",
    "all_languages": ["TypeScript", "CSS", "JavaScript", "Dockerfile", "HTML"],
    "stars": 0,
    "forks": 0,
    "dependencies": 0,
    "commits": 10
  }
]
    const prompt = `You are an expert technical recruiter evaluating a candidate for a Software Engineer role. Here are their GitHub repositories: ${JSON.stringify(repoData)}.
Your task is to select exactly the 3 BEST repositories that highlight complex, scalable, or highly relevant work.
CRITICAL SELECTION CRITERIA:
1. Prioritize full-stack, backend, AI, or complex architecture projects.
2. Prioritize projects using TypeScript, Python, Node, Dockerfile, or system-level languages.
3. Strongly penalize and avoid simple frontend-only projects (especially those where the primary language is just HTML/CSS) unless there are no other options.
4. If a project name implies a complex system (e.g. "OS", "Translator", "Platform", "Management", "API"), prioritize it over basic websites.

Output ONLY a valid JSON object with a single key "projects" containing an array of strings. Example: {"projects": ["repo1", "repo2", "repo3"]}`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    }, {
      headers: { 'Authorization': `Bearer ${groqKey}` }
    });
    
    console.log("Raw LLM Output:", response.data.choices[0].message.content);
  } catch (error: any) {
    console.error("Error response data:", error.response?.data);
    console.error("Error message:", error.message);
  }
}

testGroq();
