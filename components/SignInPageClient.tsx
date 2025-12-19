"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

const SignInPage = dynamic(() => {
  // #region agent log
  if (process.env.NODE_ENV === "development") {
    fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SignInPageClient.tsx:6',message:'Importing sign-in-flow-1 module',data:{timestamp:Date.now(),typeofWindow:typeof window},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }
  // #endregion
  return import("@/components/ui/sign-in-flow-1").then(mod => {
    // #region agent log
    if (process.env.NODE_ENV === "development") {
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SignInPageClient.tsx:7',message:'sign-in-flow-1 module loaded',data:{timestamp:Date.now(),hasSignInPage:!!mod.SignInPage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
    // #endregion
    return { default: mod.SignInPage };
  }).catch((err) => {
    // #region agent log
    if (process.env.NODE_ENV === "development") {
      fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SignInPageClient.tsx:8',message:'sign-in-flow-1 import failed',data:{timestamp:Date.now(),error:err?.message,errorStack:err?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
    // #endregion
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

