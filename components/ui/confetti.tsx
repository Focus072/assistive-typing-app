"use client"

import { useEffect, useState } from "react"

interface ConfettiProps {
  onComplete?: () => void
}

export function Confetti({ onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    y: number
    rotation: number
    color: string
    delay: number
  }>>([])

  useEffect(() => {
    const colors = ["#a855f7", "#ec4899", "#8b5cf6", "#f472b6", "#c084fc"]
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 500,
    }))
    setParticles(newParticles)

    const timer = setTimeout(() => {
      onComplete?.()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            animation: `confetti-fall ${1 + Math.random()}s ease-out ${particle.delay}ms forwards`,
            transform: `rotate(${particle.rotation}deg)`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          to {
            top: 110%;
            transform: rotate(${Math.random() * 720}deg);
          }
        }
      `}</style>
    </div>
  )
}

