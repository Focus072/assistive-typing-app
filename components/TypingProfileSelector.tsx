"use client"

import type { TypingProfile } from "@/types"

interface TypingProfileSelectorProps {
  value: TypingProfile
  onChange: (value: TypingProfile) => void
}

const profiles: { value: TypingProfile; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "steady",
    label: "Steady",
    description: "Uniform pace",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  },
  {
    value: "fatigue",
    label: "Fatigue",
    description: "Slows over time",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
  },
  {
    value: "burst",
    label: "Burst",
    description: "Fast with pauses",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    value: "micropause",
    label: "Micro-pause",
    description: "Frequent breaks",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export function TypingProfileSelector({
  value,
  onChange,
}: TypingProfileSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-black flex items-center gap-2">
        <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Typing Profile
      </label>
      
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {profiles.map((profile) => (
          <button
            key={profile.value}
            onClick={() => onChange(profile.value)}
            className={`relative p-3 md:p-4 rounded-lg text-left transition-all group touch-manipulation active:scale-95 ${
              value === profile.value
                ? 'bg-black border-black border-2'
                : 'bg-white border border-black hover:bg-gray-50 active:bg-gray-100'
            }`}
            aria-label={`Select ${profile.label} profile`}
            aria-pressed={value === profile.value}
            tabIndex={0}
          >
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg mb-2 flex items-center justify-center ${
              value === profile.value 
                ? 'bg-black text-white' 
                : 'bg-gray-100 text-black group-hover:text-gray-900'
            }`}>
              {profile.icon}
            </div>
            <div className={`font-medium text-xs md:text-sm ${value === profile.value ? 'text-white' : 'text-black'}`}>
              {profile.label}
            </div>
            <div className={`text-xs ${value === profile.value ? 'text-white' : 'text-gray-600'} hidden sm:block`}>
              {profile.description}
            </div>
            
            {value === profile.value && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
