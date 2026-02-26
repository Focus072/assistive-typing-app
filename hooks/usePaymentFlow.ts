"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { logger } from "@/lib/logger"

interface UsePaymentFlowOptions {
  toast: { addToast: (msg: string, type: "success" | "error" | "info" | "warning") => void }
  onSuccess?: () => void
}

export function usePaymentFlow({ toast, onSuccess }: UsePaymentFlowOptions) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status, update: updateSession } = useSession()
  const checkoutParam = searchParams.get("checkout")

  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [gracePeriodStart, setGracePeriodStart] = useState<number | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30)

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerUpdateRef = useRef<NodeJS.Timeout | null>(null)
  const gracePeriodTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userContinuedRef = useRef(false)
  const hasShownPaymentSuccessToastRef = useRef(false)

  const GRACE_PERIOD_MS = 30 * 1000
  const POLLING_INTERVAL_MS = 3 * 1000

  // Update remaining seconds display
  useEffect(() => {
    if (isProcessingPayment && gracePeriodStart) {
      const updateTimer = () => {
        const elapsed = Date.now() - gracePeriodStart
        const remaining = Math.max(0, Math.ceil((GRACE_PERIOD_MS - elapsed) / 1000))
        setRemainingSeconds(remaining)
        if (remaining > 0) {
          timerUpdateRef.current = setTimeout(updateTimer, 1000)
        }
      }
      updateTimer()
      return () => {
        if (timerUpdateRef.current) {
          clearTimeout(timerUpdateRef.current)
          timerUpdateRef.current = null
        }
      }
    } else {
      setRemainingSeconds(30)
    }
  }, [isProcessingPayment, gracePeriodStart])

  // Handle checkout success with grace period and polling
  useEffect(() => {
    if (checkoutParam === "success" && status === "authenticated") {
      const u = session?.user
      const hasAccess = u?.subscriptionStatus === "active" || u?.planTier === "ADMIN" || u?.role === "ADMIN"
      if (hasAccess) {
        updateSession().then(() => {
          if (!hasShownPaymentSuccessToastRef.current) {
            hasShownPaymentSuccessToastRef.current = true
            toast.addToast("Payment Successful! Your plan has been upgraded. Enjoy your new features!", "success")
          }
          onSuccess?.()
          router.replace("/dashboard", { scroll: false })
        })
        return
      }

      let deferredId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        setIsProcessingPayment(true)
        setGracePeriodStart(Date.now())
      }, 0)

      updateSession().catch((error) => {
        logger.error("Failed to refresh session:", error)
      })

      pollingIntervalRef.current = setInterval(async () => {
        try {
          await updateSession()
        } catch (error) {
          logger.error("Failed to refresh session during polling:", error)
        }
      }, POLLING_INTERVAL_MS)

      gracePeriodTimeoutRef.current = setTimeout(() => {
        if (userContinuedRef.current) return
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        updateSession().then(() => {
          if (userContinuedRef.current) return
          setTimeout(() => {
            if (userContinuedRef.current) return
            const u = session?.user
            const hasAccess = u?.subscriptionStatus === "active" || u?.planTier === "ADMIN" || u?.role === "ADMIN"
            if (hasAccess) {
              setIsProcessingPayment(false)
              setGracePeriodStart(null)
              if (!hasShownPaymentSuccessToastRef.current) {
                hasShownPaymentSuccessToastRef.current = true
                toast.addToast("Payment Successful! Your plan has been upgraded. Enjoy your new features!", "success")
              }
              onSuccess?.()
              router.replace("/dashboard", { scroll: false })
            } else {
              setIsProcessingPayment(false)
              setGracePeriodStart(null)
              toast.addToast("Payment is being processed. Please wait a moment and refresh the page.", "info")
              router.push("/#pricing")
            }
          }, 500)
        }).catch((error) => {
          if (userContinuedRef.current) return
          logger.error("Failed to check final status:", error)
          setIsProcessingPayment(false)
          setGracePeriodStart(null)
          router.push("/#pricing")
        })
      }, GRACE_PERIOD_MS)

      return () => {
        if (deferredId != null) clearTimeout(deferredId)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        if (timerUpdateRef.current) {
          clearTimeout(timerUpdateRef.current)
          timerUpdateRef.current = null
        }
        if (gracePeriodTimeoutRef.current) {
          clearTimeout(gracePeriodTimeoutRef.current)
          gracePeriodTimeoutRef.current = null
        }
      }
    }
  }, [checkoutParam, status, updateSession, router, toast])

  // Watch for session updates during grace period
  useEffect(() => {
    if (isProcessingPayment && session) {
      const u = session.user
      const hasAccess = u?.subscriptionStatus === "active" || u?.planTier === "ADMIN" || u?.role === "ADMIN"
      if (hasAccess) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        if (gracePeriodTimeoutRef.current) {
          clearTimeout(gracePeriodTimeoutRef.current)
          gracePeriodTimeoutRef.current = null
        }
        if (timerUpdateRef.current) {
          clearTimeout(timerUpdateRef.current)
          timerUpdateRef.current = null
        }
        setIsProcessingPayment(false)
        setGracePeriodStart(null)
        if (!hasShownPaymentSuccessToastRef.current) {
          hasShownPaymentSuccessToastRef.current = true
          toast.addToast("Payment Successful! Your plan has been upgraded. Enjoy your new features!", "success")
        }
        onSuccess?.()
        router.replace("/dashboard", { scroll: false })
      }
    }
  }, [session, isProcessingPayment, router, toast])

  const handleContinue = () => {
    userContinuedRef.current = true
    setIsProcessingPayment(false)
    setGracePeriodStart(null)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (gracePeriodTimeoutRef.current) {
      clearTimeout(gracePeriodTimeoutRef.current)
      gracePeriodTimeoutRef.current = null
    }
    if (timerUpdateRef.current) {
      clearTimeout(timerUpdateRef.current)
      timerUpdateRef.current = null
    }
    router.replace("/dashboard?checkout=success", { scroll: false })
  }

  return {
    session,
    status,
    isProcessingPayment,
    remainingSeconds,
    handleContinue,
  }
}
