import React from 'react';

interface LoadingAnimationProps {
  animationData?: any;
  message?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  message = "Generating your perfect recipe..." 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-64 h-64 mx-auto mb-6 flex items-center justify-center">
          {/* Spinning Fork and Spoon */}
          <div className="relative">
            {/* Fork */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transform -rotate-45"
              >
                <path d="M12 2l0 20" />
                <path d="M12 7l-2 -2" />
                <path d="M12 7l2 -2" />
                <path d="M12 7l0 -2" />
              </svg>
            </div>
            
            {/* Spoon */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transform rotate-45"
              >
                <path d="M12 2l0 20" />
                <path d="M12 7a3 3 0 0 1 0 -6 3 3 0 0 1 0 6" />
              </svg>
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">{message}</h2>
        <p className="text-gray-400 text-lg">
          This might take a moment...
        </p>
        <div className="mt-4 flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation; 