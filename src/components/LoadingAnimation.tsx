import React from 'react';
import Lottie from 'lottie-react';

interface LoadingAnimationProps {
  animationData: any;
  message?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  animationData, 
  message = "Generating your perfect recipe..." 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-64 h-64 mx-auto mb-6">
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: '100%', height: '100%' }}
          />
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