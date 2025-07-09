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

export async function generateRecipe(ingredients: string[]): Promise<GeneratedRecipe> {
  if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key not configured. Please add your API key to .env.local');
  }

  const ingredientsText = ingredients.join(', ');
  
  const prompt = `Create a delicious recipe using these ingredients: ${ingredientsText}.

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

Make sure to:
- Create a creative, appetizing recipe title
- Include reasonable quantities for ingredients
- Provide clear, step-by-step cooking instructions WITHOUT numbers (just the instruction text)
- Estimate realistic cooking time
- Use proper difficulty level based on complexity
- Include the provided ingredients plus any necessary additional ingredients
- Keep instructions concise but detailed enough to follow
- Calculate accurate nutritional information per serving (calories, protein in grams, carbs in grams, fat in grams)
- Base nutrition on realistic portion sizes
- Do NOT include numbers in the instructions array - just the instruction text`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional chef assistant with nutritional expertise. Always respond with valid JSON only, no additional text or markdown formatting. Include accurate nutritional information."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1200,
      temperature: 0.8,
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