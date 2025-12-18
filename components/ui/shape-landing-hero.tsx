"use client"

import { HandWrittenTitle } from "@/components/ui/hand-writing-text"
import { BackgroundPaths } from "@/components/ui/background-paths"

export function ShapeLandingHero() {
  return (
    <div className="relative min-h-screen bg-[#030303] flex flex-col items-center justify-center overflow-hidden">
      {/* Shader Background */}
      <BackgroundPaths />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <HandWrittenTitle 
          title="TypeFlow" 
          subtitle="Turn any text into natural human typing in Google Docs"
        />
      </div>
    </div>
  )
}
