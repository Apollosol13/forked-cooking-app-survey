const Replicate = require('replicate');

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const { recipeTitle, ingredients } = JSON.parse(event.body);

    if (!recipeTitle) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Recipe title is required' }),
      };
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Replicate API token not configured' }),
      };
    }

    // Create a detailed food photography prompt
    const ingredientList = ingredients && ingredients.length > 0 
      ? ingredients.slice(0, 3).join(', ') 
      : '';
    
    const prompt = `Professional food photography of ${recipeTitle}${ingredientList ? ', featuring ' + ingredientList : ''}, shot with high-end camera, perfect lighting, restaurant quality presentation, appetizing, delicious, high resolution, detailed, commercial food photography style, clean background, elegant plating, food styling, mouth-watering, vibrant colors, sharp focus`;

    console.log('Generating image with FLUX 1.1 Pro:', prompt);

    // Create prediction and wait for completion
    const prediction = await replicate.predictions.create({
      version: "80a09d66baa990429c2f5ae8a4306bf778a1b3775afd01cc2cc8bdbe9033769c",
      input: {
        prompt: prompt,
        aspect_ratio: "1:1",
        prompt_upsampling: true,
        seed: Math.floor(Math.random() * 1000000),
        output_format: "jpg",
        output_quality: 95,
        safety_tolerance: 2
      }
    });
    
    // Wait for the prediction to complete
    const finalPrediction = await replicate.wait(prediction);
    
    console.log('Final prediction status:', finalPrediction.status);
    console.log('Final prediction output:', finalPrediction.output);
    
    const output = finalPrediction.output;

    // Handle FLUX 1.1 Pro response format
    let imageUrl = null;
    
    if (typeof output === 'string' && output.startsWith('http')) {
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0];
    } else if (output && typeof output === 'object' && output.url) {
      imageUrl = output.url;
    }

    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      console.log('Returning FLUX 1.1 Pro image URL:', imageUrl);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: imageUrl }),
      };
    } else {
      console.log('No valid HTTP URL found in FLUX 1.1 Pro response');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Failed to generate image - no valid URL returned',
          debug: {
            outputType: typeof output,
            output: output
          }
        }),
      };
    }

  } catch (error) {
    console.error('Error generating image:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
    };
  }
}; 