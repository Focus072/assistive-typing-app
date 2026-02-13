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

export function LaunchContent() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Scene>()
  const rendererRef = useRef<WebGLRenderer>()
  const animationIdRef = useRef<number>()

  // Three.js background effect (same as other pages)
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
        <div className="absolute top-4 sm:top-8 left-1/2 transform -translate-x-1/2 z-20 w-[calc(100%-2rem)] sm:w-auto px-0">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 sm:px-6 py-2.5 sm:py-3">
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              {features.map((feature, index) => {
                const isActive = index === 3
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
          <div className="w-full max-w-4xl">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center rounded-full border border-red-500/50 bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-400 mb-6">
                Coming Soon
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-6 tracking-wide">
                Typing Is Boring is launching soon
              </h1>
              <p className="text-white/70 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-8">
                Experience natural, human-like typing automation for Google Docs. 
                Join thousands already on the waitlist.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/waitlist"
                  className="inline-flex items-center justify-center px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 text-base"
                >
                  Join the waitlist
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors text-base"
                >
                  Learn how it works
                </Link>
              </div>
            </div>

            {/* Key Features */}
            <div className="relative backdrop-blur-xl bg-black/60 border border-white/20 rounded-3xl p-8 sm:p-10 lg:p-12 shadow-2xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-8 text-center">
                  What&apos;s launching
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        Natural typing simulation
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        Watch your text appear naturally with human-like pauses, bursts, and rhythm instead of instant pasting.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        Secure & private
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        Official Google OAuth integration. We never read or store your documents—only type into what you choose.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        Customizable pacing
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        Choose your typing speed, style, and duration. Control every aspect of how your text appears.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        Full control
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        Pause, resume, or stop any typing job at any time. You&apos;re always in control.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
            </div>

            {/* CTA Section */}
            <div className="text-center mt-12">
              <p className="text-white/60 mb-6">
                Be the first to know when we launch
              </p>
              <Link
                href="/waitlist"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors text-base"
              >
                Join the waitlist
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
