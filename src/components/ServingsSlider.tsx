import React from 'react';

interface ServingsSliderProps {
  servings: number;
  onChange: (servings: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export const ServingsSlider: React.FC<ServingsSliderProps> = ({
  servings,
  onChange,
  min = 1,
  max = 8,
  className = ''
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(event.target.value, 10));
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <label className="text-white font-medium">Servings</label>
        <span className="text-white text-lg font-bold bg-gray-800 px-3 py-1 rounded-lg">
          {servings}
        </span>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={servings}
          onChange={handleChange}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, white 0%, white ${((servings - min) / (max - min)) * 100}%, rgb(31, 41, 55) ${((servings - min) / (max - min)) * 100}%, rgb(31, 41, 55) 100%)`
          }}
        />
      </div>
      
      <div className="flex justify-between text-sm text-gray-400 mt-2">
        <span>{min} serving{min !== 1 ? 's' : ''}</span>
        <span>{max} servings</span>
      </div>
    </div>
  );
}; 