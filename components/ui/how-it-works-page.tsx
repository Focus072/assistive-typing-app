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

export function HowItWorksContent() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Scene>()
  const rendererRef = useRef<WebGLRenderer>()
  const animationIdRef = useRef<number>()

  // Three.js background effect (same as waitlist page)
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
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-6 py-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                {features.map((feature, index) => {
                  const isActive = index === 0
                  const className = `text-sm px-3 py-1 rounded-full transition-colors ${
                    isActive
                      ? "bg-black/60 text-white border border-white/20"
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
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-center min-h-screen px-6 pt-28 pb-16">
          <div className="w-full max-w-3xl">
            <div className="relative backdrop-blur-xl bg-black/60 border border-white/20 rounded-3xl p-12 shadow-2xl">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <div className="mb-8">
                  <h1 className="text-5xl font-light text-white mb-4 tracking-wide">
                    How Typing Is Boring works
                  </h1>
                  <p className="text-white/70 text-lg leading-relaxed">
                    A simple process to make automated typing look and feel natural in your Google Docs.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                      <span className="text-xl font-semibold text-red-400">1</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white mb-2">
                        Connect your Google account
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        Connect your Google account securely using OAuth — we never see your password
                        and you can revoke access at any time from your Google settings.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                      <span className="text-xl font-semibold text-red-400">2</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white mb-2">
                        Paste your text and pick a Google Doc
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        Paste your text, pick a Google Doc, and choose how fast you want it to type.
                        You stay in Google Docs to watch it in real time.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                      <span className="text-xl font-semibold text-red-400">3</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white mb-2">
                        Watch it type naturally
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        Typing Is Boring simulates a human typing into that document — including pauses,
                        bursts, and realistic delays — instead of pasting everything at once.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                      <span className="text-xl font-semibold text-red-400">4</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-white mb-2">
                        Full control
                      </h3>
                      <p className="text-white/70 leading-relaxed">
                        You can pause, resume, or stop any job from the dashboard whenever you want.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/10">
                  <Link
                    href="/waitlist"
                    className="inline-flex items-center justify-center px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25"
                  >
                    Join the waitlist
                  </Link>
                </div>
              </div>

              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
