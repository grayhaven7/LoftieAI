'use client';

import { useState } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  alt?: string;
}

export default function BeforeAfterSlider({ 
  beforeImage, 
  afterImage, 
  alt = "Before and after transformation" 
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--glass-border)]">
      <div 
        className="relative aspect-[4/3] cursor-col-resize"
        onMouseMove={handleMouseMove}
        onTouchMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.touches[0].clientX - rect.left;
          const percentage = (x / rect.width) * 100;
          setSliderPosition(Math.max(0, Math.min(100, percentage)));
        }}
      >
        {/* After image (always visible) */}
        <img
          src={afterImage}
          alt={`${alt} - after`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Before image (clipped by slider) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt={`${alt} - before`}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Slider handle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-[var(--color-accent)] flex items-center justify-center">
            <div className="w-1 h-4 bg-[var(--color-accent)] rounded"></div>
          </div>
        </div>
        
        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
          Before
        </div>
        <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
          After
        </div>
      </div>
      
      {/* Hidden range input for accessibility */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={handleSliderChange}
        className="sr-only"
        aria-label="Slider to compare before and after images"
      />
    </div>
  );
}