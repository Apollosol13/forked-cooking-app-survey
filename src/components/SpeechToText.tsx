import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface SpeechToTextProps {
  onTranscript: (text: string) => void;
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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setIsSupported(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const fullTranscript = finalTranscript + interimTranscript;
        setTranscript(fullTranscript);
        onTranscript(fullTranscript);

        // If we have a final result, extract ingredients
        if (finalTranscript) {
          const ingredients = extractIngredients(finalTranscript);
          if (ingredients.length > 0) {
            onIngredientsDetected(ingredients);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript, onIngredientsDetected]);

  const extractIngredients = (text: string): string[] => {
    // Simple ingredient extraction - you can make this more sophisticated
    const commonIngredients = [
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp',
      'rice', 'pasta', 'noodles', 'bread', 'flour', 'eggs',
      'tomato', 'tomatoes', 'onion', 'onions', 'garlic', 'ginger',
      'carrot', 'carrots', 'potato', 'potatoes', 'bell pepper', 'peppers',
      'mushroom', 'mushrooms', 'spinach', 'lettuce', 'broccoli',
      'cheese', 'milk', 'butter', 'cream', 'yogurt',
      'oil', 'olive oil', 'salt', 'pepper', 'herbs', 'spices',
      'lemon', 'lime', 'apple', 'banana', 'avocado'
    ];

    const words = text.toLowerCase().split(/\s+/);
    const detectedIngredients: string[] = [];

    // Look for exact matches and partial matches
    commonIngredients.forEach(ingredient => {
      const ingredientWords = ingredient.split(' ');
      if (ingredientWords.length === 1) {
        // Single word ingredient
        if (words.some(word => word.includes(ingredient) || ingredient.includes(word))) {
          if (!detectedIngredients.includes(ingredient)) {
            detectedIngredients.push(ingredient);
          }
        }
      } else {
        // Multi-word ingredient
        const ingredientText = ingredientWords.join(' ');
        if (text.toLowerCase().includes(ingredientText)) {
          if (!detectedIngredients.includes(ingredient)) {
            detectedIngredients.push(ingredient);
          }
        }
      }
    });

    return detectedIngredients;
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
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
          disabled={!isSupported}
        >
          {isListening ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
        <p className="text-sm text-gray-400 mt-2">
          {isListening ? 'Listening... Click to stop' : 'Click to speak your ingredients'}
        </p>
      </div>

      {/* Live Transcript */}
      {transcript && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">What you said:</h4>
          <p className="text-white">{transcript}</p>
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