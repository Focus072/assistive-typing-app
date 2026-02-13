"use client"

import React, { useRef, useEffect } from "react"
import Link from "next/link"
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  QuadraticBezierCurve3,
  Vector3,
  TubeGeometry,
  ShaderMaterial,
  Mesh,
  AdditiveBlending,
  DoubleSide,
} from "three"

export function PricingContent() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Scene>()
  const rendererRef = useRef<WebGLRenderer>()
  const animationIdRef = useRef<number>()

  // Three.js background effect (same as waitlist and how-it-works pages)
  useEffect(() => {
    if (!mountRef.current) return

    const scene = new Scene()
    sceneRef.current = scene

    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    rendererRef.current = renderer

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 1)
    mountRef.current.appendChild(renderer.domElement)

    const curve = new QuadraticBezierCurve3(
      new Vector3(-15, -4, 0),
      new Vector3(2, 3, 0),
      new Vector3(18, 0.8, 0)
    )

    const tubeGeometry = new TubeGeometry(curve, 200, 0.8, 32, false)

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vec3 color1 = vec3(1.0, 0.2, 0.1);
        vec3 color2 = vec3(0.8, 0.1, 0.6);
        vec3 color3 = vec3(0.4, 0.05, 0.8);
        
        vec3 finalColor = mix(color1, color2, vUv.x);
        finalColor = mix(finalColor, color3, vUv.x * 0.7);
        
        float glow = 1.0 - abs(vUv.y - 0.5) * 2.0;
        glow = pow(glow, 2.0);
        
        float fade = 1.0;
        if (vUv.x > 0.85) {
          fade = 1.0 - smoothstep(0.85, 1.0, vUv.x);
        }
        
        float pulse = sin(time * 2.0) * 0.1 + 0.9;
        
        gl_FragColor = vec4(finalColor * glow * pulse * fade, glow * fade * 0.8);
      }
    `

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
      },
      transparent: true,
      blending: AdditiveBlending,
      side: DoubleSide,
    })

    const lightStreak = new Mesh(tubeGeometry, material)
    scene.add(lightStreak)

    const glowGeometry = new TubeGeometry(curve, 200, 1.5, 32, false)
    const glowMaterial = new ShaderMaterial({
      vertexShader,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vec3 color1 = vec3(1.0, 0.3, 0.2);
          vec3 color2 = vec3(0.6, 0.2, 0.8);
          
          vec3 finalColor = mix(color1, color2, vUv.x);
          
          float glow = 1.0 - abs(vUv.y - 0.5) * 2.0;
          glow = pow(glow, 4.0);
          
          float fade = 1.0;
          if (vUv.x > 0.85) {
            fade = 1.0 - smoothstep(0.85, 1.0, vUv.x);
          }
          
          float pulse = sin(time * 1.5) * 0.05 + 0.95;
          
          gl_FragColor = vec4(finalColor * glow * pulse * fade, glow * fade * 0.3);
        }
      `,
      uniforms: {
        time: { value: 0 },
      },
      transparent: true,
      blending: AdditiveBlending,
      side: DoubleSide,
    })

    const glowLayer = new Mesh(glowGeometry, glowMaterial)
    scene.add(glowLayer)

    camera.position.z = 7
    camera.position.y = -0.8

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      const time = Date.now() * 0.001
      material.uniforms.time.value = time
      glowMaterial.uniforms.time.value = time

      lightStreak.rotation.z = Math.sin(time * 0.2) * 0.05
      glowLayer.rotation.z = Math.sin(time * 0.2) * 0.05

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!camera || !renderer) return

      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }

      renderer.dispose()
      tubeGeometry.dispose()
      glowGeometry.dispose()
      material.dispose()
      glowMaterial.dispose()
    }
  }, [])

  const features = [
    { name: "How it works", href: "/how-it-works" },
    { name: "Pricing", href: "/pricing" },
    { name: "Home", href: "/waitlist" },
    { name: "Launch", href: "/launch" },
    { name: "Updates", href: "/updates" },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-black w-full">
      {/* Three.js Background */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen">
        {/* Top Navigation */}
        <div className="absolute top-4 sm:top-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 sm:px-6 py-2.5 sm:py-3">
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              {features.map((feature, index) => {
                const isActive = index === 1
                const className = `text-xs sm:text-sm px-3 sm:px-3 py-1.5 sm:py-1 rounded-none sm:rounded-full transition-colors whitespace-nowrap relative ${
                  isActive
                    ? "text-white border-b-2 border-white pb-1.5 sm:border-0 sm:pb-1 sm:bg-black/60 sm:text-white sm:border sm:border-white/20"
                    : "text-white/60 hover:text-white/80"
                }`

                if (feature.href === "#") {
                  return (
                    <button
                      key={feature.name}
                      type="button"
                      className={className}
                    >
                      {feature.name}
                    </button>
                  )
                }

                return (
                  <Link
                    key={feature.name}
                    href={feature.href}
                    className={className}
                  >
                    {feature.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-screen px-4 sm:px-6 pt-24 sm:pt-32 pb-16">
          <div className="w-full max-w-6xl">
            {/* Header */}
            <div className="text-center mb-10 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-3 sm:mb-4 tracking-wide">
                Simple, transparent pricing
              </h1>
              <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto px-4">
                Choose the perfect plan for your typing automation needs. All plans include core features.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              {/* Plan 1 */}
              <div className="relative backdrop-blur-xl bg-black/60 border border-white/20 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl flex flex-col h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="mb-6">
                    <h3 className="text-2xl font-semibold text-white mb-2">Basic</h3>
                    <p className="text-white/60 text-sm">Perfect for getting started</p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light text-white">$0</span>
                      <span className="text-white/60">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                  </ul>
                  <div className="mt-auto pt-4">
                    <button className="w-full px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors">
                      Coming soon
                    </button>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
              </div>

              {/* Plan 2 - Featured */}
              <div className="relative backdrop-blur-xl bg-black/60 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl md:scale-105 flex flex-col h-full md:-mt-4 md:mb-4">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-red-600 text-white text-xs font-medium px-4 py-1 rounded-full">
                    Popular
                  </span>
                </div>
                <div className="relative z-10">
                  <div className="mb-6">
                    <h3 className="text-2xl font-semibold text-white mb-2">Pro</h3>
                    <p className="text-white/60 text-sm">For power users</p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light text-white">$0</span>
                      <span className="text-white/60">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                  </ul>
                  <div className="mt-auto pt-4">
                    <button className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium">
                      Coming soon
                    </button>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
              </div>

              {/* Plan 3 */}
              <div className="relative backdrop-blur-xl bg-black/60 border border-white/20 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl flex flex-col h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="mb-6">
                    <h3 className="text-2xl font-semibold text-white mb-2">Enterprise</h3>
                    <p className="text-white/60 text-sm">For teams and organizations</p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light text-white">$0</span>
                      <span className="text-white/60">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70">Feature coming soon</span>
                    </li>
                  </ul>
                  <div className="mt-auto pt-4">
                    <button className="w-full px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors">
                      Coming soon
                    </button>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
