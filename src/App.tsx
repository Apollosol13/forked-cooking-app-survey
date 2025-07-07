import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { generateRecipe as generateRecipeWithAI, type GeneratedRecipe } from './api/openai';
import { generateFoodImage } from './api/backend';

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface Recipe extends GeneratedRecipe {
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

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showRecipeGenerator, setShowRecipeGenerator] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState(3);

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
    setIsGenerating(false);
    setGeneratedRecipe(null);
    setRemainingGenerations(3);
  };

  const handleContinueToPricing = () => {
    setShowPricing(true);
  };

  const handleTryNow = () => {
    // Simulate payment completion
    setShowRecipeGenerator(true);
    setShowPricing(false);
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
      console.log('Calling OpenAI with ingredients:', validIngredients);
      const aiRecipe = await generateRecipeWithAI(validIngredients);
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
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Recipe Generator Page
  if (showRecipeGenerator) {
    if (generatedRecipe) {
      return (
        <div className="min-h-screen bg-black text-white">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <button
                onClick={resetForNewRecipe}
                className="flex items-center text-gray-300 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <div className="text-center">
                <div className="text-lg font-semibold">Recipe Generated</div>
                <div className="text-sm text-gray-400">
                  {remainingGenerations} generations remaining
                </div>
              </div>
              <div className="w-16"></div>
            </div>
          </div>

                     {/* Recipe Display */}
           <div className="max-w-4xl mx-auto p-6">
             <div className="bg-gray-900 rounded-3xl p-8 mb-6">
               {generatedRecipe.image && (
                 <div className="mb-6">
                   <img 
                     src={generatedRecipe.image} 
                     alt={generatedRecipe.title}
                     className="w-full h-64 object-cover rounded-xl"
                   />
                 </div>
               )}
               <h1 className="text-3xl font-bold mb-6 text-center">{generatedRecipe.title}</h1>
              
              <div className="flex justify-between items-center mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-300">DIFFICULTY</div>
                  <div className="text-xl">{generatedRecipe.difficulty}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-300">TIME</div>
                  <div className="text-xl">{generatedRecipe.time}</div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">INGREDIENTS</h2>
                <ul className="space-y-2">
                  {generatedRecipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-white mr-2">•</span>
                      <span className="text-lg">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">INSTRUCTIONS</h2>
                <ol className="space-y-4 list-decimal list-inside">
                  {generatedRecipe.instructions.map((instruction, index) => (
                    <li key={index} className="text-lg">
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>

              {remainingGenerations > 0 && (
                <button
                  onClick={resetForNewRecipe}
                  className="w-full bg-white text-black text-lg font-bold py-4 px-6 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Generate Another Recipe ({remainingGenerations} left)
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (isGenerating) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
            <h2 className="text-2xl font-bold mb-4">Generating...</h2>
            <p className="text-gray-400">Creating your perfect recipe</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowRecipeGenerator(false)}
              className="flex items-center text-gray-300 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="text-center">
              <div className="text-lg font-semibold">Recipe Generator</div>
              <div className="text-sm text-gray-400">
                {remainingGenerations} generations remaining
              </div>
            </div>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Ingredient Input */}
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Enter Ingredients</h1>
            <p className="text-gray-400">Add the ingredients you have available</p>
          </div>

          <div className="space-y-4 mb-8">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={ingredient}
                  onChange={(e) => updateIngredient(index, e.target.value)}
                  placeholder={`Ingredient ${index + 1}`}
                  className="flex-1 bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-white focus:outline-none"
                />
                <button
                  onClick={() => removeIngredient(index)}
                  className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-600 transition-colors"
                  disabled={ingredients.length === 1}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
            
            <button
              onClick={addIngredient}
              className="w-full border-2 border-dashed border-gray-700 rounded-xl py-4 flex items-center justify-center hover:border-gray-500 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Ingredient
            </button>
          </div>

          <button
            onClick={generateRecipe}
            disabled={ingredients.filter(ing => ing.trim() !== '').length === 0 || remainingGenerations <= 0}
            className="w-full bg-white text-black text-lg font-bold py-4 px-6 rounded-xl hover:bg-gray-200 transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {remainingGenerations <= 0 ? 'No Generations Left' : 'Generate Recipe'}
          </button>
        </div>
      </div>
    );
  }

  // NEW: Pricing page
  if (showPricing) {
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

        {/* Pricing Screen */}
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="text-center max-w-7xl mx-auto px-6">
                         <div className="mb-12">
               <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-8 leading-tight">
                 Let's Get Forked!
               </h1>
               <p className="text-xl text-gray-300 mb-8">
                 Based on your responses, you're perfect for our personalized cooking assistant. 
                 Get 3 custom recipe generations tailored to your ingredients and preferences.
               </p>
             </div>

            <div className="bg-gray-900 rounded-3xl p-12 border border-gray-800 mb-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-4">Get Started Today</h2>
                <p className="text-gray-400">
                  Join thousands of home cooks who've transformed their kitchen experience
                </p>
              </div>

                             <div className="mb-8">
                 <div className="text-6xl font-bold mb-2">$0.99</div>
                 <div className="text-gray-400">3 generations</div>
               </div>

                             <button
                 onClick={handleTryNow}
                 className="bg-white text-black text-lg font-bold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors mb-8"
               >
                 Try Me
               </button>

                             <div className="bg-black/30 rounded-xl p-6 space-y-4">
                 <div className="text-white text-lg font-medium">
                   3 custom recipe generations
                 </div>
                 <div className="text-white text-lg font-medium">
                   Based on your available ingredients
                 </div>
                 <div className="text-white text-lg font-medium">
                   Tailored to your cooking preferences
                 </div>
                 <div className="text-white text-lg font-medium">
                   Instant recipe suggestions
                 </div>
               </div>
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
                onClick={handleContinueToPricing}
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
    </div>
  );
}

export default App;