"use client"

import { formatDuration } from "@/lib/utils"

interface TimeSelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  charCount?: number
}

export function TimeSelector({
  value,
  onChange,
  min = 10,
  max = 360,
}: TimeSelectorProps) {
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value))
  }

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor="duration-slider" className="text-sm font-medium text-black flex items-center gap-2">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Duration
        </label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-black">{formatDuration(value)}</span>
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 h-2 top-1/2 -translate-y-1/2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          id="duration-slider"
          type="range"
          value={value}
          onChange={handleValueChange}
          min={min}
          max={max}
          step={5}
          className="relative w-full h-2 appearance-none bg-transparent cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-black
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-black/30
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-black
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:shadow-black/30
            [&::-moz-range-thumb]:cursor-pointer"
          aria-label="Select duration"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-600">
        <span>{formatDuration(min)}</span>
        <span>{formatDuration(max)}</span>
      </div>
    </div>
  )
}
