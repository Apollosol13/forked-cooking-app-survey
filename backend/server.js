const express = require('express');
const cors = require('cors');
const Replicate = require('replicate');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

// Generate food image endpoint
app.post('/api/generate-food-image', async (req, res) => {
  try {
    const { recipeTitle, ingredients } = req.body;

    if (!recipeTitle) {
      return res.status(400).json({ error: 'Recipe title is required' });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: 'Replicate API token not configured' });
    }

    // Create a detailed food photography prompt
    const ingredientList = ingredients && ingredients.length > 0 
      ? ingredients.slice(0, 3).join(', ') 
      : '';
    
    const prompt = `Professional food photography of ${recipeTitle}${ingredientList ? ', featuring ' + ingredientList : ''}, shot with high-end camera, perfect lighting, restaurant quality presentation, appetizing, delicious, high resolution, detailed, commercial food photography style, clean background, elegant plating, food styling, mouth-watering, vibrant colors, sharp focus`;

    console.log('Generating image with Replicate:', prompt);

    // Using FLUX 1.1 Pro model for high-quality food images
    console.log('Making FLUX 1.1 Pro API call with prompt:', prompt);
    
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
    
    console.log('Initial prediction:', prediction);
    
    // Wait for the prediction to complete
    const finalPrediction = await replicate.wait(prediction);
    
    console.log('Final prediction status:', finalPrediction.status);
    console.log('Final prediction output:', finalPrediction.output);
    
    const output = finalPrediction.output;

    console.log('FLUX 1.1 Pro response:', output);

    // Debug: Log the actual response from Replicate
    console.log('Replicate API response:', JSON.stringify(output, null, 2));
    console.log('Output type:', typeof output);
    console.log('Is array:', Array.isArray(output));

    // Handle FLUX 1.1 Pro response format with comprehensive debugging
    let imageUrl = null;
    
    console.log('Processing response - checking different formats...');
    
    // Check if it's an async iterator (newer Replicate client)
    if (output && typeof output[Symbol.asyncIterator] === 'function') {
      console.log('Detected async iterator, processing...');
      const results = [];
      for await (const event of output) {
        console.log('Iterator event:', event);
        results.push(event);
      }
      console.log('All iterator results:', results);
      if (results.length > 0) {
        imageUrl = results[results.length - 1]; // Usually the last event contains the final URL
      }
    } else if (typeof output === 'string') {
      // Direct URL string
      console.log('Direct string URL detected');
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      // Array of URLs
      console.log('Array detected, taking first element');
      imageUrl = output[0];
    } else if (output && typeof output === 'object') {
      console.log('Object detected, checking properties...');
      // Check various possible properties
      if (output.url) {
        imageUrl = output.url;
      } else if (output.output) {
        imageUrl = output.output;
      } else if (output.data) {
        imageUrl = output.data;
      } else if (output.result) {
        imageUrl = output.result;
      } else {
        console.log('Object properties:', Object.keys(output));
      }
    }

    console.log('Final extracted imageUrl:', imageUrl);
    console.log('ImageUrl type:', typeof imageUrl);

    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      console.log('Returning valid FLUX 1.1 Pro image URL:', imageUrl);
      res.json({ imageUrl: imageUrl });
    } else {
      console.log('No valid HTTP URL found in FLUX 1.1 Pro response');
      console.log('Full response for debugging:', JSON.stringify(output, null, 2));
      res.status(500).json({ 
        error: 'Failed to generate image - no valid URL returned',
        debug: {
          outputType: typeof output,
          outputKeys: output && typeof output === 'object' ? Object.keys(output) : 'not an object',
          rawOutput: output
        }
      });
    }

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Alternative endpoint with different model
app.post('/api/generate-food-image-alt', async (req, res) => {
  try {
    const { recipeTitle, ingredients } = req.body;

    if (!recipeTitle) {
      return res.status(400).json({ error: 'Recipe title is required' });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: 'Replicate API token not configured' });
    }

    const ingredientList = ingredients && ingredients.length > 0 
      ? ingredients.slice(0, 3).join(', ') 
      : '';
    
    const prompt = `Ultra-realistic professional food photography of ${recipeTitle}${ingredientList ? ', made with ' + ingredientList : ''}, commercial kitchen lighting, high-end restaurant presentation, appetizing, mouth-watering, detailed textures, perfect composition, food styling, magazine quality, 8K resolution`;

    console.log('Generating alt image with Replicate:', prompt);

    // Using different model for variety
    const output = await replicate.run(
      "prompthero/openjourney:9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb",
      {
        input: {
          prompt: prompt,
          negative_prompt: "cartoon, anime, drawing, painting, illustration, blurry, low quality, amateur, messy, unappetizing, ugly, distorted",
          width: 768,
          height: 768,
          num_outputs: 1,
          num_inference_steps: 50,
          guidance_scale: 7.5
        }
      }
    );

    if (Array.isArray(output) && output.length > 0) {
      res.json({ imageUrl: output[0] });
    } else {
      res.status(500).json({ error: 'Failed to generate image' });
    }

  } catch (error) {
    console.error('Error generating alternative image:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Simple test endpoint for quick debugging
app.post('/api/test-image', async (req, res) => {
  try {
    console.log('Testing FLUX 1.1 Pro with simple prompt...');
    
    const prediction = await replicate.predictions.create({
      version: "80a09d66baa990429c2f5ae8a4306bf778a1b3775afd01cc2cc8bdbe9033769c",
      input: {
        prompt: "Professional food photography of a delicious hamburger on a plate, restaurant quality, appetizing",
        aspect_ratio: "1:1",
        prompt_upsampling: true,
        output_format: "jpg",
        output_quality: 95,
        safety_tolerance: 2
      }
    });
    
    const finalPrediction = await replicate.wait(prediction);
    const output = finalPrediction.output;
    
    console.log('FLUX 1.1 Pro test response:', output);
    res.json({ success: true, output, imageUrl: output });
  } catch (error) {
    console.error('FLUX 1.1 Pro test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📸 Food image generation API ready!`);
  console.log(`🔑 Replicate API token: ${process.env.REPLICATE_API_TOKEN ? 'Configured ✅' : 'Missing ❌'}`);
}); 