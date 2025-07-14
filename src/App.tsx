import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, User, LogOut } from 'lucide-react';
import { generateRecipe as generateRecipeWithAI, type GeneratedRecipe } from './api/openai';
import { generateFoodImage } from './api/backend';
import Auth, { User as AuthUser } from './components/Auth';
import LoadingAnimation from './components/LoadingAnimation';
import { ServingsSlider } from './components/ServingsSlider';
import loadingAnimationData from './assets/loading-animation.json';

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface Recipe {
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
  image?: string;
}

const questions: Question[] = [
  {
    id: 'challenge',
    question: "What's the biggest challenge you face when trying to decide what to cook?",
    options: [
      "I never know what I'm in the mood for",
      "I don't have the right ingredients",
      "I get overwhelmed by too many options",
      "I'm not confident in the kitchen",
      "I usually just end up ordering food"
    ]
  },
  {
    id: 'ingredients',
    question: "Do you ever find yourself stuck with a few random ingredients and no idea how to use them?",
    options: [
      "Yes, all the time",
      "Occasionally",
      "Rarely",
      "No, I usually know what to make"
    ]
  },
  {
    id: 'confidence',
    question: "How confident are you in your cooking skills?",
    options: [
      "I'm a total beginner",
      "I can follow basic recipes",
      "I'm comfortable experimenting",
      "I'm experienced and love to cook"
    ]
  },
  {
    id: 'barriers',
    question: "What usually stops you from cooking at home more often?",
    options: [
      "Not enough time",
      "I don't know what to make",
      "Cooking feels too complicated",
      "Grocery shopping is a hassle",
      "I don't enjoy cooking"
    ]
  },
  {
    id: 'decision',
    question: "When you're hungry, how do you decide what to eat?",
    options: [
      "I check what ingredients I have",
      "I scroll social media or Google recipes",
      "I go with my usual go-to meal",
      "I order takeout or delivery",
      "I ask someone else what they want"
    ]
  },
  {
    id: 'recipe-search',
    question: "Have you tried searching for recipes based on ingredients you already have?",
    options: [
      "Yes, but the results weren't helpful",
      "Yes, and it worked okay",
      "No, I didn't know that was possible",
      "No, I usually just search by meal type or cuisine"
    ]
  }
];

// Helper functions for managing survey completion
const getSurveyCompletionKey = (userId: string) => `survey_completed_${userId}`;

const hasSurveyBeenCompleted = (userId: string): boolean => {
  return localStorage.getItem(getSurveyCompletionKey(userId)) === 'true';
};

const markSurveyAsCompleted = (userId: string, answers: Record<string, string>) => {
  localStorage.setItem(getSurveyCompletionKey(userId), 'true');
  localStorage.setItem(`survey_answers_${userId}`, JSON.stringify(answers));
};

