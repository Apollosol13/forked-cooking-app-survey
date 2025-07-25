const { GoogleGenerativeAI } = require('@google/generative-ai');

// Rate limiting storage
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_USER = 10;

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || [];
  
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= MAX_REQUESTS_PER_USER) {
    return false;
  }
  
  validRequests.push(now);
  rateLimits.set(userId, validRequests);
  return true;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { transcript, userId } = JSON.parse(event.body);

    // Validate inputs
    if (!transcript || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing transcript or userId' })
      };
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      };
    }

    // Sanitize transcript
    const cleanTranscript = transcript.toString().trim().slice(0, 500); // Limit length

    // Initialize Gemini with server-side key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Extract ingredients from this text and return a JSON array: "${cleanTranscript}"
    
    Rules:
    - Keep multi-word ingredients together (e.g., "jasmine rice")
    - Return only ["ingredient1", "ingredient2"] format
    - Maximum 10 ingredients`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse JSON response
    const ingredients = JSON.parse(responseText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ingredients })
    };

  } catch (error) {
    console.error('Ingredient extraction error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to extract ingredients'
      })
    };
  }
};
