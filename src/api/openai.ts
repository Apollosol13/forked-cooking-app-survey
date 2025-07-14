import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, use a backend API
});

export interface GeneratedRecipe {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  time: string;
  ingredients: string[];
  instructions: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export async function generateRecipe(ingredients: string[], servings: number = 4): Promise<GeneratedRecipe> {
  if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key not configured. Please add your API key to .env.local');
  }

  const ingredientsText = ingredients.join(', ');
  
  const prompt = `Create a detailed, professional recipe using these ingredients: ${ingredientsText} for ${servings} servings.

Please respond ONLY with a valid JSON object in this exact format:
{
  "title": "Recipe Name",
  "difficulty": "Easy|Medium|Hard",
  "time": "X minutes",
  "ingredients": ["ingredient 1", "ingredient 2", "..."],
  "instructions": ["Step 1", "Step 2", "..."],
  "nutrition": {
    "calories": 400,
    "protein": 30,
    "carbs": 14,
    "fat": 28
  }
}

CRITICAL REQUIREMENTS for ingredients:
- Include EXACT measurements with units (cups, tablespoons, teaspoons, ounces, pounds, grams, etc.)
- Scale all quantities precisely for exactly ${servings} servings
- Include specific cuts/types (e.g., "boneless chicken thighs" not just "chicken")
- Add necessary pantry staples with exact amounts (salt, pepper, oil, etc.)
- Be specific about preparation (e.g., "1 medium yellow onion, diced" not just "onion")

CRITICAL REQUIREMENTS for instructions:
- Write DETAILED step-by-step instructions with specific temperatures, times, and techniques
- Include oven temperatures in Fahrenheit (e.g., "Preheat oven to 425°F")
- Specify pan sizes and types (e.g., "large cast-iron skillet", "9x13 inch baking dish")
- Include visual cues for doneness (e.g., "until golden brown and internal temperature reaches 165°F")
- Mention resting times, marinating times, and cooling periods
- Include specific cooking techniques (sauté, sear, braise, etc.)
- Add seasoning timing and tasting instructions
- Each instruction should be 15-30 words and very specific
- Include prep work details (chopping sizes, marinating times, etc.)

Additional requirements:
- Create an appetizing, restaurant-style recipe title
- Set realistic total cooking time including prep
- Use appropriate difficulty: Easy (30 min or less, basic techniques), Medium (30-60 min, some skill), Hard (60+ min, advanced techniques)
- Calculate precise nutritional information per serving based on actual ingredient quantities
- Include the provided ingredients as the star components
- Do NOT include numbers in the instructions array - just the detailed instruction text`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional chef with 15+ years of culinary experience and certified nutritional expertise. You specialize in creating detailed, restaurant-quality recipes with precise measurements and professional cooking techniques. Always respond with valid JSON only, no additional text or markdown formatting. Your recipes should be detailed enough for both home cooks and culinary students to follow successfully."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the response to ensure it's valid JSON
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const recipe = JSON.parse(cleanedContent) as GeneratedRecipe;
      
      // Validate the response structure
      if (!recipe.title || !recipe.difficulty || !recipe.time || !recipe.ingredients || !recipe.instructions || !recipe.nutrition) {
        throw new Error('Invalid recipe structure from OpenAI');
      }
      
      // Clean up instructions to remove any numbers that might still be included
      recipe.instructions = recipe.instructions.map(instruction => 
        instruction.replace(/^\d+\.\s*/, '').trim()
      );
      
      return recipe;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', cleanedContent);
      throw new Error('Failed to parse recipe from OpenAI response');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

export async function generateRecipeImage(recipeTitle: string): Promise<string | null> {
  if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
    return null;
  }

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `A professional, appetizing photo of ${recipeTitle}. Food photography style, well-lit, restaurant quality presentation.`,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    return response.data?.[0]?.url || null;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
} 