const clearSurveyData = (userId: string) => {
  localStorage.removeItem(getSurveyCompletionKey(userId));
  localStorage.removeItem(`survey_answers_${userId}`);
};

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showRecipeGenerator, setShowRecipeGenerator] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [servings, setServings] = useState<number>(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState(3);
  const [surveyAlreadyCompleted, setSurveyAlreadyCompleted] = useState(false);

  // Calculate progress
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswerSelect = (option: string) => {
    setSelectedOption(option);
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestion].id]: option
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(answers[questions[currentQuestion + 1].id] || '');
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedOption(answers[questions[currentQuestion - 1].id] || '');
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setSelectedOption('');
    setIsCompleted(false);
    setShowPricing(false);
    setShowRecipeGenerator(false);
    setIngredients(['']);
    setServings(4);
    setIsGenerating(false);
    setGeneratedRecipe(null);
    setRemainingGenerations(3);
    setSurveyAlreadyCompleted(false);
  };

  const handleContinueToPricing = (user: AuthUser) => {
    // Mark survey as completed when user proceeds to pricing
    markSurveyAsCompleted(user.id, answers);
    setShowPricing(true);
  };

  const handleRetakeSurvey = (user: AuthUser) => {
    // Clear survey data to allow retaking
    clearSurveyData(user.id);
    setSurveyAlreadyCompleted(false);
    handleRestart();
  };

  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const generateRecipe = async () => {
    if (remainingGenerations <= 0) return;
    
    const validIngredients = ingredients.filter(ing => ing.trim() !== '');
    if (validIngredients.length === 0) return;

    setIsGenerating(true);
    
    // Debug: Check if API key is loaded
    console.log('API Key loaded:', !!import.meta.env.VITE_OPENAI_API_KEY);
    console.log('API Key starts with sk-:', import.meta.env.VITE_OPENAI_API_KEY?.startsWith('sk-'));
    
    try {
      // Generate recipe using OpenAI
      console.log('Calling OpenAI with ingredients:', validIngredients, 'for', servings, 'servings');
      const aiRecipe = await generateRecipeWithAI(validIngredients, servings);
      console.log('Received recipe from OpenAI:', aiRecipe);
      
      // Optional: Generate image for the recipe using Replicate via backend
      let recipeImage: string | undefined;
      try {
        recipeImage = await generateFoodImage(aiRecipe.title, validIngredients) || undefined;
      } catch (imageError) {
        console.error('Image generation failed:', imageError);
        // Continue without image if generation fails
      }
      
      const recipe: Recipe = {
        ...aiRecipe,
        image: recipeImage
      };
      
      setGeneratedRecipe(recipe);
      setRemainingGenerations(prev => prev - 1);
    } catch (error) {
      console.error('Recipe generation failed:', error);
      
      // Show user-friendly error message
      alert('Failed to generate recipe. Please check your API key configuration and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForNewRecipe = () => {
    setGeneratedRecipe(null);
    setIngredients(['']);
    setServings(4);
  };

  return (
    <Auth>
      {({ user, signIn, signOut }) => {
        // Check if user has already completed the survey when user state changes
        useEffect(() => {
          if (user) {
            setSurveyAlreadyCompleted(hasSurveyBeenCompleted(user.id));
          }
        }, [user]);

        // Welcome Screen - Show when no user is signed in
        if (!user) {
          return (
            <div className="min-h-screen bg-black text-white">
              {/* Header with Logo */}
              <div className="p-6">
                <div className="flex items-center">
                  <svg 
                    version="1.1" 
                    id="fi_45433" 
                    xmlns="http://www.w3.org/2000/svg" 
                    xmlnsXlink="http://www.w3.org/1999/xlink" 
                    x="0px" 
                    y="0px" 
                    width="40px" 
                    height="40px" 
                    viewBox="0 0 380.711 380.711" 
                    className="fill-white"
                  >
                    <g>
                      <path d="M380.711,57.465l-8.808-8.842l-89.742,95l-10.585-10.625l92.357-92.357l-7.75-7.715l-92.938,92.932l-8.772-8.778
                        l92.926-92.944l-8.539-8.528l-92.938,92.932l-10.411-10.41l95.936-89.987l-8.052-8.052l-88.418,68.853c0,0-3.207,2.713-4.311,3.828
                        c-12.13,12.124-17.347,28.594-15.615,44.424c-3.719,61.666-56.862,75.254-64.774,83.166
                        c-8.749,8.796-143.77,143.805-143.77,143.805l0.023,0.022c-0.104,0.117-0.221,0.141-0.337,0.256
                        c-8.272,8.273-8.25,21.704,0.012,29.965c8.249,8.272,21.715,8.272,29.953,0.023c0.116-0.128,0.174-0.244,0.255-0.337l0.023,0.022
                        c0,0,133.359-133.312,143.537-143.502c9.179-9.213,30.812-64.303,87.257-64.878c0.058-0.023,0.209-0.046,0.29-0.046
                        c13.28,0.372,26.677-4.032,37.354-13.361c0.755-0.663,2.486-2.452,2.486-2.452L380.711,57.465z"></path>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Welcome Content */}
              <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
                <div className="text-center max-w-2xl mx-auto px-6">
                  <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                      Welcome to Our Cooking Survey
                    </h1>
                    <p className="text-xl text-gray-300 mb-8">
                      Help us understand your cooking journey by sharing your experiences. 
                      This survey takes just a few minutes and helps us create better cooking solutions.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={signIn}
                      className="w-full bg-white text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      Sign In to Start Survey
                    </button>
                    
                    <p className="text-sm text-gray-400">
                      Sign in required to prevent duplicate responses and save your progress
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Survey Already Completed Screen
        if (surveyAlreadyCompleted && !showPricing && !showRecipeGenerator) {
          return (
            <div className="min-h-screen bg-black text-white">
              {/* Header with Logo and Auth */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg 
                      version="1.1" 
                      id="fi_45433" 
                      xmlns="http://www.w3.org/2000/svg" 
                      xmlnsXlink="http://www.w3.org/1999/xlink" 
                      x="0px" 
                      y="0px" 
                      width="40px" 
                      height="40px" 
                      viewBox="0 0 380.711 380.711" 
                      className="fill-white"
                    >
                      <g>
                        <path d="M380.711,57.465l-8.808-8.842l-89.742,95l-10.585-10.625l92.357-92.357l-7.75-7.715l-92.938,92.932l-8.772-8.778
                          l92.926-92.944l-8.539-8.528l-92.938,92.932l-10.411-10.41l95.936-89.987l-8.052-8.052l-88.418,68.853c0,0-3.207,2.713-4.311,3.828
                          c-12.13,12.124-17.347,28.594-15.615,44.424c-3.719,61.666-56.862,75.254-64.774,83.166
                          c-8.749,8.796-143.77,143.805-143.77,143.805l0.023,0.022c-0.104,0.117-0.221,0.141-0.337,0.256
                          c-8.272,8.273-8.25,21.704,0.012,29.965c8.249,8.272,21.715,8.272,29.953,0.023c0.116-0.128,0.174-0.244,0.255-0.337l0.023,0.022
                          c0,0,133.359-133.312,143.537-143.502c9.179-9.213,30.812-64.303,87.257-64.878c0.058-0.023,0.209-0.046,0.29-0.046
                          c13.28,0.372,26.677-4.032,37.354-13.361c0.755-0.663,2.486-2.452,2.486-2.452L380.711,57.465z"></path>
                      </g>
                    </svg>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <button 
                      onClick={signOut}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Already Completed Content */}
              <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
                <div className="text-center max-w-2xl mx-auto px-6">
                  <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                      Survey Already Completed
                    </h1>
                    <p className="text-xl text-gray-300 mb-8">
                      Thank you! You've already completed this survey. You can proceed to explore our recipe generator or retake the survey if you'd like to update your responses.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setShowPricing(true)}
                      className="w-full bg-white text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      Continue to Recipe Generator
                    </button>

                    <button
                      onClick={() => handleRetakeSurvey(user)}
                      className="w-full bg-gray-800 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-700 transition-colors"
                    >
                      Retake Survey
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Handle Try Now button - require authentication (already authenticated at this point)
        const handleTryNow = () => {
          setShowRecipeGenerator(true);
          setShowPricing(false);
        };

        // Pricing Page with Authentication Protection
        if (showPricing) {
          return (
            <div className="min-h-screen bg-black text-white">
              {/* Header with Logo and Auth */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg 
                      version="1.1" 
                      id="fi_45433" 
                      xmlns="http://www.w3.org/2000/svg" 
                      xmlnsXlink="http://www.w3.org/1999/xlink" 
                      x="0px" 
                      y="0px" 
                      width="40px" 
                      height="40px" 
                      viewBox="0 0 380.711 380.711" 
                      className="fill-white"
                    >
                      <g>
                        <path d="M380.711,57.465l-8.808-8.842l-89.742,95l-10.585-10.625l92.357-92.357l-7.75-7.715l-92.938,92.932l-8.772-8.778
                          l92.926-92.944l-8.539-8.528l-92.938,92.932l-10.411-10.41l95.936-89.987l-8.052-8.052l-88.418,68.853c0,0-3.207,2.713-4.311,3.828
                          c-12.13,12.124-17.347,28.594-15.615,44.424c-3.719,61.666-56.862,75.254-64.774,83.166
                          c-8.749,8.796-143.77,143.805-143.77,143.805l0.023,0.022c-0.104,0.117-0.221,0.141-0.337,0.256
                          c-8.272,8.273-8.25,21.704,0.012,29.965c8.249,8.272,21.715,8.272,29.953,0.023c0.116-0.128,0.174-0.244,0.255-0.337l0.023,0.022
                          c0,0,133.359-133.312,143.537-143.502c9.179-9.213,30.812-64.303,87.257-64.878c0.058-0.023,0.209-0.046,0.29-0.046
                          c13.28,0.372,26.677-4.032,37.354-13.361c0.755-0.663,2.486-2.452,2.486-2.452L380.711,57.465z"></path>
                      </g>
                    </svg>
                  </div>
                  
                  {/* Auth Section */}
                  <div className="flex items-center space-x-4">
                    {user ? (
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <User className="w-5 h-5" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                        <button
                          onClick={signOut}
                          className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={signIn}
                        className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>Sign In</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Content */}
              <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
                <div className="text-center max-w-4xl mx-auto px-6">
                  {/* Starter Tier Card */}
                  <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 mb-8 max-w-lg mx-auto">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold mb-2">Try ForkedAI</h2>
                      <p className="text-4xl font-bold">$0.99</p>
                      <p className="text-gray-400 mt-2">Affordable access to AI-powered recipe generation</p>
                    </div>
                    
                    <div className="space-y-3 mb-8 text-left">
                      <div className="flex items-center text-green-400">
                        <span className="mr-3">✓</span>
                        <span>3 free recipe generations</span>
                      </div>
                      <div className="flex items-center text-green-400">
                        <span className="mr-3">✓</span>
                        <span>AI-powered ingredient matching</span>
                      </div>
                      <div className="flex items-center text-green-400">
                        <span className="mr-3">✓</span>
                        <span>Beautiful food photography</span>
                      </div>
                      <div className="flex items-center text-green-400">
                        <span className="mr-3">✓</span>
                        <span>Detailed cooking instructions</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleTryNow}
                      className="w-full bg-white text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      {user ? 'Try Now →' : 'Sign In to Try →'}
                    </button>
                  </div>

                  <button
                    onClick={handleRestart}
                    className="text-gray-400 hover:text-white transition-colors underline"
                  >
                    Back to Survey
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // Recipe Generator (Protected by Authentication)
        if (showRecipeGenerator) {
          if (!user) {
            // Redirect to sign in if somehow accessed without authentication
            setShowRecipeGenerator(false);
            setShowPricing(true);
            return null;
          }

          if (generatedRecipe) {
            return (
              <div className="min-h-screen bg-black text-white">
                {/* Header with Logo and Auth */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg 
                        version="1.1" 
                        id="fi_45433" 
                        xmlns="http://www.w3.org/2000/svg" 
                        xmlnsXlink="http://www.w3.org/1999/xlink" 
                        x="0px" 
                        y="0px" 
                        width="40px" 
                        height="40px" 
                        viewBox="0 0 380.711 380.711" 
                        className="fill-white"
                      >
                        <g>
                          <path d="M380.711,57.465l-8.808-8.842l-89.742,95l-10.585-10.625l92.357-92.357l-7.75-7.715l-92.938,92.932l-8.772-8.778
                            l92.926-92.944l-8.539-8.528l-92.938,92.932l-10.411-10.41l95.936-89.987l-8.052-8.052l-88.418,68.853c0,0-3.207,2.713-4.311,3.828
                            c-12.13,12.124-17.347,28.594-15.615,44.424c-3.719,61.666-56.862,75.254-64.774,83.166
                            c-8.749,8.796-143.77,143.805-143.77,143.805l0.023,0.022c-0.104,0.117-0.221,0.141-0.337,0.256
                            c-8.272,8.273-8.25,21.704,0.012,29.965c8.249,8.272,21.715,8.272,29.953,0.023c0.116-0.128,0.174-0.244,0.255-0.337l0.023,0.022
                            c0,0,133.359-133.312,143.537-143.502c9.179-9.213,30.812-64.303,87.257-64.878c0.058-0.023,0.209-0.046,0.29-0.046
                            c13.28,0.372,26.677-4.032,37.354-13.361c0.755-0.663,2.486-2.452,2.486-2.452L380.711,57.465z"></path>
                        </g>
                      </svg>
                    </div>
                    
                    {/* Auth Section */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <User className="w-5 h-5" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                        <button
                          onClick={signOut}
                          className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipe Display */}
                <div className="max-w-4xl mx-auto px-6 pb-12">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center bg-green-900 text-green-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                      Recipe Generated
                    </div>
                    <div className="text-sm text-gray-400">
                      {remainingGenerations} generations remaining
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    {/* Recipe Image */}
                    {generatedRecipe.image && (
                      <div className="w-full h-64 md:h-80 overflow-hidden">
                        <img 
                          src={generatedRecipe.image} 
                          alt={generatedRecipe.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="p-8">
                      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">{generatedRecipe.title}</h1>
                      
                      {/* Macros Section */}
                      <div className="bg-gray-800 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-bold mb-4 text-center">MACROS</h2>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{generatedRecipe.nutrition.protein}g</div>
                            <div className="text-gray-400 text-sm">Protein</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{generatedRecipe.nutrition.carbs}g</div>
                            <div className="text-gray-400 text-sm">Carbs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{generatedRecipe.nutrition.fat}g</div>
                            <div className="text-gray-400 text-sm">Fat</div>
                          </div>
                        </div>
                        <div className="text-center pt-4 border-t border-gray-700">
                          <div className="text-3xl font-bold">{generatedRecipe.nutrition.calories}</div>
                          <div className="text-gray-400">Calories per serving</div>
                        </div>
                      </div>
                      
                      {/* Difficulty and Time */}
                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="text-center">
                          <div className="text-gray-400 mb-2">DIFFICULTY</div>
                          <div className="text-xl font-medium">{generatedRecipe.difficulty}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 mb-2">TIME</div>
                          <div className="text-xl font-medium">{generatedRecipe.time}</div>
                        </div>
                      </div>

                      <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">INGREDIENTS</h2>
                        <ul className="space-y-2">
                          {generatedRecipe.ingredients.map((ingredient, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-gray-400 mr-3">•</span>
                              <span>{ingredient}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">INSTRUCTIONS</h2>
                        <ol className="space-y-4">
                          {generatedRecipe.instructions.map((instruction, index) => (
                            <li key={index} className="flex items-start">
                              <span className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-4 mt-1 flex-shrink-0">
                                {index + 1}
                              </span>
                              <span className="leading-relaxed">{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={resetForNewRecipe}
                          disabled={remainingGenerations <= 0}
                          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                            remainingGenerations <= 0
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-white text-black hover:bg-gray-200'
                          }`}
                        >
                          {remainingGenerations <= 0 ? 'No generations left' : 'Generate Another Recipe'}
                        </button>
                        
                        <button
                          onClick={handleRestart}
                          className="text-gray-400 hover:text-white transition-colors underline"
                        >
                          Back to Survey
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="min-h-screen bg-black text-white">
                             {/* Header with Logo and Auth */}
               <div className="p-6">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center">
                     <svg 
                       version="1.1" 
                       id="fi_45433" 
                       xmlns="http://www.w3.org/2000/svg" 
                       xmlnsXlink="http://www.w3.org/1999/xlink" 
                       x="0px" 
                       y="0px" 
                       width="40px" 
                       height="40px" 
                       viewBox="0 0 380.711 380.711" 
                       className="fill-white"
                     >
                       <g>
                         <path d="M380.711,57.465l-8.808-8.842l-89.742,95l-10.585-10.625l92.357-92.357l-7.75-7.715l-92.938,92.932l-8.772-8.778
                           l92.926-92.944l-8.539-8.528l-92.938,92.932l-10.411-10.41l95.936-89.987l-8.052-8.052l-88.418,68.853c0,0-3.207,2.713-4.311,3.828
                           c-12.13,12.124-17.347,28.594-15.615,44.424c-3.719,61.666-56.862,75.254-64.774,83.166
                           c-8.749,8.796-143.77,143.805-143.77,143.805l0.023,0.022c-0.104,0.117-0.221,0.141-0.337,0.256
                           c-8.272,8.273-8.25,21.704,0.012,29.965c8.249,8.272,21.715,8.272,29.953,0.023c0.116-0.128,0.174-0.244,0.255-0.337l0.023,0.022
                           c0,0,133.359-133.312,143.537-143.502c9.179-9.213,30.812-64.303,87.257-64.878c0.058-0.023,0.209-0.046,0.29-0.046
                           c13.28,0.372,26.677-4.032,37.354-13.361c0.755-0.663,2.486-2.452,2.486-2.452L380.711,57.465z"></path>
                       </g>
                     </svg>
                   </div>
                   
                   {/* Auth Section */}
                   <div className="flex items-center space-x-4">
                     <div className="flex items-center space-x-3">
                       <div className="flex items-center space-x-2">
                         <User className="w-5 h-5" />
                         <span className="text-sm">{user.email}</span>
                       </div>
                       <button
                         onClick={signOut}
                         className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                       >
                         <LogOut className="w-4 h-4" />
                         <span className="text-sm">Sign Out</span>
                       </button>
                     </div>
                   </div>
                 </div>
               </div>

              {/* Recipe Generator Content */}
              <div className="max-w-4xl mx-auto px-6 pb-12">
                <div className="text-center mb-8">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Recipes Made For You
                  </h1>
                  <p className="text-xl text-gray-300 mb-4">
                    Enter the ingredients you have and we'll create a delicious recipe for you
                  </p>
                  <div className="text-sm text-gray-400">
                    {remainingGenerations} generations remaining
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-8">
                  <h2 className="text-2xl font-bold mb-6">Your Ingredients</h2>
                  
                  <div className="space-y-4 mb-8">
                    {ingredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={ingredient}
                          onChange={(e) => updateIngredient(index, e.target.value)}
                          placeholder="Enter an ingredient..."
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-white focus:outline-none"
                        />
                        <button
                          onClick={() => removeIngredient(index)}
                          disabled={ingredients.length === 1}
                          className={`p-3 rounded-lg transition-colors ${
                            ingredients.length === 1
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Ingredient Button */}
                  <div className="mb-8">
                    <button
                      onClick={addIngredient}
                      className="flex items-center justify-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Ingredient
                    </button>
                  </div>

                  {/* Servings Slider */}
                  <div className="mb-8">
                    <ServingsSlider
                      servings={servings}
                      onChange={setServings}
                      min={1}
                      max={8}
                    />
                  </div>

                  {/* Generate Recipe Button */}
                  <div className="mb-8">
                    <button
                      onClick={generateRecipe}
                      disabled={isGenerating || remainingGenerations <= 0 || ingredients.filter(ing => ing.trim() !== '').length === 0}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                        isGenerating || remainingGenerations <= 0 || ingredients.filter(ing => ing.trim() !== '').length === 0
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-gray-200'
                      }`}
                    >
                      {isGenerating ? 'Generating Recipe...' : 'Generate Recipe'}
                    </button>
                  </div>

                  <button
                    onClick={handleRestart}
                    className="text-gray-400 hover:text-white transition-colors underline"
                  >
                    Back to Survey
                  </button>
                </div>
              </div>
              
              {/* Loading Animation for Recipe Generator */}
              {isGenerating && (
                <LoadingAnimation 
                  animationData={loadingAnimationData}
                  message="Generating your perfect recipe..."
                  showConfetti={true}
                />
              )}
            </div>
          );
        }

        // Completion Screen
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header with Logo */}
        <div className="p-6">
          <div className="flex items-center">
            <svg 
              version="1.1" 
              id="fi_45433" 
              xmlns="http://www.w3.org/2000/svg" 
              xmlnsXlink="http://www.w3.org/1999/xlink" 
              x="0px" 
              y="0px" 
              width="40px" 
              height="40px" 
              viewBox="0 0 380.711 380.711" 
              className="fill-white"
            >
              <g>
                <path d="M380.711,57.465l-8.808-8.842l-89.742,95l-10.585-10.625l92.357-92.357l-7.75-7.715l-92.938,92.932l-8.772-8.778
                  l92.926-92.944l-8.539-8.528l-92.938,92.932l-10.411-10.41l95.936-89.987l-8.052-8.052l-88.418,68.853c0,0-3.207,2.713-4.311,3.828
                  c-12.13,12.124-17.347,28.594-15.615,44.424c-3.719,61.666-56.862,75.254-64.774,83.166
                  c-8.749,8.796-143.77,143.805-143.77,143.805l0.023,0.022c-0.104,0.117-0.221,0.141-0.337,0.256
                  c-8.272,8.273-8.25,21.704,0.012,29.965c8.249,8.272,21.715,8.272,29.953,0.023c0.116-0.128,0.174-0.244,0.255-0.337l0.023,0.022
                  c0,0,133.359-133.312,143.537-143.502c9.179-9.213,30.812-64.303,87.257-64.878c0.058-0.023,0.209-0.046,0.29-0.046
                  c13.28,0.372,26.677-4.032,37.354-13.361c0.755-0.663,2.486-2.452,2.486-2.452L380.711,57.465z"></path>
              </g>
            </svg>
          </div>
        </div>

        {/* Completion Screen */}
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="text-center max-w-2xl mx-auto px-6">
                  <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Thank You!
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Your responses have been recorded. We appreciate you taking the time to share your cooking experiences with us.
              </p>
            </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => handleContinueToPricing(user)}
                      className="w-full bg-white text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      Continue →
                    </button>

            <button
              onClick={handleRestart}
                      className="text-gray-400 hover:text-white transition-colors underline"
            >
              Take Survey Again
            </button>
                  </div>
          </div>
        </div>
      </div>
    );
  }

        // Main Survey
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header with Logo */}
      <div className="p-6">
        <div className="flex items-center">
          <svg 
            version="1.1" 
            id="fi_45433" 
            xmlns="http://www.w3.org/2000/svg" 
            xmlnsXlink="http://www.w3.org/1999/xlink" 
            x="0px" 
            y="0px" 
            width="40px" 
            height="40px" 
            viewBox="0 0 380.711 380.711" 
            className="fill-white"
          >
            <g>
              <path d="M380.711,57.465l-8.808-8.842l-89.742,95l-10.585-10.625l92.357-92.357l-7.75-7.715l-92.938,92.932l-8.772-8.778
                l92.926-92.944l-8.539-8.528l-92.938,92.932l-10.411-10.41l95.936-89.987l-8.052-8.052l-88.418,68.853c0,0-3.207,2.713-4.311,3.828
                c-12.13,12.124-17.347,28.594-15.615,44.424c-3.719,61.666-56.862,75.254-64.774,83.166
                c-8.749,8.796-143.77,143.805-143.77,143.805l0.023,0.022c-0.104,0.117-0.221,0.141-0.337,0.256
                c-8.272,8.273-8.25,21.704,0.012,29.965c8.249,8.272,21.715,8.272,29.953,0.023c0.116-0.128,0.174-0.244,0.255-0.337l0.023,0.022
                c0,0,133.359-133.312,143.537-143.502c9.179-9.213,30.812-64.303,87.257-64.878c0.058-0.023,0.209-0.046,0.29-0.046
                c13.28,0.372,26.677-4.032,37.354-13.361c0.755-0.663,2.486-2.452,2.486-2.452L380.711,57.465z"></path>
            </g>
          </svg>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm text-gray-400">
              {currentQuestion + 1} of {questions.length}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Survey Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {questions[currentQuestion].question}
            </h1>
            <p className="text-gray-400 text-lg">
              Select the option that best describes your experience
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-4 mb-12">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left hover:border-gray-600 ${
                  selectedOption === option
                    ? 'border-white bg-white text-black'
                    : 'border-gray-700 bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">{option}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedOption === option
                      ? 'border-black bg-black'
                      : 'border-gray-400'
                  }`}>
                    {selectedOption === option && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                currentQuestion === 0
                  ? 'bg-black text-gray-600 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={!selectedOption}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                !selectedOption
                  ? 'bg-black text-gray-600 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              {currentQuestion === questions.length - 1 ? 'Complete' : 'Next'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Loading Animation */}
      {isGenerating && (
        <LoadingAnimation 
          animationData={loadingAnimationData}
          message="Generating your perfect recipe..."
          showConfetti={true}
        />
      )}
    </div>
        );
      }}
    </Auth>
  );
}

export default App;