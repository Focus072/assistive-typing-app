"use client"

import dynamic from "next/dynamic"

const SignInPage = dynamic(() => import("@/components/ui/sign-in-flow-1").then(mod => ({ default: mod.SignInPage })), {
  ssr: false,
})

export default function SignInPageClient() {
  return <SignInPage />
}

