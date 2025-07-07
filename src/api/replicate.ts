import Replicate from 'replicate';

const replicate = new Replicate({
  auth: import.meta.env.VITE_REPLICATE_API_TOKEN,
});

export async function generateFoodImage(recipeTitle: string, ingredients: string[]): Promise<string | null> {
  if (!import.meta.env.VITE_REPLICATE_API_TOKEN || import.meta.env.VITE_REPLICATE_API_TOKEN === 'your_replicate_api_token_here') {
    console.warn('Replicate API token not configured');
    return null;
  }

  try {
    // Create a detailed food photography prompt
    const ingredientList = ingredients.slice(0, 3).join(', '); // Use first 3 ingredients
    const prompt = `Professional food photography of ${recipeTitle}, featuring ${ingredientList}, shot with high-end camera, perfect lighting, restaurant quality presentation, appetizing, delicious, high resolution, detailed, 8K, commercial food photography style, clean background, elegant plating`;

    console.log('Generating image with Replicate:', prompt);

    // Using SDXL model fine-tuned for high-quality images
    // You can replace this with other food-specific models
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: prompt,
          negative_prompt: "blurry, low quality, ugly, unappetizing, poor lighting, amateur, messy, dirty, old food, moldy, burnt, overcooked, undercooked, raw meat, uncooked, bad composition, cluttered, dark, grainy",
          width: 1024,
          height: 1024,
          num_outputs: 1,
          scheduler: "K_EULER",
          num_inference_steps: 25,
          guidance_scale: 7.5,
          seed: Math.floor(Math.random() * 1000000)
        }
      }
    );

    // The output is typically an array of image URLs
    if (Array.isArray(output) && output.length > 0) {
      return output[0] as string;
    }

    return null;
  } catch (error) {
    console.error('Replicate image generation failed:', error);
    return null;
  }
}

// Alternative: High-quality food photography model (if you want to try a different one)
export async function generateFoodImageAlternative(recipeTitle: string): Promise<string | null> {
  if (!import.meta.env.VITE_REPLICATE_API_TOKEN || import.meta.env.VITE_REPLICATE_API_TOKEN === 'your_replicate_api_token_here') {
    return null;
  }

  try {
    const prompt = `Ultra-realistic professional food photography of ${recipeTitle}, commercial kitchen lighting, high-end restaurant presentation, appetizing, mouth-watering, detailed textures, perfect composition, food styling, 8K resolution`;

    // Alternative model - Midjourney-style for more artistic results
    const output = await replicate.run(
      "prompthero/openjourney:9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb",
      {
        input: {
          prompt: prompt,
          negative_prompt: "cartoon, anime, drawing, painting, illustration, blurry, low quality, amateur, messy, unappetizing",
          width: 512,
          height: 512,
          num_outputs: 1,
          num_inference_steps: 50,
          guidance_scale: 7
        }
      }
    );

    if (Array.isArray(output) && output.length > 0) {
      return output[0] as string;
    }

    return null;
  } catch (error) {
    console.error('Alternative Replicate generation failed:', error);
    return null;
  }
} 