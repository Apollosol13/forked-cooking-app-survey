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
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const openai = new OpenAI({
      apiKey: apiKey, // Server-side only, no VITE_ prefix
    });

    // Generate recipe with structured JSON output
    const ingredientsText = ingredients.join(', ');
    
    const prompt = `Create a detailed, professional recipe using these ingredients: ${ingredientsText} for ${servings} servings.

Return your response as a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "difficulty": "Easy" or "Medium" or "Hard",
  "time": "XX minutes",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "nutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  }
}

Important: Return ONLY the JSON object, no additional text or formatting.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional chef. Return only valid JSON responses with no additional text or formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    // Extract the response content
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Clean the response (remove markdown formatting if present)
    let cleanedResponse = responseContent.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let recipe;
    try {
      recipe = JSON.parse(cleanedResponse);
    } catch (parseError) {
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the recipe structure
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('AI returned incomplete recipe');
    }

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
