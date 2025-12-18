"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Dot {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

export function AnimatedDots() {
  const [dots, setDots] = useState<Dot[]>([])

  useEffect(() => {
    // Denser, brighter dot field for a visible animated background
    const dotCount = 260
    const newDots: Dot[] = Array.from({ length: dotCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5, // 1.5–4px
      duration: 10 + Math.random() * 18, // 10–28s
      delay: Math.random() * 8, // 0–8s delay
    }))
    setDots(newDots)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Static dotted grid underlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      />

      {/* Floating / twinkling dots on top */}
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full bg-white/60"
          style={{
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            boxShadow: "0 0 8px rgba(255,255,255,0.45)",
          }}
          animate={{
            y: [
              `${dot.y + (Math.random() - 0.5) * 20}%`,
              `${dot.y + (Math.random() - 0.5) * 24}%`,
              `${dot.y + (Math.random() - 0.5) * 20}%`,
            ],
            x: [
              `${dot.x + (Math.random() - 0.5) * 16}%`,
              `${dot.x + (Math.random() - 0.5) * 22}%`,
              `${dot.x + (Math.random() - 0.5) * 16}%`,
            ],
            opacity: [0.25, 0.8, 0.25],
            scale: [0.8, 1.4, 0.8],
          }}
          transition={{
            duration: dot.duration,
            delay: dot.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

