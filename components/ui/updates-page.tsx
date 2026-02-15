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
import { MobileNav } from "@/components/ui/mobile-nav"

export function UpdatesContent() {
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
    { name: "Home", href: "/" },
    { name: "Launch", href: "/launch" },
    { name: "Updates", href: "/updates" },
  ]

  const mobileFeatures = [
    { name: "Home", href: "/" },
    { name: "How it works", href: "/how-it-works" },
  ]

  // Placeholder updates - can be replaced with dynamic content later
  const updates = [
    {
      id: 1,
      date: "January 2024",
      category: "Announcement",
      title: "Welcome to Typing Is Boring",
      description: "We're excited to announce the launch of Typing Is Boring, a revolutionary way to automate typing in Google Docs with natural human-like rhythm.",
      badge: "New",
      badgeColor: "bg-red-600/20 border-red-600/40 text-red-400",
    },
    {
      id: 2,
      date: "January 2024",
      category: "Feature",
      title: "Live access now available",
      description: "Typing Is Boring is now live. Experience natural typing automation in Google Docs with human-like rhythm.",
      badge: "Feature",
      badgeColor: "bg-blue-600/20 border-blue-600/40 text-blue-400",
    },
    {
      id: 3,
      date: "Coming soon",
      category: "Roadmap",
      title: "Beta program launch",
      description: "We're preparing to launch our beta program. Early access to test new features before public release.",
      badge: "Upcoming",
      badgeColor: "bg-purple-600/20 border-purple-600/40 text-purple-400",
    },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-black w-full">
      {/* Three.js Background */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen">
        {/* Navigation */}
        <MobileNav 
          currentPath="/updates"
          links={features}
          mobileLinks={mobileFeatures}
        />

        {/* Main Content */}
        <div className="flex items-start justify-center min-h-screen px-4 sm:px-6 pt-24 sm:pt-32 pb-16">
          <div className="w-full max-w-4xl">
            {/* Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-4 tracking-wide">
                Updates
              </h1>
              <p className="text-white/70 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
                Stay up to date with the latest news, features, and announcements from Typing Is Boring.
              </p>
            </div>

            {/* Updates List */}
            <div className="space-y-6">
              {updates.map((update, index) => (
                <div
                  key={update.id}
                  className="relative backdrop-blur-xl bg-black/60 border border-white/20 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl hover:border-white/30 transition-colors"
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  
                  <div className="relative z-10">
                    {/* Update Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${update.badgeColor}`}>
                          {update.badge}
                        </span>
                        <span className="text-white/50 text-sm">{update.date}</span>
                      </div>
                      <span className="text-white/40 text-sm">{update.category}</span>
                    </div>

                    {/* Update Content */}
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
                      {update.title}
                    </h2>
                    <p className="text-white/70 leading-relaxed text-base sm:text-lg">
                      {update.description}
                    </p>
                  </div>

                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
                </div>
              ))}
            </div>

            {/* Subscribe CTA */}
            <div className="mt-12 text-center">
              <div className="relative backdrop-blur-xl bg-black/60 border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                
                <div className="relative z-10">
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
                    Ready to get started?
                  </h3>
                  <p className="text-white/70 mb-6 leading-relaxed">
                    Choose a plan and start automating your typing in Google Docs today.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25"
                  >
                    View Pricing
                  </Link>
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
