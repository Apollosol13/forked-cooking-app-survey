const OpenAI = require('openai');

// Rate limiting storage (in production, use Redis or database)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_USER = 5;

// Check rate limiting
function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || [];
  
  // Remove old requests
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= MAX_REQUESTS_PER_USER) {
    return false;
  }
  
  // Add current request
  validRequests.push(now);
  rateLimits.set(userId, validRequests);
  return true;
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { ingredients, servings, userId } = JSON.parse(event.body);

    // Validate required fields
    if (!ingredients || !servings || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: ingredients, servings, userId' })
      };
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' })
      };
    }

    // Initialize OpenAI with server-side key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Server-side only, no VITE_ prefix
    });

    // Generate recipe (simplified for security)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional chef. Create a recipe using the provided ingredients."
        },
        {
          role: "user",
          content: `Create a recipe for ${servings} servings using: ${ingredients.join(', ')}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const recipe = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(recipe)
    };

  } catch (error) {
    console.error('Recipe generation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate recipe. Please try again.'
      })
    };
  }
};
