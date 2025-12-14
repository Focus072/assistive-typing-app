"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"

export function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (err) {
      setLoading(false)
    }
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleGoogleSignIn()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">typingisboring</div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="hover:text-gray-300 transition-colors">Features</Link>
            <Link href="#solutions" className="hover:text-gray-300 transition-colors">Solutions</Link>
            <Link href="#resources" className="hover:text-gray-300 transition-colors">Resources</Link>
            <Link href="#pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoogleSignIn}
              className="text-white hover:text-gray-300 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={handleGoogleSignIn}
              className="px-4 py-2 bg-white text-black font-semibold rounded hover:bg-gray-100 transition-colors"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - Black Background */}
      <section className="bg-black text-white py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Sync up. Speed up. Stand out.
              </h1>
              <p className="text-xl md:text-2xl text-gray-300">
                typingisboring is a typing automation platform that helps you transform text into natural, human-like typing in Google Docs.
              </p>
              <form onSubmit={handleEmailSubmit} className="flex gap-3 max-w-md">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Work email"
                  className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Get started
                </button>
              </form>
            </div>
            <div className="bg-white rounded-lg p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center space-y-4 text-black">
                <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">Google Docs typing preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-12 border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-gray-600 mb-8">Trusted by students, writers, and professionals worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
            <div className="text-2xl font-semibold text-black">Students</div>
            <div className="text-2xl font-semibold text-black">Writers</div>
            <div className="text-2xl font-semibold text-black">Professionals</div>
            <div className="text-2xl font-semibold text-black">Researchers</div>
            <div className="text-2xl font-semibold text-black">Content Creators</div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-black text-center mb-16">
            We don't just talk about results, we show them.
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="text-6xl font-bold text-black mb-4">50%</div>
              <p className="text-xl text-gray-700 mb-2">faster document creation</p>
              <Link href="#" className="text-black underline">Learn more</Link>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold text-black mb-4">100K+</div>
              <p className="text-xl text-gray-700 mb-2">documents typed</p>
              <Link href="#" className="text-black underline">Learn more</Link>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold text-black mb-4">10K+</div>
              <p className="text-xl text-gray-700 mb-2">active users</p>
              <Link href="#" className="text-black underline">Learn more</Link>
            </div>
          </div>
        </div>
      </section>

      {/* AI-powered Workflows */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Intelligent typing workflows that move you forward.
          </h2>
          <button
            onClick={handleGoogleSignIn}
            className="px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
          >
            Explore features
          </button>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-black text-center mb-16">
            Essays that impress. Documents that deliver. Notes that matter.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 border border-black/10 rounded-lg hover:border-black transition-colors">
              <h3 className="text-2xl font-bold text-black mb-4">Academic Writing</h3>
              <p className="text-gray-700 mb-4">Transform drafts into polished essays and assignments.</p>
              <Link href="#" className="text-black underline">Learn more</Link>
            </div>
            <div className="p-8 border border-black/10 rounded-lg hover:border-black transition-colors">
              <h3 className="text-2xl font-bold text-black mb-4">Content Creation</h3>
              <p className="text-gray-700 mb-4">Speed up long-form writing and documentation.</p>
              <Link href="#" className="text-black underline">Learn more</Link>
            </div>
            <div className="p-8 border border-black/10 rounded-lg hover:border-black transition-colors">
              <h3 className="text-2xl font-bold text-black mb-4">Note Transcription</h3>
              <p className="text-gray-700 mb-4">Convert handwritten notes into digital documents.</p>
              <Link href="#" className="text-black underline">Learn more</Link>
            </div>
            <div className="p-8 border border-black/10 rounded-lg hover:border-black transition-colors">
              <h3 className="text-2xl font-bold text-black mb-4">Accessibility</h3>
              <p className="text-gray-700 mb-4">Support users with typing fatigue or disabilities.</p>
              <Link href="#" className="text-black underline">Learn more</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions for Teams */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-black text-center mb-12">
            Solutions for high performing individuals.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button className="p-6 border-2 border-black rounded-lg text-black font-semibold hover:bg-black hover:text-white transition-colors text-left">
              Students & Academics
            </button>
            <button className="p-6 border-2 border-black rounded-lg text-black font-semibold hover:bg-black hover:text-white transition-colors text-left">
              Writers & Authors
            </button>
            <button className="p-6 border-2 border-black rounded-lg text-black font-semibold hover:bg-black hover:text-white transition-colors text-left">
              Content Teams
            </button>
            <button className="p-6 border-2 border-black rounded-lg text-black font-semibold hover:bg-black hover:text-white transition-colors text-left">
              Researchers
            </button>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-black mb-4">
                Real-time typing simulation
              </h2>
              <p className="text-xl text-gray-700 mb-6">
                Watch your text appear character-by-character with natural human pacing, pauses, and variation.
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
              >
                Learn more
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg p-8 min-h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-500">Feature preview</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="md:order-2">
              <h2 className="text-4xl font-bold text-black mb-4">
                Customizable typing profiles
              </h2>
              <p className="text-xl text-gray-700 mb-6">
                Choose from steady, burst, fatigue, or micropause profiles to match your natural typing style.
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
              >
                Learn more
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg p-8 min-h-[300px] flex items-center justify-center md:order-1">
              <div className="text-center text-gray-500">Feature preview</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-black mb-4">
                Format support & templates
              </h2>
              <p className="text-xl text-gray-700 mb-6">
                Support for MLA, APA, and other academic formats with automatic header insertion and formatting.
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
              >
                Learn more
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg p-8 min-h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-500">Feature preview</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="md:order-2">
              <h2 className="text-4xl font-bold text-black mb-4">
                Secure Google integration
              </h2>
              <p className="text-xl text-gray-700 mb-6">
                Uses your own Google account with per-document safety locks. No copy-paste history, completely private.
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
              >
                Learn more
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg p-8 min-h-[300px] flex items-center justify-center md:order-1">
              <div className="text-center text-gray-500">Feature preview</div>
            </div>
          </div>
        </div>
      </section>

      {/* Alignment & Transformation - Black Background */}
      <section className="bg-black text-white py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-5xl md:text-6xl font-bold leading-tight">
                Seeing is how automation fuels productivity.
              </h2>
              <p className="text-xl text-gray-300">
                typingisboring is a typing automation platform that helps you transform text into natural, human-like typing in Google Docs. It provides realistic typing simulation with customizable profiles, fostering efficiency and driving productivity.
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Get started
              </button>
            </div>
            <div className="bg-white/10 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center text-gray-400">Visual representation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-black text-center mb-16">
            What our users say.
          </h2>
          <div className="bg-white border-2 border-black rounded-lg p-8 md:p-12">
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              "typingisboring has been an indispensable tool for my academic work, especially when dealing with long essays and research papers. It allows me to transform my drafts into polished documents seamlessly, fostering a sense of productivity that's hard to achieve otherwise. The realistic typing simulation and powerful formatting features make it a joy to use, and it has truly transformed the way I work."
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">Sarah Chen</p>
                <p className="text-gray-600">Graduate Student, Stanford University</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <button
              onClick={handleGoogleSignIn}
              className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
            >
              Read more stories
            </button>
          </div>
        </div>
      </section>

      {/* Latest Insights */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-black text-center mb-16">
            Latest insights and updates.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-black/10 rounded-lg overflow-hidden hover:border-black transition-colors">
              <div className="bg-black text-white px-4 py-2 text-sm font-semibold inline-block">Product</div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-black mb-2">How to optimize your typing workflow</h3>
                <p className="text-gray-700 mb-4">Learn best practices for transforming your text efficiently.</p>
                <Link href="#" className="text-black underline">Read more</Link>
              </div>
            </div>
            <div className="border border-black/10 rounded-lg overflow-hidden hover:border-black transition-colors">
              <div className="bg-black text-white px-4 py-2 text-sm font-semibold inline-block">Tips</div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-black mb-2">5 ways to improve document quality</h3>
                <p className="text-gray-700 mb-4">Discover techniques for creating professional documents.</p>
                <Link href="#" className="text-black underline">Read more</Link>
              </div>
            </div>
            <div className="border border-black/10 rounded-lg overflow-hidden hover:border-black transition-colors">
              <div className="bg-black text-white px-4 py-2 text-sm font-semibold inline-block">Features</div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-black mb-2">The future of typing automation</h3>
                <p className="text-gray-700 mb-4">Explore upcoming features and improvements.</p>
                <Link href="#" className="text-black underline">Read more</Link>
              </div>
            </div>
          </div>
          <div className="text-center mt-12">
            <button
              onClick={handleGoogleSignIn}
              className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
            >
              View all insights
            </button>
          </div>
        </div>
      </section>

      {/* Designed for Businesses */}
      <section className="bg-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Designed for users of all types.
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            From students to professionals, typingisboring scales with your needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={handleGoogleSignIn}
              className="px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
            >
              Get started
            </button>
            <button className="px-8 py-4 bg-white border-2 border-black text-black font-semibold rounded-lg hover:bg-gray-50 transition-colors">
              Contact support
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8">
            Ready to see what everyone's talking about?
          </h2>
          <div className="flex justify-center gap-6 mb-8">
            <a href="#" className="text-black hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="#" className="text-black hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a href="#" className="text-black hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
          <button
            onClick={handleGoogleSignIn}
            className="px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-black/90 transition-colors"
          >
            Get started
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-black/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="text-3xl font-bold text-black mb-4">typingisboring</div>
              <p className="text-sm text-gray-600">© 2025 typingisboring. All rights reserved.</p>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="#" className="hover:text-black">Features</Link></li>
                <li><Link href="#" className="hover:text-black">Integrations</Link></li>
                <li><Link href="#" className="hover:text-black">Templates</Link></li>
                <li><Link href="#" className="hover:text-black">Pricing</Link></li>
                <li><Link href="#" className="hover:text-black">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-4">Solutions</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="#" className="hover:text-black">Students</Link></li>
                <li><Link href="#" className="hover:text-black">Writers</Link></li>
                <li><Link href="#" className="hover:text-black">Professionals</Link></li>
                <li><Link href="#" className="hover:text-black">Researchers</Link></li>
                <li><Link href="#" className="hover:text-black">Accessibility</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="#" className="hover:text-black">Blog</Link></li>
                <li><Link href="#" className="hover:text-black">Help Center</Link></li>
                <li><Link href="#" className="hover:text-black">Support</Link></li>
                <li><Link href="#" className="hover:text-black">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="#" className="hover:text-black">About</Link></li>
                <li><Link href="#" className="hover:text-black">Contact</Link></li>
                <li><Link href="#" className="hover:text-black">Terms</Link></li>
                <li><Link href="#" className="hover:text-black">Privacy</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
