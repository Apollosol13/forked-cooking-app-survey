// Backend API service for Replicate image generation
const BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

interface ImageResponse {
  imageUrl: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export async function generateFoodImage(recipeTitle: string, ingredients: string[]): Promise<string | null> {
  try {
    console.log('Calling backend for image generation:', recipeTitle, ingredients);

    const response = await fetch(`${BACKEND_URL}/api/generate-food-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipeTitle,
        ingredients,
      }),
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      console.error('Backend image generation failed:', errorData);
      return null;
    }

    const data: ImageResponse = await response.json();
    console.log('Backend image generation successful:', data.imageUrl);
    return data.imageUrl;

  } catch (error) {
    console.error('Error calling backend for image generation:', error);
    return null;
  }
}

export async function generateFoodImageAlternative(recipeTitle: string, ingredients: string[]): Promise<string | null> {
  try {
    console.log('Calling backend for alternative image generation:', recipeTitle, ingredients);

    const response = await fetch(`${BACKEND_URL}/api/generate-food-image-alt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipeTitle,
        ingredients,
      }),
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      console.error('Backend alternative image generation failed:', errorData);
      return null;
    }

    const data: ImageResponse = await response.json();
    console.log('Backend alternative image generation successful:', data.imageUrl);
    return data.imageUrl;

  } catch (error) {
    console.error('Error calling backend for alternative image generation:', error);
    return null;
  }
}

// Health check function to verify backend is running
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
} 