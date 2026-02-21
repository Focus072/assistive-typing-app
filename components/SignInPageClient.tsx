"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

const SignInPage = dynamic(() => {
  return import("@/components/ui/sign-in-flow-1").then(mod => {
    return { default: mod.SignInPage };
  }).catch((err) => {
    throw err;
  });
}, {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  ),
})

export default function SignInPageClient() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return <SignInPage />
}

