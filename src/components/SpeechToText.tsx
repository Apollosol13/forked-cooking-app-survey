import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface SpeechToTextProps {
  onTranscriptChange?: (transcript: string) => void;
  onIngredientsDetected?: (ingredients: string[]) => void;
  userId: string; // Add userId prop for secure backend calls
}

// Secure ingredient extraction using backend function
async function extractIngredientsFromText(transcript: string, userId: string): Promise<string[]> {
  console.log('🔄 Calling secure backend for ingredient extraction...');
  
  if (!transcript.trim()) {
    console.log('❌ Empty transcript provided');
    return [];
  }

  if (!userId) {
    console.log('❌ User ID required for secure extraction');
    throw new Error('User authentication required');
  }

  try {
    const response = await fetch('/.netlify/functions/extract-ingredients-secure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: transcript.trim(),
        userId: userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment.');
      }
      
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    const ingredients = result.ingredients || [];
    
    console.log('✅ Ingredients extracted via secure backend:', ingredients);
    return ingredients;

  } catch (error) {
    console.error('❌ Secure ingredient extraction failed:', error);
    
    // Fallback to simple extraction if backend fails
    console.log('🔄 Falling back to simple extraction...');
    return extractIngredientsSimple(transcript);
  }
}

// Simple fallback extraction (client-side only)
function extractIngredientsSimple(transcript: string): string[] {
  console.log('🔧 Using simple extraction fallback');
  
  const commonIngredients = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp',
    'rice', 'pasta', 'bread', 'quinoa', 'barley', 'oats',
    'tomato', 'onion', 'garlic', 'potato', 'carrot', 'celery',
    'bell pepper', 'broccoli', 'spinach', 'lettuce', 'mushroom',
    'cheese', 'milk', 'butter', 'cream', 'yogurt', 'egg',
    'salt', 'pepper', 'oil', 'olive oil', 'vinegar',
    'basil', 'oregano', 'thyme', 'rosemary', 'parsley',
    'ginger', 'turmeric', 'cumin', 'paprika', 'chili',
    'lemon', 'lime', 'apple', 'banana', 'orange',
    'jasmine rice', 'brown rice', 'basmati rice',
    'ground beef', 'chicken breast', 'pork chops'
  ];

  const words = transcript.toLowerCase().split(/\s+/);
  const foundIngredients: string[] = [];

  // Check for multi-word ingredients first
  const multiWordIngredients = commonIngredients.filter(ing => ing.includes(' '));
  multiWordIngredients.forEach(ingredient => {
    if (transcript.toLowerCase().includes(ingredient)) {
      foundIngredients.push(ingredient);
    }
  });

  // Then check for single-word ingredients
  const singleWordIngredients = commonIngredients.filter(ing => !ing.includes(' '));
  singleWordIngredients.forEach(ingredient => {
    if (words.includes(ingredient) && !foundIngredients.some(found => found.includes(ingredient))) {
      foundIngredients.push(ingredient);
    }
  });

  console.log('🎯 Simple extraction found:', foundIngredients);
  return foundIngredients;
}

const SpeechToText: React.FC<SpeechToTextProps> = ({ 
  onTranscriptChange, 
  onIngredientsDetected,
  userId 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let silenceTimer: NodeJS.Timeout | null = null;
      let lastSpeechTime = Date.now();
      let hasSpokenSomething = false;
      let capturedTranscript = '';

      const clearSilenceTimer = () => {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      };

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        lastSpeechTime = Date.now();
        hasSpokenSomething = false;
        capturedTranscript = '';
      };

      recognition.onend = async () => {
        console.log('🔇 Speech recognition ended');
        setIsListening(false);
        clearSilenceTimer();

        if (capturedTranscript.trim() && hasSpokenSomething) {
          console.log('🔄 Processing captured transcript:', capturedTranscript);
          setIsProcessing(true);
          
          try {
            const ingredients = await extractIngredientsFromText(capturedTranscript, userId);
            if (ingredients.length > 0) {
              onIngredientsDetected?.(ingredients);
            }
          } catch (error) {
            console.error('❌ Error processing speech:', error);
          } finally {
            setIsProcessing(false);
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('🚨 Speech recognition error:', event.error);
        setIsListening(false);
        setIsProcessing(false);
        clearSilenceTimer();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let currentFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = (transcript + currentFinalTranscript).trim();
        setTranscript(fullTranscript + (interimTranscript ? ' ' + interimTranscript : ''));
        onTranscriptChange?.(fullTranscript + (interimTranscript ? ' ' + interimTranscript : ''));

        if (currentFinalTranscript || interimTranscript) {
          lastSpeechTime = Date.now();
          hasSpokenSomething = true;
          clearSilenceTimer();
          capturedTranscript = fullTranscript.trim();
          
          silenceTimer = setTimeout(() => {
            if (recognitionRef.current && isListening && hasSpokenSomething) {
              console.log('🔇 Stopping due to silence');
              recognitionRef.current.stop();
            }
          }, 2000);
        }
      };

      recognitionRef.current = recognition;

      // Auto-stop after 30 seconds
      const maxTimer = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          console.log('⏰ Stopping due to timeout');
          recognitionRef.current.stop();
        }
      }, 30000);

      return () => {
        clearTimeout(maxTimer);
        clearSilenceTimer();
      };
    }
  }, [onTranscriptChange, onIngredientsDetected, userId, isListening]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setIsProcessing(false);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  if (!isSupported) {
    return (
      <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-700">
        <Volume2 className="w-8 h-8 mx-auto mb-2 text-gray-500" />
        <p className="text-gray-400">Speech recognition not supported in this browser</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : isProcessing
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isListening ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
        
        <p className="mt-2 text-sm text-gray-400">
          {isProcessing
            ? 'Processing speech...'
            : isListening
            ? 'Listening... (Click to stop)'
            : 'Click to speak your ingredients'
          }
        </p>
      </div>

      {transcript && (
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-300">
            <strong>You said:</strong> {transcript}
          </p>
        </div>
      )}
    </div>
  );
};

export default SpeechToText;
