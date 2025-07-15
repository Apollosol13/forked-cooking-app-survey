import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Google Gemini AI ingredient extraction
async function extractIngredientsFromText(transcript: string): Promise<string[]> {
  console.log('🔥 Starting Gemini extraction for transcript:', transcript);
  console.log('📏 Transcript length:', transcript.length);
  console.log('📊 Transcript type:', typeof transcript);
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  console.log('🔑 API Key check:');
  console.log('  - API key exists:', !!apiKey);
  console.log('  - API key length:', apiKey?.length || 0);
  
  if (!apiKey) {
    console.error('❌ Gemini API key not found');
    throw new Error('Gemini API key not found');
  }

  try {
    console.log('🚀 Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('✅ Gemini model initialized successfully');

    const prompt = `You are an expert ingredient extraction AI. Your job is to identify ALL food ingredients mentioned in the following transcript.

CRITICAL RULES:
1. Extract ingredients EXACTLY as spoken - DO NOT modify, shorten, or split multi-word ingredients
2. "jasmine rice" should stay "jasmine rice" - NEVER split into "jasmine" and "rice"
3. "turmeric" should be extracted as "turmeric"
4. "bell pepper" should stay "bell pepper" - NEVER split into "bell" and "pepper"
5. Include ALL ingredients, even if they seem uncommon
6. Return ONLY a JSON array of ingredient strings
7. DO NOT include any explanations, just the JSON array

Examples:
- Input: "I have jasmine rice, turmeric, and bell pepper"
- Output: ["jasmine rice", "turmeric", "bell pepper"]

- Input: "salmon, brown rice, and some fresh ginger"  
- Output: ["salmon", "brown rice", "ginger"]

Now extract ingredients from this transcript:
"${transcript}"

Return only the JSON array:`;

    console.log('📝 Prompt length:', prompt.length);
    console.log('🚀 Calling Gemini API with prompt...');
    
    const result = await model.generateContent(prompt);
    console.log('📥 Gemini API call completed');
    
    const response = await result.response;
    console.log('📥 Response received from Gemini');
    
    const text = response.text();
    console.log('📊 Response text extracted, length:', text.length);
    
    // COMPREHENSIVE DEBUG LOGGING
    console.log('📥 Raw Gemini response (START)');
    console.log('📋 Raw text:', text);
    console.log('📥 Raw Gemini response (END)');
    
    // Check for common format issues
    console.log('🔍 Format analysis:');
    console.log('  - Starts with [:', text.trim().startsWith('['));
    console.log('  - Ends with ]:', text.trim().endsWith(']'));
    console.log('  - Contains "json":', text.toLowerCase().includes('json'));
    console.log('  - Contains code blocks:', text.includes('```'));
    console.log('  - Has quotes:', text.includes('"'));
    console.log('  - Has single quotes:', text.includes("'"));
    
    // Try to parse as JSON
    console.log('🔄 Attempting direct JSON parse...');
    try {
      const ingredients = JSON.parse(text.trim());
      if (Array.isArray(ingredients)) {
        console.log('✅ Successfully parsed Gemini ingredients:', ingredients);
        console.log('🎯 Ingredient count:', ingredients.length);
        console.log('🔍 Each ingredient:');
        ingredients.forEach((ing: string, i: number) => {
          console.log(`  ${i + 1}. "${ing}" (type: ${typeof ing}, length: ${ing.length})`);
        });
        return ingredients;
      } else {
        console.log('❌ Parsed result is not an array:', typeof ingredients, ingredients);
      }
    } catch (parseError) {
      console.log('❌ Direct JSON parse failed:', parseError);
      console.log('⚠️ Gemini response not valid JSON, trying to extract array...');
    }
    
    // Fallback: extract array from text (maybe it's wrapped in markdown)
    console.log('🔄 Attempting array extraction from text...');
    const arrayMatch = text.match(/\[(.*?)\]/s); // 's' flag for multiline
    if (arrayMatch) {
      console.log('🎯 Found array pattern:', arrayMatch[0]);
      console.log('🔍 Array content:', arrayMatch[1]);
      try {
        const ingredients = JSON.parse(arrayMatch[0]);
        console.log('✅ Extracted ingredients from Gemini text:', ingredients);
        console.log('🎯 Ingredient count:', ingredients.length);
        ingredients.forEach((ing: string, i: number) => {
          console.log(`  ${i + 1}. "${ing}" (type: ${typeof ing}, length: ${ing.length})`);
        });
        return ingredients;
      } catch (arrayParseError) {
        console.log('❌ Array extraction parse failed:', arrayParseError);
      }
    } else {
      console.log('❌ No array pattern found in response');
    }
    
    // Final fallback: simple comma splitting
    console.log('⚠️ Using final fallback: comma splitting');
    const fallbackIngredients = text.split(',').map(s => s.trim().replace(/["\[\]]/g, '')).filter(s => s.length > 0);
    console.log('🎯 Fallback ingredients:', fallbackIngredients);
    return fallbackIngredients;
    
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    throw error;
  }
}

// Fallback simple extraction in case Gemini fails
function extractIngredientsSimple(transcript: string): string[] {
  const text = transcript.toLowerCase().trim();
  
  // Common ingredients - keep multi-word ones first so they match before single words
  const knownIngredients = [
    'jasmine rice', 'brown rice', 'wild rice', 'basmati rice', 'white rice',
    'bell pepper', 'red pepper', 'green pepper', 'yellow pepper',
    'olive oil', 'coconut oil', 'sesame oil', 'vegetable oil',
    'soy sauce', 'fish sauce', 'hot sauce', 'worcestershire sauce',
    'sea salt', 'kosher salt', 'table salt',
    'black pepper', 'white pepper', 'red pepper flakes',
    'green onion', 'red onion', 'yellow onion', 'white onion',
    'sweet potato', 'russet potato',
    'salmon', 'chicken', 'beef', 'pork', 'turkey', 'fish', 'shrimp', 'tuna',
    'rice', 'pasta', 'noodles', 'bread', 'flour',
    'tomato', 'onion', 'garlic', 'ginger', 'carrot', 'celery', 'potato',
    'pepper', 'peppers', 'mushroom', 'mushrooms', 'broccoli', 'spinach',
    'turmeric', 'cumin', 'paprika', 'oregano', 'thyme', 'rosemary',
    'basil', 'cilantro', 'parsley', 'dill', 'sage', 'cinnamon',
    'cheese', 'butter', 'milk', 'cream', 'yogurt', 'egg', 'eggs',
    'lemon', 'lime', 'avocado', 'apple', 'banana', 'orange'
  ];
  
  const found: string[] = [];
  
  // Check for each known ingredient
  for (const ingredient of knownIngredients) {
    if (text.includes(ingredient) && !found.includes(ingredient)) {
      found.push(ingredient);
    }
  }
  
  return found;
}

interface SpeechToTextProps {
  onTranscript: (transcript: string) => void;
  onIngredientsDetected: (ingredients: string[]) => void;
  className?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const SpeechToText: React.FC<SpeechToTextProps> = ({ 
  onTranscript, 
  onIngredientsDetected, 
  className = "" 
}) => {
  console.log('🎯 SpeechToText component is loading!');
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // DEBUG: Check API key immediately
  useEffect(() => {
    console.log('🔑 API Key Debug:');
    console.log('  - Gemini API key exists:', !!import.meta.env.VITE_GEMINI_API_KEY);
    console.log('  - Gemini API key length:', import.meta.env.VITE_GEMINI_API_KEY?.length || 0);
    console.log('  - Gemini API key prefix:', import.meta.env.VITE_GEMINI_API_KEY?.substring(0, 10) || 'undefined');
    console.log('  - All env vars:', Object.keys(import.meta.env));
  }, []);

  useEffect(() => {
    // Check if speech recognition is supported
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = true; // Keep continuous but handle silence detection manually
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let silenceTimer: NodeJS.Timeout | null = null;
      let lastSpeechTime = Date.now();
      let hasSpokenSomething = false;
      let capturedTranscript = ''; // Store transcript when silence is detected

      // Clear any existing timeout when starting
      const clearSpeechTimeout = () => {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
      };

      const clearSilenceTimer = () => {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      };

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        setError(null);
        setFinalTranscript('');
        setTranscript('');
        clearSpeechTimeout();
        clearSilenceTimer();
        hasSpokenSomething = false;
        lastSpeechTime = Date.now();
        capturedTranscript = ''; // Reset captured transcript
        
        // Set a maximum timeout of 30 seconds
        speechTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Speech timeout - auto stopping after 30 seconds');
          if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
          }
        }, 30000);
      };

      recognition.onend = async () => {
        console.log('🏁 Speech recognition ended');
        console.log('📊 DEBUG - Speech end state:');
        console.log('  - hasSpokenSomething:', hasSpokenSomething);
        console.log('  - finalTranscript:', `"${finalTranscript}"`);
        console.log('  - live transcript:', `"${transcript}"`);
        console.log('  - capturedTranscript:', `"${capturedTranscript}"`);
        console.log('  - finalTranscript.trim():', `"${finalTranscript.trim()}"`);
        console.log('  - transcript.trim():', `"${transcript.trim()}"`);
        
        setIsListening(false);
        clearSpeechTimeout();
        clearSilenceTimer();
        
        // Use captured transcript from silence detection, or fallback to current state
        const transcriptToUse = capturedTranscript || finalTranscript.trim() || transcript.trim();
        console.log('🎯 Transcript to use for extraction:', `"${transcriptToUse}"`);
        console.log('📏 Transcript length:', transcriptToUse.length);
        
        // Extract ingredients if we have any transcript content
        if (transcriptToUse && transcriptToUse.length > 0) {
          console.log('✅ Proceeding with ingredient extraction...');
          console.log('🎤 Speech ended naturally, extracting ingredients from transcript:', transcriptToUse);
          setIsExtracting(true);
          setError(null);
          try {
            console.log('🚀 Using Gemini AI extraction');
            const geminiIngredients = await extractIngredientsFromText(transcriptToUse);
            console.log('🎯 Gemini extracted ingredients:', geminiIngredients);
            console.log('📊 Number of ingredients found:', geminiIngredients.length);
            if (geminiIngredients.length > 0) {
              console.log('✅ Calling onIngredientsDetected with:', geminiIngredients);
              onIngredientsDetected(geminiIngredients);
            } else {
              console.log('⚠️ No ingredients extracted from Gemini');
            }
          } catch (err: any) {
            console.error('❌ Gemini extraction failed, using fallback:', err);
            // Fallback to simple extraction if Gemini fails
            const simpleIngredients = extractIngredientsSimple(transcriptToUse);
            console.log('🎯 Fallback extracted ingredients:', simpleIngredients);
            console.log('📊 Fallback number of ingredients:', simpleIngredients.length);
            if (simpleIngredients.length > 0) {
              console.log('✅ Calling onIngredientsDetected with fallback:', simpleIngredients);
              onIngredientsDetected(simpleIngredients);
            } else {
              console.log('⚠️ No ingredients extracted from fallback either');
            }
            setError('Using fallback extraction (Gemini AI unavailable)');
          } finally {
            setIsExtracting(false);
          }
        } else {
          console.log('❌ No transcript available for extraction');
          console.log('  - capturedTranscript empty:', !capturedTranscript);
          console.log('  - finalTranscript empty:', !finalTranscript.trim());
          console.log('  - transcript empty:', !transcript.trim());
          console.log('  - hasSpokenSomething:', hasSpokenSomething);
        }
      };

      recognition.onerror = (event: any) => {
        console.log('⚠️ Speech recognition error:', event.error);
        // Don't show errors for common expected cases
        if (event.error === 'aborted' || event.error === 'no-speech') {
          console.log('🔇 Ignoring expected error:', event.error);
          setIsListening(false);
          clearSpeechTimeout();
          clearSilenceTimer();
          return;
        }
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        clearSpeechTimeout();
        clearSilenceTimer();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentFinalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            currentFinalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        // Update final transcript only with final results
        if (currentFinalTranscript) {
          setFinalTranscript(prev => prev + currentFinalTranscript);
          hasSpokenSomething = true;
        }
        
        // Update display transcript with both final and interim
        const fullTranscript = finalTranscript + currentFinalTranscript + interimTranscript;
        setTranscript(fullTranscript);
        onTranscript(fullTranscript);
        
        // If we have any speech (final or interim), update the last speech time
        if (currentFinalTranscript || interimTranscript) {
          lastSpeechTime = Date.now();
          hasSpokenSomething = true;
          clearSilenceTimer();
          
          // Capture current transcript for use in extraction
          capturedTranscript = fullTranscript.trim();
          console.log('💾 Captured transcript for extraction:', capturedTranscript);
          
          // Start silence detection - stop after 2 seconds of silence
          silenceTimer = setTimeout(() => {
            console.log('🔇 Detected 2 seconds of silence, auto-stopping...');
            console.log('💾 Final captured transcript:', capturedTranscript);
            if (recognitionRef.current && isListening && hasSpokenSomething) {
              recognitionRef.current.stop();
            }
          }, 2000);
        }
      };
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      // Clear any active timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, [onTranscript, onIngredientsDetected, finalTranscript]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setFinalTranscript('');
      setError(null);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      console.log('🛑 Manually stopping speech recognition...');
      console.log('📊 Current finalTranscript before stop:', `"${finalTranscript}"`);
      console.log('📊 Current live transcript before stop:', `"${transcript}"`);
      recognitionRef.current.stop();
      
      // Use the live transcript if finalTranscript is empty
      const transcriptToUse = finalTranscript.trim() || transcript.trim();
      
      // Also extract ingredients immediately when manually stopping
      if (transcriptToUse) {
        console.log('🎤 Manual stop - extracting ingredients from transcript:', transcriptToUse);
        setIsExtracting(true);
        setError(null);
        
        extractIngredientsFromText(transcriptToUse)
          .then(geminiIngredients => {
            console.log('🎯 Manual extraction - Gemini ingredients:', geminiIngredients);
            onIngredientsDetected(geminiIngredients);
          })
          .catch(err => {
            console.error('❌ Manual extraction - Gemini failed, using fallback:', err);
            const simpleIngredients = extractIngredientsSimple(transcriptToUse);
            console.log('🎯 Manual extraction - Fallback ingredients:', simpleIngredients);
            onIngredientsDetected(simpleIngredients);
            setError('Using fallback extraction (Gemini AI unavailable)');
          })
          .finally(() => {
            setIsExtracting(false);
          });
      }
    }
  };

  if (!isSupported) {
    return (
      <div className={`text-center p-4 bg-gray-800 rounded-lg ${className}`}>
        <Volume2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-400 text-sm">
          Speech recognition is not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Speech Control Button */}
      <div className="text-center">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          disabled={!isSupported || isExtracting}
        >
          {isListening ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
        <p className="text-sm text-gray-400 mt-2">
          {isListening ? 'Listening... Will auto-stop after 2 seconds of silence' : 'Click to speak your ingredients'}
        </p>
      </div>

      {/* Live Transcript */}
      {transcript && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">What you said:</h4>
          <p className="text-white">{transcript}</p>
        </div>
      )}

      {/* AI Extraction Loading State */}
      {isExtracting && (
        <div className="bg-gray-900 rounded-lg p-4 text-center text-blue-300 text-sm animate-pulse">
          Extracting ingredients with Gemini AI...
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SpeechToText; 