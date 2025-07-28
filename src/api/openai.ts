// Secure API - No direct OpenAI calls from frontend

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

export async function generateRecipe(ingredients: string[], servings: number = 4, userId: string): Promise<GeneratedRecipe> {
  // Validate inputs
  if (!ingredients || ingredients.length === 0) {
    throw new Error('Ingredients are required');
  }
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Clean ingredients
  const cleanIngredients = ingredients
    .map(ing => ing.trim())
    .filter(ing => ing.length > 0);

  if (cleanIngredients.length === 0) {
    throw new Error('Please provide valid ingredients');
  }

  try {
    console.log('🔄 Calling secure backend function for recipe generation...');
    
    // Call secure backend function
    const response = await fetch('/.netlify/functions/generate-recipe-secure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ingredients: cleanIngredients,
        servings: Math.max(1, Math.min(20, servings)), // Validate servings 1-20
        userId: userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      }
      
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const recipe = await response.json();
    
    // Validate response structure
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe received from server');
    }

    console.log('✅ Recipe generated successfully via secure backend');
    return recipe;

  } catch (error) {
    console.error('Recipe generation error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to generate recipe. Please try again.');
  }
}

// Legacy function for backward compatibility (now secure)
export async function generateRecipeWithAI(ingredients: string[], servings: number = 4): Promise<GeneratedRecipe> {
  // We need a user ID for the secure function
  // This will be passed from the component that has access to user context
  throw new Error('This function requires user authentication. Please use generateRecipe with userId.');
}
